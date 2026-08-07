# Preparación de la integración con GVM/Greenbone (Fase 2d)

Esta carpeta contiene trabajo preparatorio para la integración con GVM, hecho **sin tener GVM
instalado todavía** (bloqueado por RAM insuficiente en la notebook de desarrollo — ver
`docs/decisiones-arquitectura.md` en la raíz). El objetivo es dejar la lógica de parseo e
inserción en base de datos ya construida y probada, para que conectar el GVM real cuando esté
disponible sea solo cuestión de reemplazar la fuente del XML, sin tocar el resto del pipeline.

## Qué se investigó y confirmó (fuentes oficiales)

- GMP es un protocolo **con estado**, sobre una conexión persistente (socket Unix por defecto en
  Community Edition: `/run/gvmd/gvmd.sock`; o TCP/TLS legado en el puerto 9390). **No es REST y
  no usa un token de sesión en cabeceras** — a diferencia de lo que documentaba la tesis anterior
  (`X-OMP-Session`), que confundía GMP con la API de la interfaz web (GSA).
  - Fuentes: [GOS Manual - Using GMP](https://docs.greenbone.net/GSM-Manual/gos-24.10/en/gmp.html),
    [gvm-tools - Connection Types](https://greenbone.github.io/gvm-tools/connectiontypes.html),
    [python-gvm - Usage](https://greenbone.github.io/python-gvm/usage.html)
- La autenticación es válida mientras la conexión/socket esté abierto — no hay reautenticación
  por comando.
- La respuesta de `get_reports` incluye, por cada hallazgo, un elemento `result` con `nvt`
  (que a su vez contiene `cve`, `cvss_base`), `severity`, `threat` y `qod` (quality of detection).
  Confirmado parcialmente contra el esquema de `gvmd` y la documentación de la API; **la
  estructura exacta completa queda pendiente de confirmar contra una instancia real** (el archivo
  de esquema fuente es de 1,2 MB y no pudo revisarse línea por línea sin una instancia corriendo).

## Decisión de diseño: cómo integrar un protocolo con estado en n8n

n8n ejecuta cada nodo como una operación independiente; no puede mantener un socket abierto entre
nodos. Igual que ya hacemos con Nmap, cada operación GMP se va a invocar vía el nodo **"Execute
Command"**, llamando a `gvm-cli` (la herramienta CLI oficial de `gvm-tools`, que internamente
abre la conexión, autentica, ejecuta un comando GMP y cierra). Cada nodo de n8n hace UNA operación
GMP completa por invocación — más simple de razonar y más resiliente a cortes de red que intentar
sostener una conexión persistente entre nodos.

## Archivos de esta carpeta

- `mock-get-reports-response.xml` — Respuesta simulada de `get_reports`, con 3 hallazgos basados
  en CVEs reales aplicables a las versiones exactas detectadas en `target1` (Apache 2.4.29,
  OpenSSH 7.6p1, vsftpd 3.0.3). **No es una respuesta real de GVM** — es una hipótesis fundada
  para poder construir y probar el resto del pipeline mientras GVM no está disponible. Se
  reemplaza por datos reales en cuanto se conecte un GVM de verdad. Una copia de este archivo
  vive también en `../reports/_mock-get-reports-response.xml` porque esa carpeta es la que está
  montada dentro del contenedor de n8n (ver `docker-compose.yml`) — la fuente de verdad es la
  copia de acá.
- `mock-gvm-preview-workflow.json` — **Workflow de n8n completamente separado del real**
  (`MOCK - GVM Preview`), que ejecuta la cadena Execute Command (lee el mock) → parseo → adaptar
  campos + resumen en memoria → generar informe → guardar en disco. **No inserta nada en
  PostgreSQL** — cero riesgo de contaminar `scan_history` / `vulnerability_scans` con datos
  simulados. Cuando GVM esté disponible, este workflow no se reutiliza ni se modifica: se
  construye la integración real directamente en el workflow de producción
  (`workflow/vm-pipeline-lab-apache.json`).
- `preview-informe-ejemplo.md` — Informe real generado por ese workflow de preview el
  07/08/2026, ejecutado dentro de n8n (no una simulación de escritorio). Confirma que la rama de
  agrupación por severidad del generador de informes funciona de punta a punta.
- Nodos de código correspondientes (también en `workflow-nodes/`):
  `nodo-gvm-parseo-mock.js`, `nodo-mock-adaptar-y-resumen.js`, `nodo8-generar-informe-PREVIEW.js`.

## Advertencia para la redacción de la tesis

**No declarar en el documento final que estos CVEs fueron "detectados"** — fueron elegidos a mano
como hipótesis realista para poder desarrollar y probar el código de parseo. Los hallazgos reales
recién existen cuando GVM corra de verdad contra `target1`. El capítulo de Desarrollo debe
explicar esta secuencia con la misma honestidad con la que se documentó acá.
