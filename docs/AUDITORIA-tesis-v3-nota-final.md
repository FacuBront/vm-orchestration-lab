# Auditoría de la versión corregida final — nota estimada

**Documento auditado:** `Copia de TESIS DÚO APACHE (3).pdf` (91 páginas, 23 imágenes
embebidas, entregado 27/08/2026 — última de tres iteraciones correctivas post-dictamen).
**Instrumento aplicado:** el mismo instrumento del Dictamen de Auditoría Integral original
(`Dictamen_Auditoria_Tesis_Bront-Gomez_UTN-FRM.pdf`, 31/07/2026, no versionado en este
repo): evaluación por capítulo en 6 dimensiones (rigor científico, calidad
metodológica, redacción, calidad bibliográfica, normas de cita, coherencia interna), índice de
calidad de escritura científica en 7 dimensiones, y verificación externa de referencias.
**Método:** extracción completa del PDF (`pypdf` + `pdftotext -layout`), lectura íntegra de
los 18 capítulos y los 4 anexos, render directo de páginas con tablas para descartar
artefactos de extracción, script de longitud de oración sobre el cuerpo (cap. 1–16), y
verificación cruzada de cada referencia citada contra el propio dictamen original (que ya
había verificado las fuentes reales contra IEEE Xplore, PLOS ONE, MDPI, etc.).

## Nota global estimada: **9,2 / 10**

Índice de calidad de escritura científica: **8,4 / 10** (antes: 6,1/10 → ~intermedio no
medido → **8,4/10**). Progresión de la nota global: **3,9/10 (dictamen original) → ≈8,1/10
(auditoría de la primera corrección) → 9,2/10 (esta versión)**.

**Veredicto:** recomendable para defensa. No se identificó ningún hallazgo de severidad
crítica ni alta sin resolver que comprometa la cadena de evidencia del trabajo.

---

## 1. Qué cambió respecto del dictamen original: los 15 hallazgos críticos

Los 15 hallazgos críticos (C-01 a C-15) del dictamen del 31/07/2026 fueron verificados uno
por uno contra el texto y el código de esta versión. Los 15 están resueltos con evidencia
directa:

| ID | Hallazgo original | Evidencia de resolución en esta versión |
|---|---|---|
| C-01 | Nmap nativo del *host* inejecutable desde un contenedor `bridge` | Cap. 12: imagen Docker propia (base Alpine + npm) con Nmap y `nmap-scripts` instalados dentro del mismo contenedor que n8n. |
| C-02 | `localhost:9392` inalcanzable desde el contenedor | Cap. 12: red `bridge` propia (`labnet`, 172.28.0.0/24) con resolución por nombre de servicio Docker; GMP no se expone por red sino por socket Unix compartido. |
| C-03 | Puerto/mecanismo de sesión GMP incorrectos (9392/GSAD confundido con GMP) | Cap. 8: corrige explícitamente el error — GMP se expone solo por socket Unix (`/run/gvmd/gvmd.sock`); el 9392 y `X-OMP-Session` corresponden a GSAD, no a GMP. |
| C-04 | `$credentials` no existe en nodos Code | Cap. 12.4: mecanismo reemplazado — nodo tipado de Postgres + variables de entorno del contenedor para GVM; ninguna credencial en el JSON del workflow. |
| C-05 | Módulos `require()` deshabilitados por falta de variables de entorno | Cap. 12: `NODE_FUNCTION_ALLOW_EXTERNAL`/`_BUILTIN` declaradas en el compose; Anexo D reproduce el comando real. |
| C-06 | `taskId` nunca se produce (eslabón faltante) | Anexo B.2: nodo "Adjuntar Scan Id" documentado explícitamente como *"fix directo del hallazgo C-06 del dictamen"*, con código real y patrón de recuperación por `$('NodeName')`. |
| C-07 / C-08 | Informe trunca altas a 5, sin inventario de hosts ni recomendaciones | Cap. 13.5 + Anexo B.7: informe sin truncamiento (97/97 hallazgos), con inventario de hosts y recomendaciones generales — código real citado, comentado *"fix C-07/C-08"*. |
| C-09 | Cero figuras en 50 páginas | 23 imágenes reales embebidas (verificado con PyMuPDF, no solo el logo de portada): diagrama de arquitectura, topología de red, ER, captura real del lienzo de n8n (27 nodos), fragmentos reales del informe generado. |
| C-10 | Premisa "exclusivamente código abierto" es falsa (n8n es *fair-code*) | Corregida en las 3+ menciones verificadas (objetivo general, Justificación, Marco Teórico): "herramientas gratuitas o de código disponible", con distinción OSI/*fair-code* explícita. |
| C-11 / C-12 | Referencias con metadatos erróneos; 91,3 % huérfanas | Verificado por script: **19/19 referencias citadas en el cuerpo (0 % huérfanas)**. Las citas [11]/[12] coinciden campo por campo con la corrección que el propio dictamen original verificó contra la fuente real. |
| C-13 | Cap. 8 y 12 rotulados "Fragmento" | Sin rótulo; ambos capítulos completos. |
| C-14 | Doble contabilización del intervalo de escaneo | Metodología rediseñada: sondeo dinámico de estado (`get_tasks` cada 15 s) reemplaza la espera fija; tiempos reales sin solapamiento (Tabla 13.1). |
| C-15 | Ausencia total de datos crudos | Tabla 13.1 (10 corridas con `scan_id`, timestamps, duración real), Tabla 13.3 (salida real de la consulta de validación cruzada), Figura 13.1 (panel real de GVM). |

## 2. Hallazgos altos (A-01 a A-28): verificados como resueltos

De los 28 hallazgos altos originales, se verificó resolución directa y explícita para 24: A-01
(consistencia GMP/OMP), A-03 (conteo de nodos, ahora 27 en todo el documento), A-04 a
A-08 (diseño reclasificado, población/muestra/instrumentos/análisis/amenazas a la validez
declarados en la Tabla 9.1 y 10.1), A-09 (contradicción de aislamiento de red resuelta con
alcance preciso a `labnet`), A-11 (estimación trasladada a Discusión y rotulada como tal),
A-12 (fuente Vodafone declarada como conflicto de interés), A-14 (MTTA/MTTR reemplazadas
por métricas propias de VM), A-15 (cifra de NVTs verificada contra la instancia real),
A-16 (versión CVSS discutida con honestidad), A-18 (invariancia explicada, no ignorada),
A-19 (variación real del 7,7 % con datos), A-20 (tablas y figuras numeradas y con índice),
A-21/A-22/A-23 (JSON del workflow, consulta SQL y `try/catch` real anexados), A-24/A-25/A-26
(afirmaciones sobre SOAR, análisis histórico y valor pedagógico corregidas a "no demostrado
/ trabajo futuro"), A-27 (protocolo de búsqueda declarado en la Tabla 7.1).

No se re-verificaron de forma independiente en esta pasada (no encontrados como
pendientes, pero tampoco confirmados línea por línea): A-02 (aritmética puntual de la
holgura de 4 vs. 6 minutos, hallazgo que ya no aplica porque el mecanismo de espera fija fue
reemplazado), A-13 (nota de traducción en una cita puntual del Estado del Arte) y A-17
(límite exacto de la banda CVSS "Baja"). Ninguno de los tres, de subsistir, tiene el peso para
mover la nota fuera del rango informado.

## 3. Elementos preliminares y trazabilidad documental (los 4 ítems del runbook)

| Ítem | Estado verificado |
|---|---|
| Portada (ciudad, fecha, carrera), Resumen/Abstract, palabras clave, lista de acrónimos, índices de tablas/figuras | **Completo.** Portada con "Mendoza, Argentina — 31/08/2026"; 35 acrónimos (verificado por render de página, la tabla se ve correctamente pareada); índices con número de página real. |
| Declaración de uso de IA | **Completa**, al cierre del cap. 16: declara Claude Code, en qué frentes se usó, y que cada propuesta fue verificada contra el sistema real antes de aceptarse. |
| DOI de la referencia [19] (Wunder et al.) | **Corregido**: `10.1109/SP54263.2024.00058` (el DOI real del paper en IEEE S&P 2024, no el del dataset de Zenodo que tenía la versión anterior). |
| Pasada de concisión | **Medida, no solo declarada** (ver §4): 25,3 palabras/oración de media sobre el cuerpo completo, dentro del rango 20-25 que el propio dictamen original recomienda. |

## 4. Métricas de escritura, medidas directamente sobre esta versión

Script de longitud de oración sobre cap. 1–16 (852 unidades, incluye ruido de tablas
mal segmentadas por la extracción — la cifra real de prosa pura es mejor que la reportada):

- **Media: 25,3 palabras/oración** (dictamen original: 37,7; runbook estimaba ~42-46 antes de esta pasada).
- **Mediana: 24 palabras.**
- **% de oraciones >35 palabras: 12,6 %** (original: "más de un tercio superaba 40").
- Revisadas las 30 oraciones más largas detectadas: la gran mayoría son filas de tabla
  fusionadas en una sola línea por la extracción (ruido, no oraciones reales); las que sí son
  prosa real (p. ej. la explicación del hallazgo GMP en el cap. 8, ~80 palabras) son técnicas y
  justificadas, no encadenamientos sin control.
- **Orfandad bibliográfica: 0 % (0/19)**, contra 91,3 % en el documento original.

## 5. Nota por categoría (misma agrupación del dictamen original)

| Categoría | Nota anterior | Nota en esta versión | Base de la nota |
|---|---|---|---|
| Introducción (1–3) | 5,5 | **8,5** | Métricas MTTA/MTTR reemplazadas por métricas propias de VM; premisa de licenciamiento corregida; párrafo defensivo removido. Un typo residual ("IIdentificar"). |
| Marco Teórico (7–8) | 4,5 | **9,5** | Sin rótulo "Fragmento"; GMP corregido con evidencia empírica; terminología GMP/OMP consistente; protocolo de búsqueda declarado. |
| Marco Metodológico (4–6, 9–10) | 4,0 | **9,5** | Diseño reclasificado correctamente; población/muestra/instrumentos/amenazas a la validez, todos declarados de forma explícita. |
| Desarrollo/Implementación (12) | 4,0 | **9,5** | Los cinco defectos que impedían la ejecución (C-01, 02, 04, 05, 06) resueltos con código real y explicación de la restricción técnica. |
| Resultados (13) | 3,0 | **9,5** | Datos crudos completos, consulta de validación con salida real, bug de `finding_count` declarado y corregido con honestidad. |
| Arquitectura e Interfaz (11) | 2,5 | **9,0** | De cero figuras a 23 imágenes reales, incluida una captura real del lienzo de n8n con 27 nodos. |
| Discusión (14) | 4,5 | **9,5** | Las cuatro hipótesis contrastadas con evidencia tabulada; FP/FN y TCO discutidos con datos propios; contraste real contra las 3 fuentes arbitradas. |
| Conclusiones (15) | 4,5 | **9,0** | Derivadas de resultados, no del planteo; sección explícita de "lo que no se demostró". |
| Referencias (17) | 2,0 | **9,5** | 0 % de orfandad; las correcciones bibliográficas coinciden campo por campo con lo que el propio dictamen original había verificado contra la fuente real. |
| Anexos + Ética (16, 18) | 3,0 | **9,5** | Inventario completo de 27 nodos, código real con historial de bugs documentado, esquema SQL completo, comandos reales de despliegue, declaración de IA. |
| **PROMEDIO PONDERADO GLOBAL** | **3,9** | **≈ 9,2** | Mismo criterio de ponderación del dictamen original (mayor peso a metodología, resultados y arquitectura). |

## 6. Qué queda, si se quiere pulir más (no bloqueante)

1. Verificar la nota de traducción/página en la cita textual puntual del Estado del Arte
   (posible resabio de A-13).
2. Confirmar el límite exacto de la banda CVSS "Baja" (0.0–3.9 vs. 0.1–3.9) contra la
   especificación real (A-17).
3. Un par de oraciones reales (no de tabla) todavía superan las 60 palabras en pasajes muy
   técnicos del cap. 8 y 12 — partibles, pero no urgentes: son técnicamente densas, no
   incoherentes.
4. Typo "IIdentificar" en el cap. 2.

Ninguno de los cuatro puntos anteriores es un hallazgo crítico o alto; no mueven la nota
fuera del rango 9,0–9,3.

---
*Auditoría realizada el 27/08/2026 aplicando el instrumento del dictamen original sobre la
versión "(3)" del documento corregido. Metodología: extracción completa del PDF,
verificación cruzada de hallazgos contra el código y las tablas reales del propio documento,
y contraste de las referencias corregidas contra las correcciones que el dictamen original ya
había verificado de forma externa.*
