"""
Frontend MVP del laboratorio de orquestación de gestión de vulnerabilidades.

Landing pública + panel de control sobre la misma base PostgreSQL que llena
el workflow de n8n. Reglas de diseño:
  - Solo lectura: toda consulta es un SELECT parametrizado, y además la
    sesión de base de datos se abre con default_transaction_read_only=on.
  - Todo número del panel sale de PostgreSQL en vivo. finding_count de
    scan_history NO se usa: la tesis documenta que era una instantánea
    temprana; los hallazgos se cuentan con count(*) sobre vulnerability_scans.
  - No se muestra ninguna "duración" calculada desde scan_history: en las
    corridas hechas con el workflow original, finished_at no refleja la
    duración real del escaneo de GVM.
"""

import hmac
import os
import re
import secrets
import time
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

import markdown
import psycopg
import requests
from flask import (Flask, abort, flash, jsonify, redirect, render_template,
                   request, send_from_directory, session, url_for)
from markupsafe import Markup
from psycopg.rows import dict_row
from werkzeug.security import check_password_hash, generate_password_hash

PRODUCT_NAME = os.environ.get('PRODUCT_NAME', 'Apache')
DATABASE_URL = os.environ['DATABASE_URL']
N8N_WEBHOOK_URL = os.environ.get('N8N_WEBHOOK_URL', 'http://n8n:5678/webhook/lanzar-escaneo')
REPORTS_DIR = Path(os.environ.get('REPORTS_DIR', '/app/reports'))

# Misma zona horaria que n8n (GENERIC_TIMEZONE en docker-compose.yml): así las
# horas del panel coinciden con las del nombre de los informes.
ZONA_HORARIA = 'America/Argentina/Mendoza'

# Corridas oficiales del protocolo de validación de la tesis (scan_id 7 a 16).
# Las anteriores fueron pruebas de desarrollo.
CORRIDA_OFICIAL_DESDE = 7
CORRIDA_OFICIAL_HASTA = 16

SEVERIDADES = ['Crítica', 'Alta', 'Media', 'Baja', 'Ninguna']

# Un informe viejo (sin scan_id en el nombre) se vincula al escaneo solo si se
# escribió dentro de esta ventana después de finished_at. Con el workflow
# original, finished_at queda antes del escaneo de GVM (~14 min).
VENTANA_VINCULO_INFORME = timedelta(minutes=20)
RE_INFORME = re.compile(
    r'^informe_(?:scan-(?P<scan>\d+)_)?(?P<ts>\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.md$')

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ['FLASK_SECRET_KEY'],
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

# La contraseña del administrador nunca se compara en texto plano: si la
# variable ya trae un hash de werkzeug se usa tal cual; si no, se hashea al
# arrancar y el valor original no se guarda.
ADMIN_USER = os.environ['FRONTEND_ADMIN_USER']
_password = os.environ['FRONTEND_ADMIN_PASSWORD']
ADMIN_PASSWORD_HASH = (_password if _password.startswith(('scrypt:', 'pbkdf2:'))
                       else generate_password_hash(_password))
del _password


# --------------------------------------------------------------------------
# Base de datos
# --------------------------------------------------------------------------

def consultar(sql, params=None, uno=False):
    """Ejecuta un SELECT parametrizado en una sesión de solo lectura."""
    with psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
        connect_timeout=5,
        options=f'-c TimeZone={ZONA_HORARIA} -c default_transaction_read_only=on',
    ) as conn:
        cur = conn.execute(sql, params or {})
        return cur.fetchone() if uno else cur.fetchall()


SQL_ESCANEOS = """
    SELECT s.id, s.scan_uuid, s.target_range, s.started_at, s.finished_at, s.status,
           count(v.id) AS hallazgos
    FROM scan_history s
    LEFT JOIN vulnerability_scans v ON v.scan_id = s.id
    WHERE s.id >= %(desde)s
    GROUP BY s.id
    ORDER BY s.id
"""

SQL_ESCANEO = """
    SELECT s.id, s.scan_uuid, s.target_range, s.started_at, s.finished_at, s.status,
           s.host_count,
           (SELECT count(*) FROM vulnerability_scans v WHERE v.scan_id = s.id) AS hallazgos
    FROM scan_history s
    WHERE s.id = %(id)s
"""

SQL_ULTIMO_COMPLETADO = """
    SELECT id, target_range, started_at, status
    FROM scan_history
    WHERE status = 'completed'
    ORDER BY started_at DESC, id DESC
    LIMIT 1
"""

SQL_RESUMEN = """
    SELECT count(*) AS hallazgos,
           count(DISTINCT cve_id) AS cves,
           count(*) FILTER (WHERE severity_label IN ('Crítica', 'Alta')) AS criticas_altas
    FROM vulnerability_scans
    WHERE scan_id = %(id)s
"""

# Las filas de Nmap no tienen severity_label: se agrupan como "Ninguna".
SQL_POR_SEVERIDAD = """
    SELECT COALESCE(severity_label, 'Ninguna') AS severidad, count(*) AS cantidad
    FROM vulnerability_scans
    WHERE scan_id = %(id)s
    GROUP BY 1
"""

# Los hallazgos de GVM no traen service_name: se toma el que detectó Nmap en
# el mismo host y puerto de ese escaneo (y se marca como inferido).
SQL_HALLAZGOS = """
    SELECT v.id, v.host_ip, v.hostname, v.port, v.protocol,
           COALESCE(v.service_name, n.service_name) AS servicio,
           (v.service_name IS NULL AND n.service_name IS NOT NULL) AS servicio_inferido,
           v.service_version, v.cve_id, v.severity_score,
           COALESCE(v.severity_label, 'Ninguna') AS severidad,
           v.description, v.solution
    FROM vulnerability_scans v
    LEFT JOIN LATERAL (
        SELECT n.service_name
        FROM vulnerability_scans n
        WHERE n.scan_id = v.scan_id AND n.host_ip = v.host_ip
          AND n.port = v.port AND n.protocol = v.protocol
          AND n.service_name IS NOT NULL
        ORDER BY n.id
        LIMIT 1
    ) n ON true
    WHERE v.scan_id = %(id)s
    ORDER BY v.severity_score DESC NULLS LAST, v.id
"""

SQL_ULTIMO_ESCANEO = """
    SELECT s.id, s.target_range, s.started_at, s.status,
           (SELECT count(*) FROM vulnerability_scans v WHERE v.scan_id = s.id) AS hallazgos
    FROM scan_history s
    ORDER BY s.id DESC
    LIMIT 1
"""


def conteo_por_severidad(scan_id):
    filas = {f['severidad']: f['cantidad'] for f in consultar(SQL_POR_SEVERIDAD, {'id': scan_id})}
    return {sev: filas.get(sev, 0) for sev in SEVERIDADES}


def es_oficial(scan_id):
    return CORRIDA_OFICIAL_DESDE <= scan_id <= CORRIDA_OFICIAL_HASTA


# --------------------------------------------------------------------------
# Informes en ./reports (montado en solo lectura)
# --------------------------------------------------------------------------

def listar_informes():
    """Informes .md reales, del más nuevo al más viejo.

    Se excluyen los que empiezan con "_" y los que contienen "MOCK" (vistas
    previas simuladas que no son evidencia).
    """
    informes = []
    if not REPORTS_DIR.is_dir():
        return informes
    for ruta in REPORTS_DIR.glob('*.md'):
        if ruta.name.startswith('_') or 'MOCK' in ruta.name or not ruta.is_file():
            continue
        m = RE_INFORME.match(ruta.name)
        fecha = (datetime.strptime(m['ts'], '%Y-%m-%d_%H-%M-%S') if m
                 else datetime.fromtimestamp(ruta.stat().st_mtime))
        informes.append({
            'archivo': ruta.name,
            'fecha': fecha,
            'scan_id': int(m['scan']) if m and m['scan'] else None,
            'kb': max(1, round(ruta.stat().st_size / 1024)),
        })
    return sorted(informes, key=lambda i: i['fecha'], reverse=True)


def vincular_informes(escaneos, informes):
    """Asigna a cada escaneo su informe, si se puede determinar.

    1. Informes nuevos: traen el scan_id en el nombre (vínculo exacto).
    2. Informes viejos: el más cercano posterior a finished_at, dentro de
       VENTANA_VINCULO_INFORME y sin reutilizar un informe ya asignado. Si no
       hay ninguno en la ventana, el escaneo queda sin informe vinculado.
    """
    exactos = {i['scan_id']: i for i in informes if i['scan_id'] is not None}
    usados = {i['archivo'] for i in exactos.values()}
    sueltos = sorted((i for i in informes if i['scan_id'] is None), key=lambda i: i['fecha'])
    for e in sorted(escaneos, key=lambda e: e['id']):
        e['informe'] = None
        if e['id'] in exactos:
            e['informe'] = exactos[e['id']]['archivo']
            continue
        if e['finished_at'] is None:
            continue
        fin = e['finished_at'].replace(tzinfo=None, microsecond=0)  # ya en hora local
        for i in sueltos:
            if i['archivo'] not in usados and fin <= i['fecha'] <= fin + VENTANA_VINCULO_INFORME:
                e['informe'] = i['archivo']
                usados.add(i['archivo'])
                break
    return escaneos


def renderizar_markdown(texto):
    # Los informes incluyen texto de GVM: se neutraliza cualquier HTML crudo.
    texto = texto.replace('<', '&lt;')
    # El generador de informes anida listas con 2 espacios; Python-Markdown
    # necesita 4 para reconocer el anidamiento. nl2br respeta los saltos de
    # línea simples del encabezado (ID, objetivo, inicio, fin...).
    texto = re.sub(r'^( +)', lambda m: m.group(1) * 2, texto, flags=re.M)
    html = markdown.markdown(texto, extensions=['tables', 'sane_lists', 'fenced_code', 'nl2br'])
    html = re.sub(r'(?<![\w/-])(CVE-\d{4}-\d{4,})',
                  r'<a href="https://nvd.nist.gov/vuln/detail/\1" target="_blank" rel="noopener">\1</a>',
                  html)
    return Markup(html)


# --------------------------------------------------------------------------
# Sesión, CSRF y utilidades de plantilla
# --------------------------------------------------------------------------

def login_requerido(vista):
    @wraps(vista)
    def envoltorio(*args, **kwargs):
        if not session.get('usuario'):
            if request.path.startswith('/api/'):
                return jsonify(error='Sesión requerida'), 401
            return redirect(url_for('login', next=request.path))
        return vista(*args, **kwargs)
    return envoltorio


def token_csrf():
    if 'csrf' not in session:
        session['csrf'] = secrets.token_urlsafe(32)
    return session['csrf']


def verificar_csrf():
    esperado = session.get('csrf')
    if not esperado or not hmac.compare_digest(request.form.get('csrf', ''), esperado):
        abort(400)


def fecha(valor, con_segundos=False):
    if not valor:
        return '—'
    return valor.strftime('%d/%m/%Y %H:%M:%S' if con_segundos else '%d/%m/%Y %H:%M')


app.jinja_env.globals.update(
    csrf_token=token_csrf,
    PRODUCT_NAME=PRODUCT_NAME,
    SEVERIDADES=SEVERIDADES,
    es_oficial=es_oficial,
)
app.jinja_env.filters['fecha'] = fecha


@app.errorhandler(psycopg.OperationalError)
def error_base_de_datos(_e):
    return render_template('error.html', codigo=503,
                           titulo='No se pudo conectar a la base de datos',
                           detalle='Verificá que el contenedor de PostgreSQL esté levantado.'), 503


@app.errorhandler(404)
def no_encontrado(_e):
    return render_template('error.html', codigo=404, titulo='No encontrado',
                           detalle='La página o el recurso que buscás no existe.'), 404


@app.errorhandler(400)
def solicitud_invalida(_e):
    return render_template('error.html', codigo=400, titulo='Solicitud inválida',
                           detalle='El formulario venció. Volvé a intentarlo.'), 400


# --------------------------------------------------------------------------
# Rutas públicas
# --------------------------------------------------------------------------

@app.get('/')
def landing():
    return render_template('landing.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    destino = request.values.get('next', '')
    if not destino.startswith('/') or destino.startswith('//'):
        destino = url_for('panel')
    if request.method == 'POST':
        verificar_csrf()
        usuario = request.form.get('usuario', '')
        password = request.form.get('password', '')
        usuario_ok = hmac.compare_digest(usuario.encode(), ADMIN_USER.encode())
        password_ok = check_password_hash(ADMIN_PASSWORD_HASH, password)
        if usuario_ok and password_ok:
            session.clear()
            session['usuario'] = usuario
            return redirect(destino)
        flash('Usuario o contraseña incorrectos.', 'error')
    return render_template('login.html', destino=destino)


@app.post('/logout')
def logout():
    verificar_csrf()
    session.clear()
    return redirect(url_for('landing'))


# --------------------------------------------------------------------------
# Panel
# --------------------------------------------------------------------------

@app.get('/panel')
@login_requerido
def panel():
    solo_oficiales = request.args.get('desde7') == '1'
    todos = consultar(SQL_ESCANEOS, {'desde': 0})
    vincular_informes(todos, listar_informes())
    escaneos = [e for e in todos if not solo_oficiales or e['id'] >= CORRIDA_OFICIAL_DESDE]

    ultimo = consultar(SQL_ULTIMO_COMPLETADO, uno=True)
    resumen = consultar(SQL_RESUMEN, {'id': ultimo['id']}, uno=True) if ultimo else None
    severidad = conteo_por_severidad(ultimo['id']) if ultimo else None

    tendencia = {
        'etiquetas': [f"#{e['id']}" for e in escaneos],
        'valores': [e['hallazgos'] for e in escaneos],
        'oficial': [es_oficial(e['id']) for e in escaneos],
    }
    return render_template(
        'panel.html',
        escaneos=list(reversed(escaneos)),
        total_escaneos=len(todos),
        total_oficiales=sum(1 for e in todos if es_oficial(e['id'])),
        ultimo=ultimo, resumen=resumen, severidad=severidad,
        tendencia=tendencia, solo_oficiales=solo_oficiales,
    )


@app.get('/escaneos/<int:scan_id>')
@login_requerido
def escaneo(scan_id):
    datos = consultar(SQL_ESCANEO, {'id': scan_id}, uno=True)
    if not datos:
        abort(404)
    todos = vincular_informes(consultar(SQL_ESCANEOS, {'desde': 0}), listar_informes())
    informe = next((e['informe'] for e in todos if e['id'] == scan_id), None)
    hallazgos = consultar(SQL_HALLAZGOS, {'id': scan_id})
    resumen = consultar(SQL_RESUMEN, {'id': scan_id}, uno=True)
    return render_template(
        'escaneo.html', escaneo=datos, hallazgos=hallazgos, resumen=resumen,
        severidad=conteo_por_severidad(scan_id), informe=informe,
        servicios=sorted({h['servicio'] for h in hallazgos if h['servicio']}),
        puertos=sorted({h['port'] for h in hallazgos if h['port'] is not None}),
    )


# --------------------------------------------------------------------------
# Lanzamiento de escaneos
# --------------------------------------------------------------------------

@app.post('/escaneos/lanzar')
@login_requerido
def lanzar_escaneo():
    verificar_csrf()
    ultimo_id = consultar('SELECT COALESCE(max(id), 0) AS id FROM scan_history', uno=True)['id']
    try:
        respuesta = requests.post(N8N_WEBHOOK_URL, json={'origen': 'frontend-mvp'}, timeout=10)
    except requests.RequestException:
        flash('No se pudo contactar al orquestador (n8n). Verificá que el contenedor esté levantado.',
              'error')
        return redirect(url_for('panel'))
    if respuesta.status_code >= 400:
        motivo = ('el workflow con Webhook no está activo en n8n' if respuesta.status_code == 404
                  else f'respondió HTTP {respuesta.status_code}')
        flash(f'No se pudo contactar al orquestador: {motivo}.', 'error')
        return redirect(url_for('panel'))
    session['lanzamiento'] = {'desde_id': ultimo_id, 'ts': time.time()}
    return redirect(url_for('escaneo_en_curso'))


@app.get('/escaneos/en-curso')
@login_requerido
def escaneo_en_curso():
    lanzamiento = session.get('lanzamiento')
    if not lanzamiento:
        # Sin lanzamiento en esta sesión: seguir el escaneo que esté corriendo, si hay uno.
        ultimo = consultar(SQL_ULTIMO_ESCANEO, uno=True)
        if not ultimo or ultimo['status'] != 'running':
            flash('No hay ningún escaneo en curso.', 'info')
            return redirect(url_for('panel'))
        lanzamiento = {'desde_id': ultimo['id'] - 1, 'ts': ultimo['started_at'].timestamp()}
    return render_template('en_curso.html', desde_id=lanzamiento['desde_id'],
                           lanzado_ms=int(lanzamiento['ts'] * 1000))


@app.get('/api/estado')
@login_requerido
def api_estado():
    ultimo = consultar(SQL_ULTIMO_ESCANEO, uno=True)
    if not ultimo:
        return jsonify(escaneo=None)
    informe = next((i['archivo'] for i in listar_informes() if i['scan_id'] == ultimo['id']), None)
    return jsonify(escaneo={
        'id': ultimo['id'],
        'objetivo': ultimo['target_range'],
        'inicio': ultimo['started_at'].isoformat(),
        'estado': ultimo['status'],
        'hallazgos': ultimo['hallazgos'],
        'informe': informe,
    })


# --------------------------------------------------------------------------
# Informes
# --------------------------------------------------------------------------

def informe_valido(archivo):
    """Devuelve el informe solo si el nombre está en la lista real (sin path traversal)."""
    informe = next((i for i in listar_informes() if i['archivo'] == archivo), None)
    if not informe:
        abort(404)
    return informe


@app.get('/informes')
@login_requerido
def informes():
    lista = listar_informes()
    escaneos = vincular_informes(consultar(SQL_ESCANEOS, {'desde': 0}), lista)
    por_archivo = {e['informe']: e['id'] for e in escaneos if e['informe']}
    return render_template('informes.html', informes=lista, por_archivo=por_archivo)


@app.get('/informes/<archivo>')
@login_requerido
def informe(archivo):
    datos = informe_valido(archivo)
    texto = (REPORTS_DIR / datos['archivo']).read_text(encoding='utf-8', errors='replace')
    escaneos = vincular_informes(consultar(SQL_ESCANEOS, {'desde': 0}), listar_informes())
    scan_id = next((e['id'] for e in escaneos if e['informe'] == archivo), None)
    return render_template('informe.html', informe=datos, contenido=renderizar_markdown(texto),
                           scan_id=scan_id)


@app.get('/informes/<archivo>/descargar')
@login_requerido
def descargar_informe(archivo):
    datos = informe_valido(archivo)
    return send_from_directory(REPORTS_DIR, datos['archivo'], as_attachment=True,
                               mimetype='text/markdown')
