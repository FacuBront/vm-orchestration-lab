# Resultados — Protocolo de 10 corridas con GVM real (Fase 2d)

Paso 5 del runbook (`docs/RUNBOOK-fase-2d-gvm.md`). Pipeline completo (Nmap → GVM real → parseo →
PostgreSQL → informe) ejecutado 10 veces consecutivas contra `target1`, sin cambios entre
corridas. Objetivo: medir con evidencia real si el tiempo de escaneo varía entre corridas
idénticas, y si la cantidad de hallazgos se mantiene estable. La explicación de por qué se
espera esa variación está en la sección 5 del runbook.

Datos crudos, tomados directamente de `scan_history` y de los timestamps reales del escaneo
GVM (no estimados ni redondeados). Inicio, fin y duración corresponden al escaneo de GVM: no
incluyen el resto del pipeline. La duración de punta a punta se mide en la versión de 27 nodos y se
documenta en el capítulo 13 de la tesis. La cadena de conteo de cada corrida (79 → 57 → 94 → 97) está
en `evidencia/gvm-diez-corridas.md`.

| # | scan_id | Inicio | Fin | Duración del escaneo de GVM | Hallazgos totales | CVE únicos | Fallos/reintentos |
|---|---------|--------|-----|-----------------|--------------------|---------| --- |
| 1 | 7 | 12:05:59 | 12:19:32 | 13m 33s | 97 | 54 | Ninguno |
| 2 | 8 | 12:20:29 | 12:33:46 | 13m 17s | 97 | 54 | Ninguno |
| 3 | 9 | 12:34:39 | 12:48:46 | 14m 7s | 97 | 54 | Ninguno |
| 4 | 10 | 12:49:35 | 13:03:38 | 14m 3s | 97 | 54 | Ninguno |
| 5 | 11 | 13:04:29 | 13:18:31 | 14m 2s | 97 | 54 | Ninguno |
| 6 | 12 | 13:21:30 | 13:35:50 | 14m 20s | 97 | 54 | Ninguno |
| 7 | 13 | 13:37:00 | 13:50:48 | 13m 48s | 97 | 54 | Ninguno |
| 8 | 14 | 13:51:54 | 14:05:58 | 14m 4s | 97 | 54 | Ninguno |
| 9 | 15 | 14:07:00 | 14:21:08 | 14m 8s | 97 | 54 | Ninguno |
| 10 | 16 | 14:21:59 | 14:36:08 | 14m 9s | 97 | 54 | Ninguno |

## Observaciones

Protocolo completo, 10/10 corridas exitosas, sin fallos ni reintentos en ninguna. Ejecutadas
consecutivas entre las 12:05 y las 14:36 del 24/08/2026, en la misma máquina, sin cambios en
`target1` entre corridas.

**Duración del escaneo de GVM (min: seg → segundos):**

| Corrida | Duración | Segundos |
|---|---|---|
| 1 | 13m 33s | 813 |
| 2 | 13m 17s | 797 |
| 3 | 14m 7s | 847 |
| 4 | 14m 3s | 843 |
| 5 | 14m 2s | 842 |
| 6 | 14m 20s | 860 |
| 7 | 13m 48s | 828 |
| 8 | 14m 4s | 844 |
| 9 | 14m 8s | 848 |
| 10 | 14m 9s | 849 |

- **Promedio:** 837,1 s ≈ **13m 57s**
- **Mínimo:** 797 s (corrida 2, 13m 17s)
- **Máximo:** 860 s (corrida 6, 14m 20s)
- **Rango de variación:** 63 s (~7,5% respecto del promedio) — confirma con evidencia real lo que
  anticipaba la sección 5 del runbook: el tiempo de un escaneo GVM real varía entre corridas
  idénticas (a diferencia de la etapa solo-Nmap, donde no había nada que medir). La variación acá
  es moderada y consistente, sin ningún outlier extremo — buena señal de estabilidad del entorno.

**Contenido de los hallazgos: perfectamente estable.** Las 10 corridas devolvieron exactamente
97 filas (3 de reconocimiento Nmap + 94 de GVM) y 54 CVEs únicos, sin ninguna variación — ni un
hallazgo de más ni de menos en ninguna corrida. Esto es coherente con la naturaleza del objetivo
(`target1` no cambia entre corridas, y los chequeos de GVM contra este target son mayormente
comparación de versión contra base de CVE, no pruebas activas con resultado no determinístico) y
es evidencia de que el pipeline es reproducible de forma confiable.

**scan_id de esta corrida oficial:** 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 (consecutivos, sin
mezclar con ninguna corrida de depuración — esas se limpiaron antes de arrancar, ver memoria de
la sesión).
