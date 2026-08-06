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

## Estado actual del proyecto

| Fase | Estado | Descripción |
|---|---|---|
| 1. Red aislada del laboratorio | ✅ Completa | Red Docker `labnet` (`172.28.0.0/24`) con resolución de nombres entre contenedores |
| 2a. n8n + Nmap | ✅ Completa | Imagen propia de n8n con Nmap embebido |
| 2b. PostgreSQL | ✅ Completa | Esquema `scan_history` / `vulnerability_scans`, usuario restringido |
| 2c. Contenedor objetivo | ✅ Completa | Ubuntu 18.04 con SSH/FTP/Apache reales (CVEs verificables por versión) |
| 2d. GVM / Greenbone | ⏸️ Pausada | Requiere ≥4 GB de RAM dedicados; se retoma con una máquina de mayores recursos |
| 4. Workflow n8n de punta a punta | ✅ Completa | Nmap → parseo → PostgreSQL → informe → archivo en disco |
| 5. Evidencia y GitHub | 🔄 En progreso | Este repositorio |
| 6. Reescritura de la tesis | ⏳ Pendiente | Se redacta solo sobre la evidencia de este repo |

**Nota metodológica importante:** con GVM todavía no integrado, los "hallazgos" que produce el
pipeline hoy son datos de **reconocimiento de Nmap** (servicio + versión detectados), no
vulnerabilidades con CVE confirmado. El código del informe (`workflow-nodes/nodo8-generar-informe.js`)
lo declara así explícitamente y está diseñado para que, cuando GVM se integre, las mismas columnas
(`cve_id`, `severity_label`, `description`, `solution`) se completen sin cambiar una línea de código.

## Arquitectura

Todo el laboratorio corre en contenedores Docker sobre una única red bridge personalizada
(`labnet`, `172.28.0.0/24`), lo que evita el problema central del proyecto anterior (un
contenedor intentando resolver `localhost` para alcanzar un servicio que en realidad vive en el
host). Cada servicio se referencia por su nombre de servicio Docker (`postgres`, `target1`), no
por IP ni por `localhost`.

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

## Requisitos

- Docker Desktop con backend WSL2 (Windows) o Docker Engine (Linux).
- ~2 GB de RAM libres como mínimo para el stack actual (sin GVM).
- Git.

## Puesta en marcha

1. Cloná el repositorio y entrá a la carpeta.
2. Copiá la plantilla de variables de entorno y completá contraseñas propias:
   ```bash
   cp .env.example .env
   ```
3. Construí y levantá el stack:
   ```bash
   docker compose up -d --build
   ```
4. Verificá que los tres servicios estén sanos:
   ```bash
   docker compose ps
   ```
5. Abrí `http://localhost:5678`, creá el usuario owner local de n8n, e importá el workflow desde
   `workflow/vm-pipeline-lab-apache.json`.
6. En n8n, configurá una credencial de tipo **Postgres** apuntando a:
   - Host: `postgres`
   - Database: el valor de `POSTGRES_DB` en tu `.env`
   - User: el valor de `POSTGRES_APP_USER`
   - Password: el valor de `POSTGRES_APP_PASSWORD`
   - Port: `5432`, SSL: disabled
7. Ejecutá el workflow completo desde el botón **"Execute workflow"**.

El informe generado queda en `./reports/`, visible desde el host sin entrar al contenedor.

## Estructura del repositorio

```
.
├── docker-compose.yml          # Orquestación de los 3 servicios (n8n, postgres, target1)
├── n8n.Dockerfile              # n8n construido desde node:20-alpine + Nmap (ver comentarios: por qué no se usó la imagen oficial)
├── target1.Dockerfile          # Contenedor objetivo con vulnerabilidades reales (Ubuntu 18.04 EOL)
├── target1-entrypoint.sh       # Arranque de los 3 servicios del contenedor objetivo
├── sql/init/                   # Esquema de base de datos + creación de usuario restringido
├── workflow/                   # JSON exportado del workflow real de n8n (el artefacto principal)
├── workflow-nodes/             # Código de cada nodo Code, documentado y versionado por separado
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

## Licenciamiento de las herramientas usadas

n8n se distribuye bajo **Sustainable Use License** (fair-code / código disponible), **no** bajo
una licencia reconocida por la Open Source Initiative. Este proyecto usa terminología precisa al
respecto en toda su documentación.
