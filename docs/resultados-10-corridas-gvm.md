# Resultados — Protocolo de 10 corridas con GVM real (Fase 2d)

Paso 5 del runbook (`docs/RUNBOOK-fase-2d-gvm.md`). Pipeline completo (Nmap → GVM real → parseo →
PostgreSQL → informe) ejecutado 10 veces consecutivas contra `target1`, sin cambios entre
corridas. Objetivo: medir con evidencia real si el tiempo de escaneo varía entre corridas
idénticas, y si la cantidad de hallazgos se mantiene estable. La explicación de por qué se
espera esa variación está en la sección 5 del runbook.

Inicio, fin y duración corresponden al escaneo de GVM: no incluyen el resto del pipeline. Se
toman de los elementos `<scan_start>` y `<scan_end>` de cada reporte publicado en
`evidencia/reportes-gvm/`, no de `scan_history` (esa tabla no refleja con precisión el horario del
escaneo de GVM en esta versión del workflow). La duración de punta a punta se mide en la versión de
27 nodos y se documenta en el capítulo 13 de la tesis. La cadena de conteo de cada corrida
(79 → 57 → 94 → 97) está en `evidencia/gvm-diez-corridas.md`.

| # | scan_id | Inicio (scan_start) | Fin (scan_end) | Duración del escaneo de GVM | Hallazgos totales | CVE únicos | Fallos/reintentos |
|---|---------|--------|-----|-----------------|--------------------|---------| --- |
| 1 | 7 | 12:05:30 | 12:19:18 | 13m 48s | 97 | 54 | Ninguno |
| 2 | 8 | 12:19:50 | 12:33:39 | 13m 49s | 97 | 54 | Ninguno |
| 3 | 9 | 12:34:51 | 12:48:33 | 13m 42s | 97 | 54 | Ninguno |
| 4 | 10 | 12:49:41 | 13:03:29 | 13m 48s | 97 | 54 | Ninguno |
| 5 | 11 | 13:04:42 | 13:18:17 | 13m 35s | 97 | 54 | Ninguno |
| 6 | 12 | 13:21:44 | 13:35:36 | 13m 52s | 97 | 54 | Ninguno |
| 7 | 13 | 13:37:05 | 13:50:41 | 13m 36s | 97 | 54 | Ninguno |
| 8 | 14 | 13:52:05 | 14:05:53 | 13m 48s | 97 | 54 | Ninguno |
| 9 | 15 | 14:07:05 | 14:20:59 | 13m 54s | 97 | 54 | Ninguno |
| 10 | 16 | 14:22:06 | 14:36:05 | 13m 59s | 97 | 54 | Ninguno |

(Hora local, UTC−3. Todas las corridas transcurrieron sin cambio de día ni de huso.)

## Observaciones

Protocolo completo, 10/10 corridas exitosas, sin fallos ni reintentos en ninguna. Ejecutadas
consecutivas entre las 12:05 y las 14:36 del 24/08/2026, en la misma máquina, sin cambios en
`target1` entre corridas.

**Duración del escaneo de GVM (min: seg → segundos):**

| Corrida | Duración | Segundos |
|---|---|---|
| 1 | 13m 48s | 828 |
| 2 | 13m 49s | 829 |
| 3 | 13m 42s | 822 |
| 4 | 13m 48s | 828 |
| 5 | 13m 35s | 815 |
| 6 | 13m 52s | 832 |
| 7 | 13m 36s | 816 |
| 8 | 13m 48s | 828 |
| 9 | 13m 54s | 834 |
| 10 | 13m 59s | 839 |

- **Promedio:** 827,1 s ≈ **13m 47s**
- **Mínimo:** 815 s (corrida 5, 13m 35s)
- **Máximo:** 839 s (corrida 10, 13m 59s)
- **Rango de variación:** 24 s (~2,9% respecto del promedio) — confirma con evidencia real lo que
  anticipaba la sección 5 del runbook: el tiempo de un escaneo GVM real varía entre corridas
  idénticas (a diferencia de la etapa solo-Nmap, donde no había nada que medir). La variación acá
  es moderada y consistente, sin ningún outlier extremo — buena señal de estabilidad del entorno.
  (Corregido el 22/09/2026: la versión anterior de esta tabla tomaba el inicio y el fin de
  `scan_history`, que no coincide con el escaneo de GVM en esta versión del workflow. Estos valores
  vienen de `<scan_start>`/`<scan_end>` de cada reporte, ver evidencia/reportes-gvm/.)

**Contenido de los hallazgos: perfectamente estable.** Las 10 corridas devolvieron exactamente
97 filas (3 de reconocimiento Nmap + 94 de GVM) y 54 CVEs únicos, sin ninguna variación — ni un
hallazgo de más ni de menos en ninguna corrida. Esto es coherente con la naturaleza del objetivo
(`target1` no cambia entre corridas, y los chequeos de GVM contra este target son mayormente
comparación de versión contra base de CVE, no pruebas activas con resultado no determinístico) y
es evidencia de que el pipeline es reproducible de forma confiable.

**scan_id de esta corrida oficial:** 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 (consecutivos, sin
mezclar con ninguna corrida de depuración: los scan_id anteriores a 7 fueron pruebas del
desarrollo, no forman parte de este protocolo oficial y no se citan en la tesis).
