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
(`workflow/vm-pipeline-lab-apache.json`, commit `b2eeaff`) sobre cada reporte, y se contaron los
resultados del XML de forma independiente, sin pasar por ese código.

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

## Cómo reproducirlo

```
npm install xml2js
node evidencia/recalculo-nodo21.js evidencia/reportes-gvm
```

El script imprime una fila por reporte con las mismas columnas y el SHA-256 del XML sin comprimir. El
mismo script, aplicado al XML de una corrida previa (`gvm-integration/reporte-real-target1-2026-08-21.xml`,
del 21/08/2026, que no corresponde a ningún `scan_id` del protocolo), da las mismas cifras.

## Sobre `<cves><count>` en el reporte de GVM

Los reportes traen un elemento `<cves><count>94</count>`. Es el número de CVE distintos que GVM
referencia en el reporte. Coincide numéricamente con las 94 filas de GVM, pero es otra magnitud. El
pipeline persiste 54 CVE únicos, los que el nodo 21 extrae del campo `insight` de cada resultado, como
se describe en el capítulo 8 de la tesis.
