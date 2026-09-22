# Hallazgo: estructura real de `get_reports` vs. lo asumido en el mock

**Fecha:** 21/08/2026. Primer escaneo real de GVM contra `target1` (Fase 2d), tras corregir el
problema del `port_list` UDP. Resultado guardado íntegro en
`reporte-real-target1-2026-08-21.xml` (455 KB, 79 resultados totales / 26 con QoD ≥ 70).

## Lo que `gvm-integration/README.md` y el mock asumían (sin tener GVM instalado)

```xml
<nvt oid="...">
  <cve>CVE-2019-0211</cve>
  <cvss_base>7.8</cvss_base>
</nvt>
```

Una etiqueta `<cve>` limpia, un solo CVE por resultado.

## Lo que realmente devuelve GVM 22.7 / gvmd 26.36.1

**No existe la etiqueta `<cve>`.** Los CVEs vienen como texto libre dentro de `<tags>`, en la
sub-parte `insight=`, separados por saltos de línea, y **puede haber varios CVEs en un solo
resultado** (los NVT tipo "Multiple Vulnerabilities" agrupan varios CVEs relacionados con la misma
versión de software):

```xml
<nvt oid="1.3.6.1.4.1.25623.1.0.149152">
  <name>Apache HTTP Server &lt; 2.4.55 Multiple Vulnerabilities - Linux</name>
  <cvss_base>9.0</cvss_base>
  <tags>...|insight=The following vulnerabilities exist:

  - CVE-2006-20001: mod_dav out of bounds read, or write of zero byte

  - CVE-2022-36760: Possible request smuggling in mod_proxy_ajp

  - CVE-2022-37436: mod_proxy allows a backend to trigger HTTP response splitting|...</tags>
  <refs>
    <ref type="cert-bund" id="WID-SEC-2024-3195"/>
    <ref type="dfn-cert" id="DFN-CERT-2026-2996"/>
    <!-- refs trae cert-bund/dfn-cert, NO trae los CVE acá tampoco -->
  </refs>
</nvt>
<threat>Critical</threat>
<severity>9.0</severity>
<qod><value>30</value><type></type></qod>
<description>Installed version: 2.4.29
Fixed version:     2.4.55
Installation path / port: 80/tcp</description>
```

## Consecuencias para `workflow-nodes/nodo-gvm-parseo-real.js` (a construir)

1. **Extraer CVEs con regex** (`/CVE-\d{4}-\d+/g`) sobre el texto de `<tags>` (específicamente la
   parte `insight=`), no con un selector XML directo — no hay campo estructurado.
2. **Un resultado de GVM puede producir varias filas en `vulnerability_scans`** (una por cada CVE
   real que contenga), no una relación 1:1 como asumía el mock. Hay que decidir si se inserta una
   fila por CVE (recomendado, para que `cve_id` sea siempre un valor único por fila, como espera
   `sql/init/01_schema.sql`) o se concatenan CVEs en una sola fila — **usar una fila por CVE**,
   consistente con la columna `cve_id VARCHAR(32)` (un solo CVE por fila).
3. **Filtrar por QoD explícitamente y con criterio**, no confiar en el filtro por defecto de la UI
   (`min_qod=70`): en este escaneo real, el hallazgo más grave (CVSS 9.0, Apache multiple vulns)
   tenía `qod=30` — quedaría afuera con el filtro por defecto. Decisión pendiente
   **[PREGUNTAR AL USUARIO]**: ¿bajamos el umbral de QoD para no perder hallazgos de alta severidad
   con evidencia débil, o los dejamos afuera y lo documentamos como limitación conocida?
4. Resultados sin ningún CVE en el texto (ej. "FTP Server Detection", banners informativos) deben
   seguir insertándose con `cve_id = NULL`, igual que ya contempla el schema — no descartarlos.

## Datos crudos de esta corrida (evidencia, no estimación)

- 79 resultados totales, 26 con QoD ≥ 70.
- Distribución por puerto: 21/tcp → 5 resultados, 22/tcp → 23, 80/tcp → 42.
- 56 CVEs reales distintos mencionados en total (ver `cves-reales-target1-2026-08-21.txt`).

## Resolución de la pregunta de QoD

**Decisión tomada:** no filtrar por QoD (`min_qod=0` en el filtro de `get_reports` — ver el nodo
"GMP Get Reports" del workflow real). Se prefirió no perder hallazgos de severidad alta con QoD
bajo (como el caso real documentado arriba: CVSS 9.0 con QoD 30) antes que aplicar el umbral por
defecto de la interfaz web de GVM (70).

**Limitación conocida, a declarar explícitamente en la tesis:** esta decisión puede incluir más
falsos positivos que el comportamiento por defecto de GVM. Se documenta como decisión consciente
de diseño (priorizar no perder hallazgos graves), no como un descuido — ver el capítulo de
Alcances y Limitaciones de la tesis para la redacción formal de esta decisión.

**Confirmado con el usuario:**  [La fecha fue 21/08/2026]

## Actualización (verificada el 22/09/2026 contra las corridas del protocolo, 24/08/2026)

El reporte del 21/08 usado para este hallazgo tenía `<cves><count>0</count>` y ningún NVT con un
`<ref type="cve">` en su bloque `<refs>` (ver el ejemplo de arriba: el comentario "refs trae
cert-bund/dfn-cert, NO trae los CVE acá tampoco" describe exactamente ese reporte). La conclusión
"no existe la etiqueta `<cve>`, los CVE solo viajan en `insight`" era correcta para esa evidencia.

Los reportes de las diez corridas del protocolo (`scan_id` 7 a 16, 24/08/2026), publicados en
`evidencia/reportes-gvm/`, se consultaron en modo solo lectura el 21/09/2026 y muestran otra cosa:
51 de los 57 resultados accionables sí traen uno o más `<ref type="cve">` en `<refs>` (92 CVE
distintos), consistente en las diez corridas. Lo mismo se ve en la corrida de verificación del
01/09/2026 (Figura B.5 de la tesis). No hay un artefacto publicado que muestre qué exponía GVM el
24/08 mismo: el reporte del 21/08 no trae ningún `<ref type="cve">`, pero sí 349 referencias
`cert-bund` y 680 `dfn-cert`, así que no es un reporte "con menos referencias" en general. Que el
feed se haya actualizado entre el 21/08 y el 24/08 es una hipótesis razonable, no un hecho
verificado con evidencia propia. El nodo 21 sigue extrayendo los CVE solo de `insight`, con regex,
y por eso persiste 54 CVE únicos, no 92 — no lee esa referencia estructurada. El detalle completo
está en `evidencia/gvm-diez-corridas.md` y en el capítulo 8 y la Discusión de la tesis. No se
modificó el nodo 21 para esta corrección: se documentó la limitación, como trabajo futuro queda
re-parsear `<refs>` en vez de (o además de) `insight`.
