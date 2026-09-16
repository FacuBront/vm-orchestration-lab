# Orquestación del Ciclo de Vida de Gestión de Vulnerabilidades (VM) con n8n

Laboratorio real y reproducible para una Tesis de Grado de la Tecnicatura Universitaria en
Programación — UTN Facultad Regional Mendoza.

## Contexto

Este repositorio es la reconstrucción **desde cero** de un proyecto de tesis que fue auditado
con un dictamen de 3,9/10 (no recomendable para defensa). El dictamen detectó que el sistema
documentado no podía funcionar en la realidad: contradicciones de red entre Docker y el host,
protocolos mal identificados, código con objetos inventados (`$credentials`), informes que
truncaban resultados arbitrariamente y una bibliografía en su mayoría no verificada.

La reconstrucción sigue un principio único: **no se documenta nada que no se haya ejecutado y
verificado primero**. Cada decisión técnica de este repositorio, incluyendo los errores y sus
correcciones, quedó registrada en el momento en que ocurrió (ver comentarios en el código y el
historial de commits).

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
conocidos) en la misma ejecución. Los hallazgos de Nmap quedan como fila base por host:puerto;
cada CVE real que GVM encuentra para ese host:puerto se inserta como fila adicional (`cve_id`,
`severity_score`, `severity_label`, `description`, `solution` poblados) — ver la decisión de
diseño documentada en `gvm-integration/hallazgo-estructura-real-get-reports.md`.

## Arquitectura

Todo el laboratorio corre en contenedores Docker sobre una única red bridge personalizada
(`labnet`, `172.28.0.0/24`), lo que evita el problema central del proyecto anterior (un
contenedor intentando resolver `localhost` para alcanzar un servicio que en realidad vive en el
host). Cada servicio se referencia por su nombre de servicio Docker, no por IP ni por
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
