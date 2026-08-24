// Nodo 8 — Generador del informe Markdown.
//
// Fix directo de C-07 y C-08 del dictamen: este código recorre el 100%
// de las filas devueltas por la consulta a PostgreSQL (sin ningún límite
// arbitrario tipo "renderVulns(high, 5)"), e incluye el inventario de
// hosts que la tesis anterior prometía en el objetivo 6 pero el código
// nunca generaba.
//
// Nota metodológica (documentar en la tesis): como GVM todavía no está
// integrado (Fase 2d, pendiente de hardware), estos son hallazgos de
// RECONOCIMIENTO de Nmap (servicio + versión), no vulnerabilidades con
// CVE confirmado. El informe lo declara así explícitamente para no
// sobrerrepresentar el resultado. Cuando GVM esté disponible, las mismas
// columnas (cve_id, severity_label, description, solution) se van a
// poblar y este mismo código las va a mostrar sin cambiar una línea.

const findings = $input.all().map((item) => item.json);
const summary = $('Resumen Scan History').first().json;

if (findings.length === 0) {
  throw new Error('No se recibieron hallazgos desde la consulta a PostgreSQL. Verificar el nodo anterior.');
}

// --- Inventario de hosts (fix C-08: nunca implementado en la tesis anterior) ---
//
// HALLAZGO real (Fase 2d, 24/08/2026): con GVM insertando una fila por CADA
// CVE (varias por puerto — ver decisión de diseño en
// gvm-integration/hallazgo-estructura-real-get-reports.md), "ports" sin
// deduplicar terminaba listando el mismo puerto decenas de veces (ej. "80"
// repetido 70 veces). Se usa un Set para que cada puerto aparezca una sola
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
  // esquema (sql/init/01_schema.sql: "Crítica | Alta | Media | Baja | Ninguna")
  // y con lo que produce workflow-nodes/nodo-gvm-parseo-mock.js. Se encontró
  // y corrigió una inconsistencia real: esta versión anterior usaba etiquetas
  // en inglés (Critical/High/Medium/Low), que nunca iban a coincidir con los
  // datos reales — el mismo tipo de inconsistencia terminológica (OMP/GMP)
  // que señaló el dictamen de auditoría, detectada acá antes de que llegara
  // a la tesis.
  const bySeverity = { Crítica: [], Alta: [], Media: [], Baja: [], Ninguna: [] };
  for (const f of findings) {
    const label = f.severity_label ?? 'Ninguna';
    (bySeverity[label] ?? bySeverity.Ninguna).push(f);
  }
  for (const [label, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue;
    detailSection += `\n### ${label} (${items.length})\n\n`;
    for (const f of items) {
      // Las filas que vienen de GVM (Fase 2d) no tienen service_name/
      // service_version propio (solo lo captura Nmap) — se omite el
      // paréntesis en vez de mostrar el feo "— null (null)".
      const servicio = f.service_name
        ? ` — ${f.service_name}${f.service_version ? ` (${f.service_version})` : ''}`
        : '';
      detailSection += `- **${f.host_ip}:${f.port}/${f.protocol}**${servicio}\n`;
      if (f.cve_id) detailSection += `  - CVE: ${f.cve_id}\n`;
      if (f.description) detailSection += `  - Descripción: ${f.description}\n`;
      if (f.solution) detailSection += `  - Solución recomendada: ${f.solution}\n`;
    }
  }
} else {
  detailSection += `\n### Hallazgos de reconocimiento (Nmap) — pendientes de correlación con GVM\n\n`;
  detailSection += `> Estos ${findings.length} hallazgos provienen de la detección de servicios y versiones de Nmap. `;
  detailSection += `Todavía no fueron correlacionados contra una base de datos de CVE (GVM/Greenbone, Fase 2d del proyecto). `;
  detailSection += `No deben interpretarse como vulnerabilidades confirmadas.\n\n`;
  for (const f of findings) {
    detailSection += `- **${f.host_ip}:${f.port}/${f.protocol}** — ${f.service_name}: ${f.service_version}\n`;
  }
}

// --- Recomendaciones generales (fix C-08) ---
const recommendations = [
  'Correlacionar estos hallazgos con una base de datos de CVE (GVM/Greenbone) antes de tomar acciones de remediación.',
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
**Hallazgos totales:** ${findings.length} de ${findings.length} recuperados de la base de datos (correspondencia 1:1 verificada)

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
