# Diez corridas del protocolo: `result_count` y recálculo de la cadena de conteo

Evidencia de la cadena **79 → 57 → 94 → 97** para cada una de las diez corridas del protocolo
(`scan_id` 7 a 16, ejecutadas el 24/08/2026).

## Cómo se obtuvo

El 21/09/2026 se consultó, en modo solo lectura, el reporte de cada corrida en la instancia de GVM del
laboratorio. Se usó el mismo comando que ejecuta el nodo 20 del workflow:

```
get_reports report_id='<report_id>' details='1' filter='apply_overrides=0 min_qod=0 first=1 rows=-1'
```

La respuesta completa de cada consulta se guardó comprimida en `evidencia/reportes-gvm/`. Después se
ejecutó, sin modificarlo, el código del nodo `GMP Parsear Reporte Real` (nodo 21) del workflow
(`workflow/vm-pipeline-lab-apache.json`, commit `b2eeaff`, sin cambios desde entonces al momento de
publicar este archivo) sobre cada reporte, y se contaron los resultados del XML de forma
independiente, sin pasar por ese código. El script lee el archivo del workflow del árbol de trabajo,
no de un commit fijo por código; se deja declarado acá que, a la fecha de esta evidencia, coincide
con `b2eeaff`.

## Resultado

| scan_id | Tarea en GVM | report_id | result_count | Log | Accionables | Filas de GVM | Con CVE / sin CVE | CVE únicos | Crít./Alta/Media/Baja | Archivo |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | `01-scan-target1-7` | `f382d9f8-3555-4f3d-a0cc-056a51327157` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-07.xml.gz` |
| 8 | `02-scan-target1-8` | `386b49ae-c003-4fc5-b19e-af73a3a637ce` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-08.xml.gz` |
| 9 | `03-scan-target1-9` | `999ff51e-5087-439b-a5f0-e2e55dfe894f` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-09.xml.gz` |
| 10 | `04-scan-target1-10` | `0d780876-6f54-40d9-aebd-69dc42307397` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-10.xml.gz` |
| 11 | `05-scan-target1-11` | `71ab68b2-43d2-4bda-acfa-4a862de01be4` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-11.xml.gz` |
| 12 | `06-scan-target1-12` | `3f1c30af-ee03-47af-be65-8c2b9ad8fa78` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-12.xml.gz` |
| 13 | `07-scan-target1-13` | `89ff26b9-f842-4e96-9bdd-d721dccfff8d` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-13.xml.gz` |
| 14 | `08-scan-target1-14` | `d9fd6c63-597f-4026-a722-9c6c7f7044ff` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-14.xml.gz` |
| 15 | `09-scan-target1-15` | `b85a8a88-d9de-4d82-a8d1-7c6fcfa74a33` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-15.xml.gz` |
| 16 | `10-scan-target1-16` | `5df30d50-815b-4347-b243-6dca664e37d6` | 79 | 22 | 57 | 94 | 54 / 40 | 54 | 31/20/37/6 | `reporte-scan-16.xml.gz` |

- **result_count**: campo `result_count/full` del reporte. Coincide con el número de elementos `<result>`.
- **Log**: resultados de categoría `Log`, que el nodo 21 descarta por ser puramente informativos.
- **Accionables**: resultados − Log (79 − 22 = 57).
- **Filas de GVM**: filas que devuelve el nodo 21. Cada resultado sin CVE produce una fila (40) y cada
  resultado con uno o más CVE se expande en una fila por CVE (17 resultados → 54 filas). 40 + 54 = 94.
- Las 94 filas de GVM, más las 3 filas de reconocimiento de Nmap, dan las 97 filas persistidas en
  `vulnerability_scans` por corrida (ver `docs/resultados-10-corridas-gvm.md`).

Las diez corridas dan exactamente las mismas cifras.

## CVE: texto insight frente a referencias estructuradas de GVM

Cada resultado de GVM trae, dentro de `<nvt>`, un bloque `<refs>` con elementos
`<ref type="cve" id="CVE-…"/>`. El nodo 21 no lee ese bloque: extrae los CVE con una expresión
regular sobre el texto libre del campo `insight` de `<tags>`. En el reporte del 21/08/2026 contra
el que se diseñó el nodo (`gvm-integration/reporte-real-target1-2026-08-21.xml`), ningún NVT traía
un `<ref type="cve">`, así que la decisión de leer solo `insight` no perdía nada en ese momento. El
feed de vulnerabilidades de gvmd se actualizó después: en las diez corridas del protocolo
(24/08/2026), sí trae esas referencias.

Verificado el 22/09/2026 sobre los diez reportes publicados en `evidencia/reportes-gvm/`, idéntico
en las diez corridas:

| Magnitud | Valor |
|---|---|
| Accionables con al menos un `<ref type="cve">` | 51 de 57 |
| Accionables con CVE en el texto `insight` (los que persiste el pipeline) | 17 de 57 |
| CVE distintos en `<refs>` de los accionables | 92 |
| CVE distintos que persiste el pipeline (desde `insight`) | 54 |
| CVE en `<refs>` que no llegan a la base | 39 (42 %) |
| Filas con `cve_id` nulo cuyo resultado sí tiene CVE en `<refs>` | 34 de 40 |
| Accionables sin ningún CVE (ni en `insight` ni en `<refs>`) | 6 |
| Filas de GVM si se expandiera por `<refs>` en vez de por `insight` | 99 (93 con CVE, 6 sin CVE) |

El elemento `<cves><count>` del reporte (94, visible en la Figura B.5 de la tesis) es el número de
elementos `<ref type="cve">` que gvmd cuenta en todo el reporte, no de CVE distintos: hay 93 valores
de CVE distintos entre esos 94, porque `CVE-2023-48795` está referenciado en dos resultados
distintos. No es una magnitud distinta de los 54 CVE persistidos: es la misma magnitud —CVE
asociados al escaneo— medida antes de que el pipeline la filtre a lo que puede leer del texto
insight.

Esto no altera la cadena de conteo por filas (79 → 57 → 94 → 97), que cuenta resultados y CVE
mencionados en `insight`, no en `<refs>`. Afecta a qué proporción de los CVE que GVM asocia
realmente al objetivo queda persistida: 54 de 92 en los accionables, un 59 %.

## Horas reales del escaneo de GVM (scan_start / scan_end)

La Tabla 13.1 de la tesis usaba antes el `started_at`/`finished_at` de `scan_history`, que no
coincide con el horario real del escaneo de GVM en esta versión del workflow (26 nodos, sin el nodo
que registra el fin real). Estos valores se leen directamente de `<scan_start>` y `<scan_end>` de
cada reporte publicado en `evidencia/reportes-gvm/` (hora local, UTC−3):

| scan_id | scan_start | scan_end | Duración (s) |
|---|---|---|---|
| 7 | 12:05:30 | 12:19:18 | 828 |
| 8 | 12:19:50 | 12:33:39 | 829 |
| 9 | 12:34:51 | 12:48:33 | 822 |
| 10 | 12:49:41 | 13:03:29 | 828 |
| 11 | 13:04:42 | 13:18:17 | 815 |
| 12 | 13:21:44 | 13:35:36 | 832 |
| 13 | 13:37:05 | 13:50:41 | 816 |
| 14 | 13:52:05 | 14:05:53 | 828 |
| 15 | 14:07:05 | 14:20:59 | 834 |
| 16 | 14:22:06 | 14:36:05 | 839 |

Media: 827,1 s. Mínimo: 815 s (scan_id 11). Máximo: 839 s (scan_id 16). Rango: 24 s (2,9 % de la
media). Se puede reproducir sobre cualquier reporte con:

```
python -c "import gzip,xml.etree.ElementTree as ET; r=ET.fromstring(gzip.open('evidencia/reportes-gvm/reporte-scan-07.xml.gz').read()); rep=r.find('.//report/report'); print(rep.findtext('scan_start'), rep.findtext('scan_end'))"
```

## Cómo reproducirlo

```
npm install xml2js
node evidencia/recalculo-nodo21.js evidencia/reportes-gvm
```

El script imprime una fila por reporte con las mismas columnas y el SHA-256 del XML sin comprimir. El
mismo script, aplicado al XML del 21/08/2026 (`gvm-integration/reporte-real-target1-2026-08-21.xml`,
que no corresponde a ningún `scan_id` del protocolo), da la misma cadena 79 → 57 → 94, aunque ese
reporte no tiene ninguna referencia `<ref type="cve">` estructurada (ver la sección anterior).
