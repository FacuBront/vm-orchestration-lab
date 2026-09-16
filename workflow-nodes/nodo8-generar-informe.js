// Nodo 25 — Generar Informe Markdown.
//
// Recorre el 100% de las filas devueltas por la consulta a PostgreSQL, sin ningún límite
// arbitrario sobre la cantidad de resultados mostrados, e incluye el inventario de hosts
// declarado en el Objetivo Específico 6.
//
// Estado actual: GVM/Greenbone real ya está integrado (ver
// docs/resultados-10-corridas-gvm.md). Los hallazgos con cve_id,
// severity_score, severity_label, description y solution poblados son
// correlaciones reales contra CVEs conocidos (no solo reconocimiento de
// Nmap) — ver gvm-integration/hallazgo-estructura-real-get-reports.md
// para el detalle completo de cómo se construyó el parseo real. El
// código de este nodo no necesitó cambios estructurales para esto, tal
// como se planeó desde el mock: solo se ajustaron los dos detalles reales
// documentados más abajo (deduplicación de puertos, y el caso de filas de
// GVM sin service_name propio).

const findings = $input.all().map((item) => item.json);
const summary = $('Resumen Scan History').first().json;

// El campo summary.finishedAt se capturaba apenas terminaba Nmap,
// antes de que arrancara GVM — reflejaba ~6s en vez de los ~14 minutos reales.
// Se sobreescribe acá con el timestamp real, tomado después de que GVM terminó e
// insertó sus hallazgos.
const finReal = $('Actualizar Fin Real Scan History').first().json?.finished_at;
if (finReal) summary.finishedAt = finReal;

if (findings.length === 0) {
  throw new Error('No se recibieron hallazgos desde la consulta a PostgreSQL. Verificar el nodo anterior.');
}

// --- Inventario de hosts, declarado en el Objetivo Específico 6 ---
//
// HALLAZGO real (24/08/2026): con GVM insertando una fila por CADA CVE
// (varias por puerto), "ports" sin deduplicar terminaba listando el mismo
// puerto decenas de veces (ej. "80" repetido 70 veces).
// Se usa un Set para que cada puerto aparezca una sola
// vez, sin perder la cuenta real de hallazgos (que sí cuenta cada fila).
const hostMap = new Map();
for (const f of findings) {
  if (!hostMap.has(f.host_ip)) {
    hostMap.set(f.host_ip, { hostname: f.hostname, count: 0, ports: new Set() });
  }
  const entry = hostMap.get(f.host_ip);
  entry.count += 1;
  if (f.port != null) entry.ports.add(f.port);
}

let hostInventory = '| Host (IP) | Hostname | Puertos detectados | Cant. hallazgos |\n';
hostInventory += '|---|---|---|---|\n';
for (const [ip, data] of hostMap.entries()) {
  hostInventory += `| ${ip} | ${data.hostname ?? 'N/D'} | ${[...data.ports].sort((a, b) => a - b).join(', ')} | ${data.count} |\n`;
}

// --- Agrupación por severidad (si GVM ya la completó) o por servicio
// (mientras tanto, con datos de reconocimiento de Nmap) ---
const hasSeverityData = findings.some((f) => f.severity_label);

let detailSection = '';
if (hasSeverityData) {
  // Etiquetas en español, consistentes con la columna severity_label del
  // esquema (sql/init/01_schema.sql: "Crítica | Alta | Media | Baja | Ninguna").
  // Se corrigió aquí una inconsistencia real: una implementación temprana de
  // este nodo usaba etiquetas en inglés (Critical/High/Medium/Low), que nunca
  // habrían coincidido con los valores reales de severity_label persistidos
  // por GVM. El resultado habría sido que ningún hallazgo se agrupara
  // correctamente por severidad, sin ningún error visible que lo advirtiera.
  const bySeverity = { Crítica: [], Alta: [], Media: [], Baja: [], Ninguna: [] };
  for (const f of findings) {
    const label = f.severity_label ?? 'Ninguna';
    (bySeverity[label] ?? bySeverity.Ninguna).push(f);
  }
  for (const [label, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue;
    detailSection += `\n### ${label} (${items.length})\n\n`;
    for (const f of items) {
      // Las filas que vienen de GVM no tienen service_name/
      // service_version propio (solo lo captura Nmap) — se omite el
      // paréntesis en vez de mostrar el feo "— null (null)".
      const servicio = f.service_name
        ? ` — ${f.service_name}${f.service_version ? ` (${f.service_version})` : ''}`
        : '';
      const portLabel = f.port != null ? f.port : 'general';
      detailSection += `- **${f.host_ip}:${portLabel}/${f.protocol}**${servicio}\n`;
      if (f.cve_id) detailSection += `  - CVE: ${f.cve_id}\n`;
      if (f.description) detailSection += `  - Descripción: ${f.description}\n`;
      if (f.solution) detailSection += `  - Solución recomendada: ${f.solution}\n`;
    }
  }
} else {
  detailSection += `\n### Hallazgos de reconocimiento (Nmap) — pendientes de correlación con GVM\n\n`;
  detailSection += `> Estos ${findings.length} hallazgos provienen de la detección de servicios y versiones de Nmap. `;
  detailSection += `Todavía no fueron correlacionados contra una base de datos de CVE (GVM/Greenbone). `;
  detailSection += `No deben interpretarse como vulnerabilidades confirmadas.\n\n`;
  for (const f of findings) {
    detailSection += `- **${f.host_ip}:${f.port}/${f.protocol}** — ${f.service_name}: ${f.service_version}\n`;
  }
}

// --- Recomendaciones generales de remediación ---
const recommendations = [
  'Priorizar la remediación de los hallazgos de severidad Crítica y Alta con CVE conocido, confirmados por correlación real contra GVM/Greenbone.',
  'Mantener actualizado el software de cada servicio detectado a su versión estable más reciente.',
  'Restringir el acceso de red a los puertos detectados únicamente a los hosts que efectivamente lo necesiten.',
  'Repetir este escaneo de forma periódica para detectar desviaciones respecto de esta línea base.',
];

const report = `# Informe de Escaneo de Red

**ID de escaneo:** ${summary.scanUuid}
**Rango/objetivo:** ${summary.targetRange}
**Inicio:** ${summary.startedAt}
**Fin:** ${summary.finishedAt}
**Hosts analizados:** ${summary.hostCount}
**Hallazgos totales:** ${findings.length} recuperados de la base de datos

## Inventario de hosts

${hostInventory}

## Detalle de hallazgos
${detailSection}

## Recomendaciones generales

${recommendations.map((r) => `- ${r}`).join('\n')}

---
*Informe generado automáticamente. Fuente de datos: tabla \`vulnerability_scans\`, scan_id = ${findings[0].scan_id}.*
`;

return [{ json: { reportMarkdown: report, findingCount: findings.length } }];
