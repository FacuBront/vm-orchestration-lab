# Runbook — Fase 2d: Integración real de GVM/Greenbone

**Este documento está escrito para que lo ejecute una sesión de Claude Code, no solo para que
lo lea un humano.** Si sos la IA leyendo esto: segui las instrucciones en orden, verificá cada
suposición contra evidencia real antes de darla por buena, y preguntale al usuario explícitamente
en los puntos marcados **[PREGUNTAR AL USUARIO]**. No inventes nombres de comandos, puertos,
variables de entorno ni estructuras de datos que no hayas verificado — es la causa raíz de por
qué existe este proyecto (ver la sección "Por qué este documento es así" más abajo).

Si sos el humano (probablemente Ignacio): abrí Claude Code en la carpeta de este repo clonado, y
decile algo como *"Leé completo docs/RUNBOOK-fase-2d-gvm.md y empezá desde el Paso 0"*.

---

## 0.a. Cómo comportarte con la persona que te está leyendo esto (Ignacio)

Si sos la IA: Ignacio es coautor de esta tesis, pero no asumas que tiene experiencia avanzada en
Docker, n8n o administración de Linux — tratalo igual que se trató a Facundo durante todo el
desarrollo de este mismo repositorio (revisá el historial de commits y el tono de
`gvm-integration/README.md` para calibrar el estilo). Concretamente:

- Actuá como un mentor paciente y didáctico, no como un ejecutor silencioso de comandos. Explicá
  el **por qué** de cada paso antes o al mismo tiempo que el **cómo**.
- Andá de a un paso genuino por vez: ejecutá algo, mostrale el resultado real (no un resumen
  optimista), y esperá su confirmación antes de seguir al siguiente paso, sobre todo en los
  puntos marcados **[PREGUNTAR AL USUARIO]** — esos no son opcionales.
- Si algo falla o sale distinto de lo esperado, decilo con franqueza y mostrale el error real
  (no lo suavices ni sigas adelante como si nada). Diagnosticá con evidencia antes de proponer un
  arreglo — es literalmente el método que resolvió cada problema de este proyecto hasta ahora.
- No dejes que la sesión se sienta como una receta de cocina que Ignacio solo mira — el objetivo
  es que él entienda qué está pasando en su máquina, porque después tiene que poder explicar esto
  mismo en la defensa oral de la tesis.

## 0.b. Orden general de trabajo (vista rápida, antes de los detalles)

1. Leer el contexto (sección 1).
2. Verificar prerrequisitos de hardware/software, clonar el repo, y **levantar el stack
   existente tal cual está** (n8n + PostgreSQL + target1) para confirmar que funciona en esta
   máquina nueva — *todavía sin tocar GVM* (sección 2).
3. Recién ahí, investigar e instalar GVM/Greenbone (sección 3).
4. Integrar GVM al pipeline real de n8n (sección 4).
5. Correr el protocolo de pruebas de 10 ejecuciones (sección 5).
6. Guardar toda la evidencia (sección 6) y comitear (sección 7).

No saltear el paso 2 para "ir directo a lo nuevo": confirmar la base primero ahorra tiempo de
diagnóstico si algo falla más adelante.

---

## 0. Por qué este documento es así (leer antes de todo)

Este proyecto es la implementación de laboratorio de una tesis de grado (UTN-FRM). Documentar un
sistema que nunca se probó de verdad lleva a puertos inventados, protocolos confundidos, objetos
de código que no existen e informes que mienten sobre sus propios datos. Por eso la regla de
trabajo de todo este repositorio, sin excepciones, es:

> **No se documenta ni se declara terminado nada que no se haya ejecutado y verificado con
> evidencia real primero.**

En la práctica esto significa:

- Antes de asumir un puerto, una variable de entorno, un nombre de comando o una estructura de
  XML/JSON, **verificalo** (documentación oficial actual, `--help` del comando real, código
  fuente instalado, o una prueba aislada) — no lo repitas de memoria de entrenamiento sin
  chequear, porque las versiones cambian y ya nos pasó varias veces en este proyecto (ver
  `gvm-integration/README.md` y los comentarios en `n8n.Dockerfile` / `docker-compose.yml` para
  ejemplos concretos de cosas que asumimos mal y corregimos con evidencia).
- Cuando algo no funcione como se esperaba, diagnosticá con comandos reales (`docker exec`,
  `grep` contra el código instalado, `curl`, logs) antes de aplicar un fix a ciegas.
- Cuando encuentres un hallazgo o corrijas algo, dejalo **comentado en el código en el momento en
  que pasó** — esa es la materia prima real para el capítulo de Desarrollo de la tesis.
- Probá la lógica nueva de forma aislada (un script de Node suelto, un `docker exec` directo)
  **antes** de armarla dentro de la interfaz de n8n. Ahorra muchísimo tiempo — la UI de n8n tuvo
  varias sorpresas propias durante este proyecto.

## 1. Contexto: qué existe ya y qué falta

Leé, en este orden, antes de tocar nada:

1. `README.md` (raíz del repo) — arquitectura general y cómo levantar el stack.
2. `docker-compose.yml` — los 3 servicios ya funcionando (n8n+Nmap, PostgreSQL, target1).
3. `gvm-integration/README.md` — lo que ya se investigó del protocolo GMP sin tener GVM
   instalado, y el workflow de preview con datos simulados que ya se construyó y probó.
4. `workflow/vm-pipeline-lab-apache.json` — el workflow real de producción (Nmap → parseo →
   PostgreSQL → informe), que **no hay que romper**.
5. `sql/init/01_schema.sql` — el esquema de base de datos (`scan_history`,
   `vulnerability_scans`) que ya existe y que los hallazgos de GVM van a completar (columnas
   `cve_id`, `severity_score`, `severity_label`, `description`, `solution`, hoy vacías).

**Lo que falta y es el objetivo de esta fase:** instalar GVM/Greenbone Community Edition,
conectarlo de verdad al mismo laboratorio Docker (`labnet`, red `172.28.0.0/24`), y reemplazar
los datos simulados de `gvm-integration/mock-get-reports-response.xml` por hallazgos reales.

## 2. Prerrequisitos — verificar antes de instalar nada

**[PREGUNTAR AL USUARIO]** antes de arrancar: confirmar cuánta RAM total tiene la máquina.
GVM/Greenbone Community Edition recomienda oficialmente un mínimo de 4 GB **dedicados solo a su
propio stack** (gvmd + ospd-openvas + PostgreSQL interno + Redis + sincronización de feeds), sin
contar el sistema operativo, Docker Desktop, ni el resto de nuestro stack (n8n + nuestro propio
PostgreSQL + target1, que ya usan un poco más de 1 GB juntos). Como referencia de este mismo
proyecto: con 4 GB totales fue inviable (ver `tesis-duo-apache-reconstruccion` en el historial de
decisiones); se recomienda no arrancar esta fase con menos de 8 GB de RAM total libres para el
sistema.

Verificar (adaptar los comandos si el sistema operativo no es Windows):

```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object @{N='RAM Total (GB)';E={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}, @{N='RAM Libre (GB)';E={[math]::Round($_.FreePhysicalMemory/1MB,2)}}
docker --version
docker compose version
docker run --rm hello-world
```

Si algo de esto falla, resolver antes de seguir (mismo proceso de diagnóstico que se usó para
Docker Desktop + WSL2 en la Fase 1 de este proyecto — ver historial de commits si hace falta
referencia, aunque probablemente no haga falta si Docker ya está instalado).

Clonar el repo y levantar el stack existente **sin tocarlo todavía**, solo para confirmar que
sigue funcionando en esta máquina nueva:

```powershell
git clone https://github.com/FacuBront/vm-orchestration-lab.git
cd vm-orchestration-lab
cp .env.example .env
# Completar .env con contraseñas propias antes de seguir.
docker compose up -d --build
docker compose ps
```

Confirmar los 3 servicios `healthy`/`Up` antes de continuar.

### 2.1. IMPORTANTE — n8n es local a esta máquina, no hay nada compartido

`http://localhost:5678` apunta al contenedor de n8n corriendo **en esta máquina**, con su propia
base de datos interna (volumen Docker `n8n_data`), que no tiene ninguna relación con la instancia
de n8n de Facundo ni de nadie más. Al abrirlo por primera vez acá, n8n va a pedir crear un usuario
owner **nuevo**, sin workflows — es normal, no es un error ni significa que algo se rompió.

Los workflows que ya se construyeron viven como archivos JSON exportados en el repo, y hay que
**importarlos a mano** en esta instancia:

1. Abrir `http://localhost:5678`, crear el usuario owner local.
2. Desde el editor, usar **"Import from File"** (menú `⋯` arriba a la derecha, o al crear un
   workflow nuevo) e importar `workflow/vm-pipeline-lab-apache.json` (el pipeline real).
3. Importar también `gvm-integration/mock-gvm-preview-workflow.json` si hace falta revisar cómo
   quedó armado el preview antes de extenderlo.
4. **Las credenciales NO se exportan en el JSON** (por seguridad, n8n nunca incluye contraseñas
   al exportar). Después de importar, el nodo Postgres va a marcar error hasta crear una
   credencial nueva en Settings → Credentials, tipo Postgres, apuntando a:
   - Host: `postgres` (nombre del servicio, funciona igual que en la máquina original porque está
     en la misma red Docker local de este `docker-compose.yml`)
   - Database/User/Password: los valores del propio `.env` de esta máquina (`POSTGRES_DB`,
     `POSTGRES_APP_USER`, `POSTGRES_APP_PASSWORD`)
   - Port: `5432`, SSL: disabled

## 3. Instalar GVM/Greenbone Community Edition — investigar antes de ejecutar

**No hay un docker-compose.yml de GVM ya escrito y probado en este repo — hay que construirlo.**
Buscar la documentación oficial y actual de Greenbone para el despliegue Docker de la Community
Edition (el ecosistema cambia con frecuencia; no asumir que un docker-compose de hace un año
sigue vigente). Puntos de partida sugeridos para investigar (verificar que sigan vigentes, no
copiar a ciegas):

- Documentación oficial: `https://greenbone.github.io/docs/` y `https://docs.greenbone.net/`
- Repositorio de despliegue Docker oficial de Greenbone (buscar "greenbone community edition
  docker compose" — confirmar el repositorio/tags actuales antes de usar cualquier ejemplo).
- `https://greenbone.github.io/gvm-tools/` (herramienta `gvm-cli`, necesaria más adelante).

Servicios típicos que va a incluir ese stack (confirmar contra la fuente actual, no asumir):
`gvmd` (el manager, habla GMP), `ospd-openvas` (el motor de escaneo), una base de datos
PostgreSQL propia de GVM (**no reutilizar la nuestra** — GVM necesita su propio esquema interno,
no mezclar con `vm_orchestration`), `redis` (que usa ospd-openvas), y el proceso de
sincronización de feeds NVT/CVE (puede tardar bastante la primera vez — verificar tiempos
estimados actuales, documentar el tiempo real que tardó).

### 3.1. Integrarlo a nuestra red existente, no crear una red aparte

Agregar los nuevos servicios al **mismo** `docker-compose.yml` de este repo (o a un
`docker-compose.gvm.yml` separado que se levante junto con `-f`), conectados a la red `labnet`
ya existente (`172.28.0.0/24`), con una IP estática fuera del rango ya usado (`.10` n8n, `.11`
postgres, `.20` target1 — usar algo como `.30` en adelante para los servicios de GVM).

### 3.2. El problema arquitectónico a resolver: el socket GMP entre contenedores

Ya investigamos (ver `gvm-integration/README.md`) que GMP en Community Edition corre por defecto
sobre un **socket Unix local** (`gvmd.sock`), no sobre un puerto TCP. El problema: `gvmd` y `n8n`
van a ser **contenedores distintos**, y un socket Unix no cruza contenedores solo — hay que
resolverlo con una de estas dos vías (**investigar cuál es viable con la imagen/versión actual
antes de decidir**):

1. **Volumen compartido**: montar el directorio donde `gvmd` crea su socket como un volumen
   Docker nombrado, y montar ese mismo volumen dentro del contenedor de n8n. Los sockets Unix
   funcionan a través de un bind mount/volumen compartido entre contenedores en Linux. Requiere
   además instalar `gvm-tools` (`pip install gvm-tools`, trae `gvm-cli`) **dentro de la imagen de
   n8n** — extender `n8n.Dockerfile` agregando `python3` y `pip install gvm-tools` (similar a como
   ya se agregó Nmap ahí).
2. **Exponer GMP por TCP**: algunas configuraciones/imágenes de GVM permiten habilitar `gvmd`
   escuchando en TCP (el puerto histórico documentado es 9390, pero **confirmarlo contra la
   versión real que se instale** — no asumir). Si es viable, es más simple en un entorno
   multi-contenedor: no hace falta compartir volumen, solo alcanzar `gvmd:9390` por red, igual
   que ya hacemos con `postgres:5432`.

**[PREGUNTAR AL USUARIO]** si tiene preferencia entre estas dos vías una vez investigadas ambas,
salvo que una de las dos resulte claramente inviable con la versión actual (en cuyo caso, avisar
cuál y por qué antes de proceder con la otra).

### 3.3. Verificar la instalación de forma aislada antes de tocar n8n

Antes de escribir un solo nodo en n8n, confirmar que la conexión GMP funciona por fuera, a mano:

```bash
gvm-cli socket --socketpath /ruta/al/gvmd.sock --xml "<get_version/>"
```

(o el equivalente TCP si se optó por esa vía). Guardar la salida real como evidencia
(`gvm-integration/evidencia-get-version.txt` o similar). Si esto no funciona, no seguir — resolver
acá primero, con diagnóstico real (logs de `gvmd`, `docker compose logs`, permisos del socket).

## 4. Reemplazar el mock por la integración real en el pipeline

**No modificar directamente `nodo-gvm-parseo-mock.js` in situ sin criterio** — copiarlo a un
nuevo archivo (ej. `workflow-nodes/nodo-gvm-parseo-real.js`), ajustar lo que haga falta según la
estructura XML **real** que devuelva el `gvm-cli` de verdad (puede diferir del mock — verificar
con la salida real de un `get_reports` antes de dar por buena la misma estructura que asumimos).

La secuencia real de comandos GMP a construir como nodos "Execute Command" (cada uno invocando
`gvm-cli` una vez, mismo patrón que ya usamos con Nmap — ver `gvm-integration/README.md` para la
justificación de por qué este patrón y no una conexión persistente):

1. `create_target` (apuntando a `target1`, IP `172.28.0.20`) → capturar el `target_id` de la
   respuesta **explícitamente en un nodo Code**, no asumir que se puede "arrastrar" solo (un ID
   que se genera y nunca se captura correctamente rompe toda la cadena).
2. `create_task` (usando el `target_id` del paso anterior) → capturar `task_id`.
3. `start_task` (usando `task_id`) → capturar el `report_id` que devuelve al iniciar (o
   confirmar cómo se obtiene según la versión real de GMP).
4. Esperar a que el escaneo termine. **Investigar la forma correcta de esperar/consultar
   progreso** en vez de un tiempo fijo arbitrario — un `Wait` fijo sin justificar no tiene forma
   de adaptarse a la duración real de una evaluación de GVM. Alternativas
   a evaluar: nodo `Wait` de n8n + polling con `get_tasks` consultando el status, hasta ver
   `Done`.
5. `get_reports` (usando `report_id`) → el XML real de resultados.
6. Nodo de parseo (adaptado del mock, verificado contra la estructura real).
7. **Actualizar (no insertar) las filas de `vulnerability_scans`** ya creadas por el pipeline de
   Nmap, cruzando por `host_ip` + `port` (decisión de diseño ya documentada en
   `gvm-integration/README.md` — revisarla antes de implementar). Si un hallazgo de GVM no tiene
   una fila previa de Nmap para el mismo host:puerto (puede pasar), decidir si insertar una fila
   nueva o descartar — **[PREGUNTAR AL USUARIO]** si no es obvio cuál conviene.
8. Confirmar que `nodo8-generar-informe.js` (el real, no el `-PREVIEW`) sigue funcionando sin
   cambios con datos reales — ya está preparado para esto (rama de severidad ya probada con el
   mock, ver `gvm-integration/preview-informe-ejemplo.md`).

Probar cada nodo nuevo de forma aislada (`Execute step` en n8n, revisando el output crudo) antes
de conectar el siguiente — mismo método usado en toda la Fase 4 de este proyecto.

## 5. Protocolo de pruebas — acá SÍ corren las 10 ejecuciones

A diferencia de la etapa solo-Nmap (donde 10 corridas idénticas no aportaban nada), con GVM real
el tiempo de escaneo SÍ varía y es sustancialmente más largo. Ejecutar el pipeline completo
**10 veces consecutivas** contra `target1`, y para cada corrida registrar:

- Tiempo total de reloj (inicio a fin).
- Cantidad de hallazgos devueltos por GVM.
- Si hubo algún fallo o reintento.

Guardar esto en una tabla (`docs/resultados-10-corridas-gvm.md` o similar) — es el dato crudo real
para el futuro capítulo de Resultados de la tesis. **No estimar ni redondear** — copiar los
valores reales tal como salieron.

## 6. Evidencia a capturar y dejar guardada (checklist)

Guardar todo esto en el repo, en carpetas ya existentes o nuevas según corresponda:

- [ ] Captura de pantalla del `docker compose ps` con todos los servicios (incluidos los nuevos
      de GVM) en estado sano.
- [ ] Salida real del `get_version` de prueba aislada (paso 3.3).
- [ ] Captura del lienzo completo del workflow de n8n con los nodos de GVM ya integrados
      (`evidencia/capturas/workflow-canvas-con-gvm.png`).
- [ ] JSON exportado del workflow actualizado (reemplazar o versionar aparte
      `workflow/vm-pipeline-lab-apache.json`).
- [ ] Al menos un informe Markdown real generado con CVEs reales (no simulados), guardado en
      `reports/`.
- [ ] La tabla de las 10 ejecuciones (paso 5).
- [ ] Cualquier hallazgo/corrección encontrado en el camino, documentado como comentario en el
      código en el momento en que se descubrió (mismo estilo que el resto del repo).

## 7. Commits

Mismo repositorio, misma rama `main`. Mensajes de commit descriptivos, en español, explicando
qué se hizo y por qué (mismo estilo que el historial existente — revisar `git log` para ver el
tono). Actualizar la tabla de estado de fases en `README.md` (marcar la Fase 2d como completa) y
actualizar `gvm-integration/README.md` para reflejar que el mock ya fue reemplazado por datos
reales.

## 8. Qué NO hacer

- No escanear ninguna IP fuera de la red `labnet` (`172.28.0.0/24`) sin autorización explícita
  del usuario — el laboratorio es deliberadamente aislado por motivos éticos y legales (ver
  consideraciones éticas del proyecto original, que en esto sí estaban bien planteadas).
- No mezclar la base de datos interna de GVM con `vm_orchestration` (la nuestra).
- No declarar esta fase "completa" en el README sin haber corrido el protocolo de 10 ejecuciones
  y tener la evidencia real guardada.
