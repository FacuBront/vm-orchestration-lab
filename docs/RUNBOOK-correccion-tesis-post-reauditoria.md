# Runbook — Corrección post-re-auditoría (segunda instancia, 27/08/2026)

**Contexto:** el 27/08/2026 el tribunal re-auditó `Correccion_Tesis_Dúo_Apache.pdf` (91 páginas,
≈28.500 palabras) contra el dictamen original del 31/07/2026 (3,9/10, "no recomendable"). Los 15
hallazgos **críticos** están todos resueltos — ninguno reabierto. Veredicto de esta instancia:

> **Recomendable para defensa, con correcciones previas a la versión final**
> Puntaje global: **7,7/10** (antes 3,9) · Índice de calidad de escritura: **7,8/10** (antes 6,1)
> 30 hallazgos restantes: 0 críticos, **6 altos**, 15 medios, 9 bajos

Fuente completa: `Dictamen_Re-auditoria_Tesis_Bront-Gomez_UTN-FRM.pdf` (20 págs., extraído a texto
en esta sesión). Este runbook reorganiza sus 30 hallazgos restantes según las **10 condiciones**
que el propio tribunal lista en su sección 9.2 como requisito para la versión final, en su mismo
orden de prioridad.

**Patrón común a los 6 hallazgos Altos (según el propio dictamen):** ninguno es una falla de
construcción — el sistema funciona y está evidenciado. Los cinco primeros son casos donde **el
documento afirma un poco más de lo que la evidencia sostiene**; el sexto es editorial (la tesis
menciona su propio dictamen dentro del texto entregado). Se corrigen ajustando enunciados y
recalculando tablas, no rehaciendo el sistema — con la excepción condicional de A-01 (ver decisión
pendiente abajo).

---

## ✅ Decisión tomada (28/08/2026): A-01 vía (b)

Facundo e Ignacio eligieron **declarar el objetivo como fijo por diseño** en esta versión (no
re-ejecutar el protocolo de 10 corridas). Esfuerzo total del runbook: **5-8 días**, no 2 semanas.
Queda pendiente ajustar Objetivo Específico 3, el pie de la Figura 8.1 y la contrastación de H1
(condición 1, detalle abajo).

## Decisión que quedó registrada (contexto, ya resuelta)

**A-01 — GVM no se parametriza con el resultado de Nmap.** El nodo 9 (`GMP Create Target`) fija
`<hosts>172.28.0.20</hosts>` y un `port_list` por UUID constante; el Objetivo Específico 3 declara
que el objetivo se crea "para el host descubierto en la etapa anterior", y no es así — son dos
ramas paralelas, no una cadena. El dictamen ofrece dos vías **igualmente defendibles**:

| Vía | Qué implica | Esfuerzo |
|---|---|---|
| **(a) Parametrizar `create_target`** con el host y los puertos que devuelve el nodo 3 de Nmap, cerrando la cadena real | Cambio de código en el workflow real + **re-ejecutar el protocolo de 10 corridas** para tener evidencia nueva | ~2 semanas |
| **(b) Declarar el objetivo como fijo por diseño** en esta versión, y corregir el Objetivo Específico 3, el pie de la Figura 8.1 y la contrastación de H1 en consecuencia | Solo texto | 1-4 días |

El propio dictamen dice: *"Lo que no es sostenible es mantener el enunciado actual junto al código
actual."* — hay que elegir una de las dos, no se puede dejar como está. Esto determina si el
esfuerzo total es de 5-8 días (vía b) o 2 semanas (vía a), así que lo resolvemos primero.

---

## Orden de prioridad (condiciones del dictamen, sección 9.2)

| # | Condición | Hallazgos que resuelve | Esfuerzo (dictamen) |
|---|---|---|---|
| 1 | Resolver Nmap→GVM (ver decisión arriba) | A-01 | 1-4 días o 2 semanas |
| 2 | Reconstruir Tabla 13.3 sobre 3 magnitudes independientes por corrida; sacar `finding_count` de la cadena probatoria de H2 | A-02 | 1 día |
| 3 | Fijar terminología "hallazgo"/"registro"; corregir Resumen, Abstract, cap. 13; corregir columna "Con CVE" y 5ª fila Tabla 13.2; corregir 7,7%→7,5%; fecha del protocolo | A-03, M-06, M-07, M-08, M-11 | 1 día |
| 4 | Recalcular estimación de esfuerzo manual sobre 54 evaluaciones únicas, reencuadrar como rango; referenciar o retirar cifra de Ponemon | A-04, M-05 | 1 día |
| 5 | Reformular H3 a los 4 criterios de aceptación (Tabla 6.1); actualizar Tabla 6.2, Figura 6.1, contrastación cap. 14 | A-05 | 2 horas |
| 6 | Depurar referencias al dictamen / "tesis anterior" / códigos C-06,C-07,C-08 del cuerpo, pies de figura y comentarios de código | A-06, B-07, B-08 | 1 día |
| 7 | Bibliografía: [18]→2025 con vol./núm./págs.; cita [19]→[14]; fechas de consulta; norma de citación; fair-code con fuente primaria | M-01 a M-04 | 4 horas |
| 8 | Rehacer Figura 11.2 legible (página completa/apaisada/partida); ampliar 12.2 y 13.2; completar índices de tablas/figuras con títulos + anexo | M-09, B-05 | 4 horas |
| 9 | Numerar secciones cap. 12; reparar referencias cruzadas; nombrar 2 variables de entorno y `port_list`; documentar a qué CVSS corresponde `severity_score`; corregir "código abierto" residual cap. 14; completar portada | M-10, M-12 a M-15 | 4 horas |
| 10 | Pasada final de edición: recortar refuerzos evidenciales ("de forma X" ×102, "real/es" ×149, "explícito" ×49, "este trabajo" ×191); erratas; espaciado; pies de figura; pasaje roto en Discusión (B-04) | B-01 a B-04, B-06, B-09 | 1 día |

**Total: 5-8 días de trabajo parcial entre los dos autores** (o +2 semanas si se elige la vía (a)
de A-01). Las condiciones 1 a 5 son las que afectan afirmaciones sustantivas del documento y deben
cerrarse antes de la defensa; las 6 a 10 son formales/editoriales.

---

## Detalle por condición

### 1 — A-01: Nmap → GVM — vía (b) elegida: objetivo fijo por diseño
Capítulos afectados: 4, 8, 12, 18 (Anexo B.3). Corregir para que el texto diga lo que el código
hace hoy (objetivo GVM fijo, IP y `port_list` constantes por diseño en esta versión), no lo que
haría si estuviera parametrizado:
- Objetivo Específico 3 (cap. 4) — quitar "para el host descubierto en la etapa anterior".
- Pie de la Figura 8.1 (cap. 8) — quitar "una lista de puertos acotada a los servicios reales del
  objetivo".
- Contrastación de H1 (probablemente cap. 14) — ajustar a lo efectivamente implementado.
- Agregar la parametrización real de `create_target` como **trabajo futuro** explícito (en algún
  punto de Discusión/Conclusiones cerca de donde ya se declara qué no se demostró).

### 2 — A-02: Tabla 13.3 tautológica
La Tabla 13.3 compara `scan_history.finding_count` contra `count(*)` de `vulnerability_scans` —
pero el Anexo D.4 documenta que `finding_count` se corrigió con un `UPDATE` que lo iguala a ese
mismo `count(*)`. Es una identidad algebraica, no una validación. Reconstruir sobre:
1. Resultados devueltos por `get_reports` (GVM)
2. Filas insertadas en `vulnerability_scans` (persistencia)
3. Ítems recorridos por el informe (nodo 24)
— las tres magnitudes independientes, por corrida. La sección 13.4 dice contrastar tres fuentes
pero la tabla solo muestra dos.

### 3 — A-03 + M-06/M-07/M-08/M-11: terminología "hallazgo" y Tabla 13.1/13.2
- Resumen/Abstract dicen "97 hallazgos reportados por GVM" — son **94 resultados de GVM** (Figura
  B.5) + 3 filas de reconocimiento Nmap = 97 filas persistidas, con expansión de 1 fila por CVE.
  Reformular como: "94 resultados de GVM, 97 registros persistidos (con la expansión por CVE
  explicada), 97 ítems del informe".
- Tabla 13.1: columna "Con CVE" = 54 se lee mal junto a "Hallazgos" (parece "hallazgos con CVE"
  pero solo 3/97 no tienen CVE según Tabla 13.2) — aclarar en encabezado/nota al pie que 54 son
  **CVE únicos**, no "hallazgos con CVE".
- Tabla 13.2: 5ª fila "Sin CVE asociado (reconocimiento)" en realidad agrupa `severity_label =
  Ninguna`, no los hallazgos sin CVE (la Figura 13.2 muestra hallazgos sin CVE en categoría
  Crítica). Renombrar según la etiqueta real del esquema.
- 7,7% → **7,5%** (63s / 837,1s = 7,5%, único error aritmético detectado).
- Falta la fecha del protocolo de 10 corridas en la Tabla 13.1 (la corrida de verificación de la
  Figura 13.2 sí la tiene: 24/08/2026).

### 4 — A-04 + M-05: estimación de 36×
Doble problema con la cifra:
1. La mediana de Wunder et al. se multiplica por 97 filas, pero hay solo **54 CVE únicos** (varias
   filas repiten la misma evaluación — mismo aviso técnico, misma versión de Apache).
2. Más importante: Wunder et al. mide el tiempo de **puntuar** una vulnerabilidad construyendo su
   vector CVSS. Ni el analista manual contrafáctico ni este pipeline hacen eso — ambos **consumen**
   un puntaje ya publicado. Es una tarea distinta de la que se está sustituyendo.

Recalcular sobre las 54 evaluaciones únicas, reencuadrar como "consulta y verificación de un
puntaje publicado" (no "puntuación"), presentar como **rango** (piso/techo) en vez de múltiplo
puntual. La conclusión cualitativa ("reducción de al menos un orden de magnitud") sobrevive.
Además: cifra de Ponemon (56% de profesionales...) sin cita — referenciar con título/año/URL o
retirarla.

### 5 — A-05: H3 sobreextendida
H3 dice "n8n constituye una alternativa viable y suficientemente robusta a las plataformas SOAR
comerciales" y el cap. 14 la da por confirmada — pero Discusión y Conclusiones dicen, correctamente,
que **no se evaluó ninguna plataforma SOAR comercial**. Reformular a lo que sí se operacionalizó:
> "n8n es suficientemente robusto para orquestar un pipeline de gestión de vulnerabilidades de
> complejidad media en un entorno de laboratorio, según los cuatro criterios de aceptación de la
> Tabla 6.1."
Comparación con plataformas comerciales → trabajo futuro. Actualizar Tabla 6.2, Figura 6.1 y
contrastación cap. 14 en consecuencia.

### 6 — A-06 + B-07/B-08: diálogo con el propio dictamen
Al menos 15 referencias explícitas a la auditoría previa en el texto entregado: "fix C-06 del
dictamen" (Tabla A.1), "Fix directo de C-07 y C-08 del dictamen" (Anexo B.7), "lo que criticó el
dictamen de la tesis original" (B.4), "nunca implementado en la tesis anterior" (código nodo 24),
pie Figura 12.2 "ausente en la implementacion auditada". Depurar todas — **conservando la
justificación técnica**, pero enunciada por su propia razón, no por referencia al dictamen. Ejemplo
del propio tribunal: no "fix C-06 del dictamen", sino "el nodo Execute Command no propaga campos de
entrada, por lo que el identificador se recupera por nombre de nodo".
También B-07 (jerga interna: "Fase 2d", nombre de runbook, "el usuario") y B-08 (Anexo B.7 titulado
"nodo 24" pero con comentario de código `// Nodo 8`; nombres n8n por defecto sin renombrar en el
lienzo).

### 7 — M-01 a M-04: bibliografía
- M-01: el pasaje sobre adopción de n8n en producción (caso Vodafone) cita [19] (Wunder et al. —
  es sobre CVSS, no sobre esto) cuando la referencia correcta es **[14]**, según la propia Tabla 7.2.
- M-02: [18] Moreno — año erróneo. Correcto: *Innovación y Software*, vol. 6, núm. 2, pp. 58-73,
  **30/09/2025** (no 2026). Corregir en la referencia, Tabla 7.2 y ventana temporal del pie de
  Figura 7.1. Agregar afiliación del autor (Universidad del CEMA, Argentina — refuerza literatura
  regional).
- M-03: ninguna de las 11 fuentes web declara fecha de consulta (obligatoria IEEE/APA); [16] y
  [17] sin año; [16] atribuido a "AIMultiple Research" cuando la página acredita autores
  nominados; [19] sin rango de páginas (pp. 1102-1121). Declarar explícitamente la norma de
  citación adoptada.
- M-04: la premisa de que n8n queda fuera de la definición OSI se apoya en [16] (comparativa
  comercial que hoy lista a n8n como SOAR "de código abierto"). Sostener con fuente primaria: la
  Sustainable Use License de n8n + definición de la Open Source Initiative.

### 8 — M-09 + B-05: legibilidad gráfica
Figura 11.2 (lienzo de 27 nodos) ilegible a tamaño de impresión — ningún rótulo se lee. Figuras
12.2 y 13.2 en el límite. Son las figuras que acreditan el artefacto. Rehacer a página completa,
apaisada, o partida en los 3 bloques funcionales del Anexo A. Índices de tablas/figuras: agregar
títulos (hoy solo número) e incluir Tablas A.1-A.3 y Figuras B.5, B.6, B.9 del anexo (ya numeradas
en el cuerpo pero ausentes del índice).

### 9 — M-10, M-12 a M-15: capítulo 12/8 y portada
- Numerar secciones del cap. 12 (como ya hace el 13); reparar referencias cruzadas rotas (Tabla
  14.1 y 6.1 remiten a "cap. 12.4/12.5/12.6" que no existen numeradas; cap. 8 remite a un
  "capítulo de Desarrollo" inexistente con ese nombre).
- Nombrar las 2 variables de entorno que habilitan módulos en los nodos Code, y la identidad real
  del `port_list` UUID de `create_target` (relevante para interpretar cobertura de los 97
  registros vs. alcance de Nmap).
- Residuo "código abierto" en contrastación de H4 cap. 14 → reemplazar por "herramientas gratuitas
  o de código disponible" (la formulación que ya usa H4 en cap. 6).
- Documentar a qué puntaje (CVSS v2 o v3) corresponde el `severity_score` persistido — el nodo 20
  guarda el `<severity>` genérico de GMP sin que el texto aclare la equivalencia.
- Portada: falta carrera (Tecnicatura Universitaria en Programación) y título al que se aspira.
  Fecha (31/08/2026) es posterior a los últimos datos incorporados (24/08/2026) — ajustar a la
  fecha real de entrega.

### 10 — B-01 a B-04, B-06, B-09: pasada final de edición
- **Refuerzos evidenciales sobreabundantes** (el defecto de estilo que reemplazó al periodístico
  de julio): "de forma + adjetivo" ×102, "real/es" ×149, "explícito/a/mente" ×49,
  "deliberado/a/mente" ×19, "este trabajo" como sujeto ×191 (≈1 cada 113 palabras), cierre "X, no
  Y" repetido en todos los capítulos. El tribunal estima que una pasada dedicada reduciría el
  documento 8-12% sin perder afirmaciones sustantivas.
- Erratas puntuales: "IIdentificar" (cap. 2), "a conexión con PostgreSQL"→"La conexión" (cap. 12),
  falta coma en cap. 3.
- Espaciado: espacio antes del punto final (≥5 pasajes), falta espacio tras punto en 2 pasajes.
- B-04: pasaje roto en Discusión — inciso sin cerrar, oración siguiente sin sujeto recuperable
  ("La redacción manual del informe —tarea que este trabajo no pudo cuantificar con una fuente
  verificable. Sí la señalan como significativa informes de industria..."). Reescribir completo.
- Figuras 12.2/13.2: "--" en vez de raya, pérdida de acentuación ("verificacion", "implementacion").
- Tablas sin "elaboración propia"/fuente en el pie (unificar criterio, ya lo hacen Tabla 1.1 y 11.1).
- Espacios en blanco de ~media página tras figuras (p. ej. p. 47); pie de Figura 11.1 separado de
  su figura por salto de página.

---

## Preguntas de defensa oral que el dictamen anticipa (sección 8)

Las 9 preguntas de julio ya tienen respuesta documentada. El tribunal agrega 5 nuevas, todas
mapeadas 1:1 a los hallazgos Altos de arriba — vale la pena que ambos autores puedan responderlas
de memoria antes de la defensa:

1. "El Objetivo 3 dice que crean el objetivo de GVM para el host descubierto por Nmap. Pero el
   nodo 9 tiene la IP fija. ¿Cuál de las dos cosas es cierta?" → resolver A-01.
2. "Ustedes corrigieron `finding_count` con un UPDATE que lo iguala al conteo de filas, y después
   validan comparando esas dos columnas. ¿Qué prueba esa comparación?" → resolver A-02 (la que el
   tribunal considera más probable en el estrado).
3. "¿GVM reportó 97 hallazgos o 94 resultados? ¿Y los 3 de Nmap por qué cuentan como hallazgos?"
   → resolver A-03.
4. "Los 5 minutos de Wunder et al. son para puntuar una vulnerabilidad con CVSS. El analista manual
   no puntúa: consulta el score publicado, igual que su pipeline. ¿Por qué multiplican por 97?"
   → resolver A-04.
5. "H3 compara con plataformas SOAR comerciales y ustedes dicen que no evaluaron ninguna. ¿Cómo la
   dan por confirmada?" → resolver A-05.

---

## Progreso

- **Condición 1 (A-01) — texto redactado, listo para pegar.** Ver mensaje del chat del
  28/08/2026. Cambia Obj. 3 (cap. 4), el párrafo antes de la Figura 8.1 (cap. 8), agrega una
  aclaración en la contrastación de H1 (cap. 14) y un ítem nuevo en Trabajos futuros (cap. 15).
- **Condición 2 (A-02) — texto redactado y verificado, listo para pegar (28/08/2026).** Entorno
  Docker/GVM de Fase 2d reactivado (volúmenes intactos); se re-consultó `get_reports` sobre los
  10 `report_id` reales (lectura, sin re-ejecutar el pipeline) y se replicó exactamente la lógica
  de expansión por CVE del nodo 20 contra esas respuestas. Resultado, idéntico en las 10 corridas:
  94 resultados de GVM (verificado también contra el `<result_count>` oficial de GVM: 79 crudos,
  57 no-Log), 97 filas persistidas (Postgres, consulta directa), 97 ítems reales contados en los
  10 archivos de informe `.md` generados el 24/08/2026 durante el propio protocolo. Distribución
  por severidad recalculada (31/20/37/6) coincide exacta con la Tabla 13.2 — buena señal de que la
  réplica de la lógica del nodo 20 es fiel. Nueva Tabla 13.3 con las tres columnas independientes,
  párrafo de sección 13.4 reescrito, `finding_count` sacado de la cadena probatoria de H2, y
  contrastación de H2 (cap. 14) reescrita en consecuencia. Ver mensaje del chat del 28/08/2026.

## Próximo paso

Seguir con las condiciones 3-10 en el mismo orden. El entorno Docker/GVM quedó levantado (útil
para condición 9: identidad del `port_list`, variables de entorno, `severity_score`).
