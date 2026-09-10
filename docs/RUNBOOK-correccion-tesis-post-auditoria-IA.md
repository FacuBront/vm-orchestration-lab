# Runbook — Pulido final de la tesis (post-auditoría de corrección)

**Contexto:** el 31/07/2026 el tribunal emitió un dictamen de auditoría integral sobre
`TESIS_DÚO_APACHE.pdf` con nota **3,9/10** y veredicto "no recomendable para defensa". Facundo e
Ignacio corrigieron el documento (nueva versión: `Copia de TESIS DÚO APACHE (1).pdf`, 86 páginas,
23 imágenes embebidas). El 27/08/2026 se auditó esa versión corregida aplicando el mismo
instrumento del tribunal (6 dimensiones por capítulo + índice de escritura + verificación externa
de 3 referencias contra sus fuentes reales). Resultado: **los 15 hallazgos críticos y
prácticamente todos los 28 altos quedaron resueltos con evidencia verificable**. Nota estimada:
**≈ 8,1/10**.

Este documento lista lo que queda para subir esa nota lo más cerca posible de 10: son hallazgos
**medios**, no críticos — el trabajo ya es defendible tal como está. Nada de lo que sigue es
urgente para evitar un rechazo; todo es para maximizar la nota.

**Si sos la IA leyendo esto:** no inventes contenido que no puedas verificar contra el propio
texto de la tesis o contra una fuente externa real — es la causa raíz de por qué existió el
primer dictamen. Los borradores de texto que este documento provee (resumen, abstract, lista de
acrónimos) están redactados a partir de una lectura completa de la tesis corregida; **igual
pedile a Facundo o Ignacio que los revisen antes de pegarlos**, porque una IA no debe ser la
única que valida contenido que después se defiende oralmente.

**Si sos Facundo o Ignacio:** los ítems 1 a 3 son mecánicos y rápidos (podés hacerlos vos mismo en
un rato, con los borradores ya escritos más abajo). El ítem 4 (concisión) es el único que pide
trabajo de edición real, capítulo por capítulo — dejalo para el final y repartilo entre los dos.

---

## Orden de prioridad

| # | Acción | Qué mejora | Esfuerzo | Sección |
|---|---|---|---|---|
| 1 | Completar portada + agregar Resumen/Abstract + palabras clave + lista de acrónimos + índice de tablas y figuras | Elimina el bloque completo de hallazgos MEDIOS de "Elementos preliminares" | ~1-2 horas (borradores listos abajo) | §1 |
| 2 | Agregar declaración de uso de herramientas de IA | Integridad académica — exigible en la mayoría de los reglamentos vigentes | ~30 min (ustedes deciden el texto real) | §2 |
| 3 | Corregir el DOI de la referencia [19] (Wunder et al.) | Precisión bibliográfica menor | 5 min | §3 |
| 4 | Pasada de concisión oración por oración | Es la única dimensión que **no mejoró** respecto de la versión auditada por el tribunal (37,7 → ~42-46 palabras/oración) | 1-2 semanas, repartido por capítulo | §4 |

---

## 1. Elementos preliminares

El dictamen original señaló como hallazgo MEDIO: *"Portada sin fecha, carrera, título al que se
aspira ni ciudad; índice sin números de página; sin resumen ni abstract; sin palabras clave; sin
índice de tablas y figuras; sin lista de acrónimos."* Nada de esto se agregó en la corrección.
Van los cuatro bloques listos para adaptar y pegar.

### 1.a. Portada

Agregar, además de lo que ya tiene (título, autores, directores):

- Ciudad: Mendoza, Argentina (o la que corresponda formalmente)
- Fecha de presentación
- Carrera / título al que se aspira: Tecnicatura Universitaria en Programación (o el nombre
  exacto que use su plan de estudios) — la tesis lo menciona en el cap. 1 ("Tecnicatura
  Universitaria en Programación de la UTN Facultad Regional Mendoza"), así que usar esa misma
  denominación.
- UTN — Facultad Regional Mendoza (si no está ya en el logo/encabezado)

### 1.b. Resumen y Abstract

Borrador basado en la lectura completa del documento corregido. Revisen cifras y ajusten tono
antes de pegar — es un punto de partida, no el texto final.

**Resumen**

> La gestión de vulnerabilidades (Vulnerability Management, VM), ejecutada de forma manual, es
> intensiva en tiempo humano, y las plataformas comerciales que la automatizan de forma integral
> superan el presupuesto de instituciones educativas y organizaciones de pequeña escala. Este
> trabajo diseña, implementa y valida un pipeline de automatización que orquesta, mediante n8n,
> el descubrimiento de activos con Nmap y la evaluación de vulnerabilidades con GVM/Greenbone,
> con persistencia estructurada de resultados en PostgreSQL, desplegado en su totalidad mediante
> contenedores Docker sobre un laboratorio de red aislado. El sistema se valida mediante un
> protocolo de diez ejecuciones consecutivas contra un objetivo con vulnerabilidades reales y
> conocidas, con verificación directa de cada resultado contra la base de datos y contra el
> informe técnico generado, sin truncamiento. Los resultados muestran una tasa de ejecución
> exitosa de 10/10, correspondencia exacta entre los 97 hallazgos reportados por GVM y los
> registros persistidos en las diez corridas, y una reducción estimada de al menos 36 veces
> frente al tiempo manual equivalente. El hallazgo de mayor valor de transferencia es que la
> barrera de entrada real de esta arquitectura no reside en el orquestador —n8n no presentó
> dificultades de instalación— sino en el motor de evaluación de vulnerabilidades, cuya puesta a
> punto insumió un tiempo y una complejidad no triviales. El trabajo confirma sus cuatro
> hipótesis dentro del alcance explícitamente delimitado de un único objetivo y una única sesión
> de laboratorio, y documenta con la misma precisión lo que no llegó a demostrar: el valor
> pedagógico del sistema y la capacidad de análisis histórico del esquema de datos, ambos
> declarados como líneas de trabajo futuro.

**Abstract**

> Vulnerability management (VM), when performed manually, is time-intensive, and the commercial
> platforms that automate it end-to-end exceed the budget of educational institutions and
> small-scale organizations. This work designs, implements, and validates an automation pipeline
> that orchestrates, through n8n, asset discovery with Nmap and vulnerability assessment with
> GVM/Greenbone, with structured result persistence in PostgreSQL, deployed entirely through
> Docker containers on an isolated network lab. The system is validated through a protocol of ten
> consecutive executions against a target with real, known vulnerabilities, with direct
> verification of each result against the database and the generated technical report, without
> truncation. Results show a 10/10 successful execution rate, an exact match between the 97
> findings reported by GVM and the records persisted across the ten runs, and an estimated
> reduction of at least 36-fold versus the equivalent manual effort. The finding with the
> greatest transfer value is that the real entry barrier of this architecture does not lie in the
> orchestrator — n8n presented no installation difficulties — but in the vulnerability assessment
> engine, whose setup required non-trivial time and complexity. The work confirms its four
> hypotheses within the explicitly delimited scope of a single target and a single lab session,
> and documents with the same precision what it did not demonstrate: the system's pedagogical
> value and the historical-analysis capability of the data schema, both declared as future work.

### 1.c. Palabras clave

**Español:** gestión de vulnerabilidades; orquestación de seguridad; n8n; GVM/Greenbone;
automatización; contenedores Docker; SOAR-lite; laboratorio académico

**English:** vulnerability management; security orchestration; n8n; GVM/Greenbone; automation;
Docker containers; SOAR-lite; academic lab

### 1.d. Lista de acrónimos

Compilada revisando los términos que efectivamente usa el documento (agreguen los que falten si
encuentran otros al repasar):

| Sigla | Significado |
|---|---|
| VM | Vulnerability Management (Gestión de Vulnerabilidades) |
| GMP | Greenbone Management Protocol |
| OMP | OpenVAS Management Protocol (denominación histórica, obsoleta) |
| GVM | Greenbone Vulnerability Management |
| NVT | Network Vulnerability Test |
| CVSS | Common Vulnerability Scoring System |
| CVE | Common Vulnerabilities and Exposures |
| SOAR | Security Orchestration, Automation and Response |
| SIEM | Security Information and Event Management |
| GSA | Greenbone Security Assistant |
| GSAD | Greenbone Security Assistant Daemon |
| NIST | National Institute of Standards and Technology |
| TCO | Total Cost of Ownership (Costo Total de Propiedad) |
| QoD | Quality of Detection |
| NSE | Nmap Scripting Engine |
| DOI | Digital Object Identifier |
| API | Application Programming Interface |
| REST | Representational State Transfer |
| XML | Extensible Markup Language |
| JSON | JavaScript Object Notation |
| SQL | Structured Query Language |
| TLS | Transport Layer Security |
| IP | Internet Protocol |
| UUID | Universally Unique Identifier |
| EOL | End of Life (fin de soporte) |

### 1.e. Índice de tablas y figuras

Ya no hace falta redactar nada nuevo: las tablas y figuras del documento corregido **ya están
numeradas y tituladas** (Tabla 1.1, Figura 1.1, Tabla 13.3, etc. — esto era exactamente lo que
faltaba en la versión auditada por el tribunal, A-20 del dictamen). Solo falta compilar esa
numeración ya existente en dos índices al inicio del documento, con su número de página. Si
escriben en Word/Google Docs con estilos de título para "Tabla X.X" y "Figura X.X", esto se
genera automáticamente; si no, es una tarea de 15-20 minutos de transcripción manual.

---

## 2. Declaración de uso de herramientas de inteligencia artificial

El dictamen original señaló esta ausencia como hallazgo MEDIO, y sigue ausente en la versión
corregida. Dado el volumen de trabajo de diagnóstico, redacción y verificación documentado en
este mismo repositorio (commits, runbooks, notas de nodos con fecha y hallazgo real), es un punto
que un tribunal puede preguntar directamente en la defensa — mejor tenerlo declarado con
precisión que dejarlo para que lo pregunten.

No les escribo el texto final porque **solo ustedes saben con precisión qué tareas delegaron y
cuáles no** — pero les dejo la estructura que suelen pedir estos reglamentos, para que la
completen con su propia experiencia real:

> Durante el desarrollo de este trabajo se utilizaron herramientas de inteligencia artificial
> generativa (**[nombrar cuáles: p. ej. Claude Code, ChatGPT, GitHub Copilot, etc.]**) para
> **[tareas concretas: asistencia en la escritura de código, depuración de errores de
> integración, redacción y edición de prosa, verificación de referencias bibliográficas, etc.]**.
> Los autores revisaron, ejecutaron y verificaron contra evidencia real cada resultado producido
> con asistencia de estas herramientas antes de incorporarlo al documento final, y asumen la
> responsabilidad íntegra sobre el contenido técnico, las decisiones de diseño, la interpretación
> de los resultados y las conclusiones de este trabajo.

Ubicación sugerida: como sección final de Consideraciones Éticas (cap. 16) o como nota
metodológica breve en la Introducción — ambas ubicaciones son razonables.

---

## 3. Corrección menor de referencia

En la Discusión (cap. 14) se cita **Wunder, Kurtz, Eichenmüller, Gassmann y Benenson,
"Shedding Light on CVSS Scoring Inconsistencies..."** (IEEE S&P 2024) con
DOI `10.5281/zenodo.8163826`. Verifiqué el paper contra fuentes reales: existe, la autoría es
correcta, y el hallazgo que citan (mediana de 5 minutos por evaluación CVSS sobre 196
evaluadores) es real — pero ese DOI corresponde al **dataset del estudio en Zenodo**, no al paper
en sí. El paper real está indexado en IEEE Xplore como el documento `10646847`
(https://ieeexplore.ieee.org/document/10646847) y también como preprint verificado en arXiv
(`arXiv:2308.15259`, https://arxiv.org/abs/2308.15259).

Acción: entrar a la página de IEEE Xplore, copiar el DOI real que figura ahí (formato
`10.1109/SP54263.2024...`, pero cópienlo textual de la fuente — no lo inventé porque sería
exactamente el mismo error que corrigió toda esta auditoría) y reemplazar el DOI en la
referencia [19]. Alternativa más simple: citar el DOI del preprint de arXiv, que es estable y
verificable en un clic (`10.48550/arXiv.2308.15259`).

---

## 4. Pasada de concisión (la única dimensión que empeoró)

Corrí un análisis aproximado de longitud de oración sobre el cuerpo del documento corregido
(capítulos 1 a 16, excluyendo referencias y anexos con código): la media pasó de **37,7 palabras
por oración** en la versión auditada a **≈ 42-46** en la corregida, y la proporción de oraciones
de más de 40 palabras subió de 35,1% a **≈ 50%**. Es un efecto secundario real del mismo esfuerzo
de precisión que resolvió los 15 hallazgos críticos: cada aclaración de alcance, cada fuente
citada entre rayas, cada excepción declarada suma palabras a la misma oración en vez de abrir una
nueva. El resultado es más honesto, pero más largo de leer.

### Técnica concreta

Regla simple: **una idea completa por oración**. Cuando una raya larga (—...—) introduce un
inciso que tiene sujeto y verbo propios (no solo una aclaración de una palabra), esa raya suele
poder convertirse en punto y oración nueva sin perder nada.

**Ejemplo real del cap. 1 (47 palabras, 1 oración):**

> "El principio metodológico que sostiene a este trabajo de punta a punta, y que explica buena
> parte de sus decisiones de diseño, es simple de enunciar y exigente de cumplir: no documentar
> ningún comportamiento del sistema que no haya sido ejecutado y verificado primero contra la
> herramienta real."

**Reescrito (2 oraciones, misma información):**

> "El principio metodológico que sostiene este trabajo de punta a punta es simple de enunciar y
> exigente de cumplir: no documentar ningún comportamiento del sistema sin haberlo ejecutado y
> verificado primero contra la herramienta real. Esta regla explica buena parte de las decisiones
> de diseño que siguen en este documento."

**Ejemplo real del cap. 1 (44 palabras, 1 oración):**

> "Automatizar las fases de identificación y evaluación de este ciclo —no necesariamente la de
> remediación, que conserva de forma deliberada un componente de decisión humana— es, en
> consecuencia, una forma directa de acortar esa ventana sin necesitar más personal dedicado a
> tareas repetitivas."

**Reescrito:**

> "Automatizar las fases de identificación y evaluación de este ciclo acorta esa ventana sin
> necesitar más personal dedicado a tareas repetitivas. La fase de remediación queda fuera de
> este trabajo: conserva, de forma deliberada, un componente de decisión humana."

### Orden sugerido (por impacto en la nota, según la tabla de calificación por capítulo)

La columna "Redacción" quedó entre 6,5 y 7,5 en casi todos los capítulos — es la dimensión más
pareja hacia abajo. Prioricen los capítulos con más peso en el promedio ponderado (metodología,
resultados, arquitectura, discusión) antes que los de peso menor (conclusiones, anexos):

1. Marco Teórico (cap. 8) — el de oraciones más largas y con más rayas anidadas.
2. Metodología y Discusión (caps. 10, 14).
3. Introducción y Justificación (caps. 1-3).
4. Resto de los capítulos, según tiempo disponible.

### Herramienta para detectar oraciones largas automáticamente

Si exportan cada capítulo a texto plano, este script marca las oraciones de más de 35 palabras
para que las revisen una por una (mismo criterio que usó el tribunal: 20-25 palabras es el rango
recomendado para prosa científica en español):

```python
import re

with open("capitulo.txt", encoding="utf-8") as f:
    texto = re.sub(r"\s+", " ", f.read())

oraciones = re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])", texto)
for o in oraciones:
    n = len(o.split())
    if n > 35:
        print(f"[{n} palabras] {o.strip()}\n")
```

No hace falta corregir cada oración marcada — el objetivo es bajar el promedio, no eliminar
todas las oraciones largas (algunas están bien justificadas). Con revisar y partir las 15-20 más
largas de cada capítulo debería alcanzar.

---

## Checklist final antes de entregar

- [ ] Portada completa (fecha, carrera, ciudad)
- [ ] Resumen + Abstract agregados y revisados
- [ ] Palabras clave agregadas
- [ ] Lista de acrónimos agregada y revisada contra el texto completo
- [ ] Índice de tablas y figuras compilado
- [ ] Declaración de uso de IA agregada, con el texto real (no el placeholder de este documento)
- [ ] DOI de la referencia [19] corregido contra IEEE Xplore o arXiv
- [ ] Pasada de concisión hecha al menos en los capítulos 8, 10 y 14
- [ ] Una relectura completa final entre los dos autores, en voz alta si es posible — las
      oraciones que cuesta leer en voz alta sin pausas son las que todavía hay que partir
