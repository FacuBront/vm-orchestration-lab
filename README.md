# Orquestación del Ciclo de Vida de Gestión de Vulnerabilidades (VM) con n8n

Laboratorio real y reproducible para una Tesis de Grado de la Tecnicatura Universitaria en
Programación — UTN Facultad Regional Mendoza.

## Contexto

Este repositorio contiene el laboratorio que respalda la tesis: un entorno reproducible,
construido **desde cero**, donde cada componente se ejecutó y se verificó antes de documentarse.

El laboratorio sigue un principio único: **no se documenta nada que no se haya ejecutado y
verificado primero**. Las decisiones técnicas y las correcciones que hicieron falta quedaron
registradas en el momento en que ocurrieron (ver los comentarios del código y el historial de
commits).

## Qué hace este pipeline

Un workflow de n8n de 27 nodos que ejecuta, de punta a punta y sin intervención humana durante
la ejecución, el ciclo completo de identificación de vulnerabilidades:

1. **Descubrimiento** — Nmap (embebido en el propio contenedor de n8n) escanea el objetivo y
   detecta hosts, puertos y versiones de servicio.
2. **Evaluación** — GVM/Greenbone Community Edition (real, no simulado) recibe el objetivo vía
   el protocolo GMP, ejecuta la evaluación de vulnerabilidades contra su base de CVE y devuelve
   el reporte completo.
3. **Persistencia** — cada hallazgo, tanto de Nmap como de GVM, se inserta en PostgreSQL sobre
   un esquema de dos tablas (`scan_history`, `vulnerability_scans`), a través de un usuario de
   aplicación con permisos restringidos (`SELECT`/`INSERT`/`UPDATE`, sin `DELETE` ni `DROP`).
4. **Informe** — un nodo genera un informe Markdown completo, sin truncar ningún resultado, con
   inventario de hosts y recomendaciones generales de remediación, y lo guarda en `./reports/`.

El pipeline se validó con un protocolo de diez ejecuciones consecutivas contra un objetivo con
vulnerabilidades reales y conocidas, con evidencia real documentada en
`docs/resultados-10-corridas-gvm.md` y en los informes de `./reports/`.

## Nota metodológica

El pipeline corre Nmap (reconocimiento de servicio/versión) y GVM real (correlación contra CVEs
conocidos) en la misma ejecución. Los hallazgos de Nmap quedan como fila base por host:puerto
(3 filas en el laboratorio). GVM devuelve 79 resultados por corrida: el nodo de parseo descarta
los 22 de categoría Log, que son informativos, y conserva 57 accionables.

El nodo de parseo extrae los CVE del texto libre del campo `insight` de cada resultado, con una
expresión regular, no de las referencias estructuradas `<ref type="cve">` que trae `<refs>`. Esa
estructura no existía en el reporte del 21/08 contra el que se diseñó el nodo: solo traía 349
referencias `cert-bund` y 680 `dfn-cert`, ninguna de tipo `cve`. Los reportes consultados el
21/09 (y ya el 01/09) sí exponen `<ref type="cve">`; no hay evidencia publicada de en qué momento
entre esas dos fechas cambió. Los 17 accionables donde encuentra un CVE en `insight` se expanden en una fila
por CVE (54 filas, con `cve_id`, `severity_score`, `severity_label`, `description` y `solution`
poblados). Los 40 restantes se guardan como una fila cada uno, con `cve_id` nulo. De esos 40, 34
tienen uno o más CVE en las referencias estructuradas de GVM que el nodo no lee (ver
`evidencia/gvm-diez-corridas.md`); solo 6 accionables no tienen ningún CVE, ni en insight ni en
refs. El resultado es 94 filas de GVM más 3 de Nmap, es decir 97 filas por corrida.

La evidencia de cada corrida, incluido el detalle de esta limitación (92 CVE distintos en refs,
53 también persistidos desde insight, un 57,6 %), está en `evidencia/gvm-diez-corridas.md`, y la
decisión de diseño original en `gvm-integration/hallazgo-estructura-real-get-reports.md`.

## Desarrollo asistido por IA

El laboratorio se desarrolló con la asistencia de Claude Code, como declara el capítulo de
consideraciones éticas de la tesis. `docs/RUNBOOK-fase-2d-gvm.md` es una guía que se escribió para que
una sesión de Claude Code pudiera repetir la integración de GVM en otra máquina, y se conserva como
artefacto de ese proceso. Todo lo que documenta se ejecutó y se verificó antes de darse por bueno.

## Arquitectura

Todo el laboratorio corre en contenedores Docker sobre una única red bridge personalizada
(`labnet`, `172.28.0.0/24`), lo que evita que un contenedor intente resolver
`localhost` para alcanzar un servicio que en realidad vive en el host. Cada servicio se referencia por su nombre de servicio Docker, no por IP ni por
`localhost`. El motor de evaluación (GVM/Greenbone) se despliega desde un archivo de composición
aparte (`docker-compose.gvm.yml`); de sus ~19 contenedores, solo `ospd-openvas` —el motor de
escaneo— se conecta también a `labnet`, con IP estática, porque es el único que necesita alcanzar
el objetivo.

```
┌─────────────────────────────── labnet (172.28.0.0/24) ───────────────────────────────┐
│                                                                                          │
│   ┌────────────┐        ┌──────────────┐        ┌───────────────────────────┐          │
│   │    n8n     │──────▶│  PostgreSQL   │        │         target1            │          │
│   │ (+ Nmap)   │        │ scan_history  │        │ Ubuntu 18.04 + SSH/FTP/    │          │
│   │ .10        │───────▶│ vulnerability │◀──────│ Apache (CVEs reales)        │          │
│   │            │        │    _scans     │        │ .20                        │          │
│   │            │        │ .11           │        │ (sin puertos expuestos     │          │
│   └────────────┘        └──────────────┘        │  fuera de labnet)           │          │
│         │                                        └───────────────────────────┘          │
│         │ puerto 5678 publicado al host                                                 │
└─────────┼─────────────────────────────────────────────────────────────────────────────┘
          ▼
   http://localhost:5678
```

`n8n` también comparte, vía un socket Unix montado como volumen Docker (`/run/gvmd`), el
protocolo GMP con `gvmd` — el demonio de gestión del stack de GVM/Greenbone, que corre en una red
Docker aparte (`default`, junto a otros ~18 contenedores del stack: `gsad`, sincronización de
feeds, su propia base de datos, etc.). De ese stack, solo `ospd-openvas` —el motor de escaneo
real— se conecta también a `labnet` (IP estática `172.28.0.30`), porque es el único que necesita
alcanzar `target1` por red. El resto del stack de GVM no tiene visibilidad sobre `labnet`.

## Requisitos

- Docker Desktop con backend WSL2 (Windows) o Docker Engine (Linux).
- Al menos 8 GB de RAM libres para levantar el stack completo. GVM/Greenbone recomienda de forma
  oficial un mínimo de 4 GB dedicados solo a su propio stack, aparte de lo que ya usan n8n,
  PostgreSQL y target1.
- Git.

## Puesta en marcha

1. Cloná el repositorio y entrá a la carpeta.
2. Copiá la plantilla de variables de entorno y completá contraseñas propias:
   ```bash
   cp .env.example .env
   ```
3. Construí y levantá el stack completo (laboratorio + GVM):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.gvm.yml up -d --build
   ```
   La primera sincronización de la base de pruebas de vulnerabilidades (NVT) de GVM puede tardar
   entre 30 y 35 minutos.
4. Verificá que los servicios estén sanos:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.gvm.yml ps
   ```
5. Abrí `http://localhost:5678`, creá el usuario owner local de n8n, e importá el workflow desde
   `workflow/vm-pipeline-lab-apache.json`.
6. En n8n, configurá una credencial de tipo **Postgres** apuntando a:
   - Host: `postgres`
   - Database: el valor de `POSTGRES_DB` en tu `.env`
   - User: el valor de `POSTGRES_APP_USER`
   - Password: el valor de `POSTGRES_APP_PASSWORD`
   - Port: `5432`, SSL: disabled
7. Las credenciales de GVM (`GVM_ADMIN_USER`, `GVM_ADMIN_PASSWORD` en tu `.env`) las toman de
   forma automática, como variables de entorno del contenedor, los nodos "Execute Command" que
   invocan `gvm-cli` — no requieren configurar ninguna credencial adicional en la interfaz de n8n.
8. Ejecutá el workflow completo desde el botón **"Execute workflow"**.

El informe generado queda en `./reports/`, visible desde el host sin entrar al contenedor.

## Frontend MVP

Una landing pública y un panel de control web (Flask + Jinja2 + Chart.js) para operar el
laboratorio sin abrir n8n: lanzar un escaneo, seguirlo en vivo, ver los hallazgos con filtros y
leer o descargar los informes. Vive en `frontend/` y se levanta con un overlay aparte,
`docker-compose.frontend.yml`, sin modificar ningún servicio existente.

- **Solo lectura.** Consulta PostgreSQL únicamente con `SELECT` parametrizados, en sesiones con
  `default_transaction_read_only=on`, y monta `./reports` en solo lectura. Todo número del panel
  sale de la base en vivo; los hallazgos se cuentan con `count(*)` sobre `vulnerability_scans`, no
  con `finding_count`.
- **Dispara escaneos por Webhook**, contra una **copia** del workflow
  (`workflow/vm-pipeline-lab-apache-webhook.json`). El workflow original queda intacto. La copia
  solo cambia el disparador (Webhook `POST /webhook/lanzar-escaneo`, que responde 202 al
  instante), marca `scan_history.status` como `running` al insertar y como `completed` al terminar
  GVM, y agrega el id del escaneo al nombre del informe (`informe_scan-<id>_<fecha>.md`).

### Cómo levantarlo

1. Completá en `.env` las variables nuevas de `.env.example` (sección "Frontend MVP"):
   `DATABASE_URL`, `N8N_WEBHOOK_URL`, `FLASK_SECRET_KEY`, `FRONTEND_ADMIN_USER` y
   `FRONTEND_ADMIN_PASSWORD`.
2. Construí y levantá el frontend junto al resto del stack:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.gvm.yml -f docker-compose.frontend.yml up -d --build frontend
   ```
3. Abrí `http://localhost:8000` (landing) e ingresá al panel con el usuario administrador.
4. Opcional: para que el frontend use un rol propio de solo lectura en lugar de
   `POSTGRES_APP_USER`, corré una vez `sql/manual/03_frontend_readonly.sql` (el comando está en el
   encabezado del archivo) y apuntá `DATABASE_URL` a ese rol.

### Cómo importar y activar el workflow con Webhook

1. En n8n (`http://localhost:5678`): **Workflows → Import from File** y elegí
   `workflow/vm-pipeline-lab-apache-webhook.json`. Se importa como un workflow nuevo,
   "VM Pipeline - Lab Apache (Webhook MVP)", sin pisar el original.
2. Abrí los nodos Postgres (`Insert Scan History`, `Insertar Hallazgos de Nmap`,
   `GMP Insertar Hallazgos`, `Actualizar Fin Real Scan History` y
   `Consultar Hallazgos del Escaneo`) y asignales la credencial **Postgres** del paso 6 de la
   puesta en marcha.
3. Guardá y **publicá** el workflow con el botón **Publish** de arriba a la derecha (en n8n 2.x
   reemplaza al viejo interruptor *Active*); queda con la marca **Published**. Solo un workflow
   publicado responde en la URL de producción `/webhook/lanzar-escaneo`; si no lo está, el panel
   muestra "No se pudo contactar al orquestador" en vez de lanzar el escaneo. Para comprobarlo sin
   lanzar un escaneo: `docker exec lab_n8n n8n list:workflow --active=true` tiene que listarlo.
4. Desde el panel, **"Lanzar escaneo"**. La pantalla de escaneo en curso consulta el estado cada 5
   segundos y muestra "Ver resultados" cuando `scan_history.status` pasa a `completed`.

Las corridas oficiales de la tesis son los `scan_id` 7 a 16; en el panel, las anteriores se
muestran atenuadas como "prueba". En las corridas hechas con el workflow original, `finished_at`
no refleja la duración real del escaneo de GVM, por eso el panel no muestra duraciones. Los
informes viejos, que no tienen el id en el nombre, se vinculan con su escaneo por el informe más
cercano posterior a `finished_at`, dentro de una ventana de 20 minutos.

## Estructura del repositorio

```
.
├── docker-compose.yml          # n8n (+ Nmap), PostgreSQL y target1
├── docker-compose.gvm.yml      # Stack de GVM/Greenbone Community Edition (se levanta junto al anterior)
├── n8n.Dockerfile              # n8n construido desde node:20-alpine + Nmap + gvm-tools (ver comentarios: por qué no se usó la imagen oficial)
├── target1.Dockerfile          # Contenedor objetivo con vulnerabilidades reales (Ubuntu 18.04 EOL)
├── target1-entrypoint.sh       # Arranque de los 3 servicios del contenedor objetivo
├── sql/init/                   # Esquema de base de datos + creación de usuario restringido
├── workflow/                   # JSON exportado del workflow real de n8n (el artefacto principal, 27 nodos)
├── workflow-nodes/             # Código de cada nodo Code, documentado y versionado por separado
├── gvm-integration/            # Hallazgos y decisiones de diseño de la integración real con GVM/GMP
├── docs/                       # Runbook de la integración de GVM y resultados del protocolo de 10 corridas
├── evidencia/capturas/         # Capturas reales del sistema en ejecución
├── reports/                    # Informes Markdown generados por ejecuciones reales (evidencia)
└── .env.example                # Plantilla de variables de entorno (nunca se sube .env real)
```

## Decisiones técnicas documentadas en vivo

Este proyecto se construyó verificando cada suposición contra la realidad antes de documentarla,
en vez de asumir cómo "debería" funcionar algo. Algunos hallazgos concretos, con su fix, quedaron
registrados como comentarios en el código en el momento en que se descubrieron:

- La imagen oficial `n8nio/n8n` es una "Docker Hardened Image" sin gestor de paquetes → se
  construyó n8n desde `node:20-alpine` + `npm install -g n8n` (`n8n.Dockerfile`).
- n8n v2 deshabilita por defecto los nodos `executeCommand` y `localFileTrigger` por riesgo de
  RCE → se reactivó solo el primero vía `NODES_EXCLUDE` (`docker-compose.yml`).
- n8n v2 restringe los nodos de archivo a escribir solo dentro de `~/.n8n-files` → el volumen de
  informes se montó en esa ruta en vez de aflojar la restricción de seguridad.
- La imagen `citizenstig/metasploitable2` fue retirada de Docker Hub → se construyó un contenedor
  objetivo propio con software EOL real (`target1.Dockerfile`).
- GMP (el protocolo de `gvmd`) no expone ningún puerto TCP en esta versión containerizada, solo
  un socket Unix compartido → se integró vía volumen Docker compartido entre `n8n` y `gvmd`, no
  exponiendo ningún puerto adicional (`docker-compose.gvm.yml`, `gvm-integration/README.md`).
- La respuesta real de `get_reports` no trae una etiqueta `<cve>` limpia por resultado, y un host
  sin puerto asociado (hallazgos a nivel de sistema operativo) puede serializarse como el texto
  literal `"null"` en vez de un `NULL` real → se corrigió con una extracción explícita por
  expresión regular y una verificación de tipo antes de insertar (`workflow-nodes/nodo-gvm-parseo-real.js`).

## Licenciamiento de las herramientas usadas

n8n se distribuye bajo **Sustainable Use License** (fair-code / código disponible), **no** bajo
una licencia reconocida por la Open Source Initiative. Este proyecto usa terminología precisa al
respecto en toda su documentación.
