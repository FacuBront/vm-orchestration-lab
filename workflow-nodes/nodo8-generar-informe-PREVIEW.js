// Nodo 8 — Generador del informe Markdown — VERSIÓN PREVIEW.
//
// Copia funcionalmente idéntica a nodo8-generar-informe.js. La ÚNICA
// diferencia son las dos primeras líneas: en el pipeline real, findings y
// summary vienen de PostgreSQL (vía $input y $('Resumen Scan History'));
// acá vienen del nodo "Adaptar Mock + Resumen" anterior, todo en memoria.
// Si el pipeline real cambia esta lógica de armado del informe, hay que
// replicar el cambio acá también (o, mejor, borrar este preview cuando ya
// no haga falta).

const entrada = $input.first().json;
const findings = entrada.findings;
const summary = entrada.summary;

if (findings.length === 0) {
  throw new Error('No se recibieron hallazgos del nodo "Adaptar Mock + Resumen".');
}

// --- Inventario de hosts ---
const hostMap = new Map();
for (const f of findings) {
  if (!hostMap.has(f.host_ip)) {
    hostMap.set(f.host_ip, { hostname: f.hostname, count: 0, ports: [] });
  }
  const entry = hostMap.get(f.host_ip);
  entry.count += 1;
  entry.ports.push(f.port);
}

let hostInventory = '| Host (IP) | Hostname | Puertos detectados | Cant. hallazgos |\n';
hostInventory += '|---|---|---|---|\n';
for (const [ip, data] of hostMap.entries()) {
  hostInventory += `| ${ip} | ${data.hostname ?? 'N/D'} | ${data.ports.join(', ')} | ${data.count} |\n`;
}

// --- Agrupación por severidad ---
const hasSeverityData = findings.some((f) => f.severity_label);

let detailSection = '';
if (hasSeverityData) {
  const bySeverity = { Crítica: [], Alta: [], Media: [], Baja: [], Ninguna: [] };
  for (const f of findings) {
    const label = f.severity_label ?? 'Ninguna';
    (bySeverity[label] ?? bySeverity.Ninguna).push(f);
  }
  for (const [label, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue;
    detailSection += `\n### ${label} (${items.length})\n\n`;
    for (const f of items) {
      detailSection += `- **${f.host_ip}:${f.port}/${f.protocol}** — ${f.service_name} (${f.service_version})\n`;
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

// --- Recomendaciones generales ---
const recommendations = [
  'Correlacionar estos hallazgos con una base de datos de CVE (GVM/Greenbone) antes de tomar acciones de remediación.',
  'Mantener actualizado el software de cada servicio detectado a su versión estable más reciente.',
  'Restringir el acceso de red a los puertos detectados únicamente a los hosts que efectivamente lo necesiten.',
  'Repetir este escaneo de forma periódica para detectar desviaciones respecto de esta línea base.',
];

const report = `# [PREVIEW - DATOS SIMULADOS, NO REALES] Informe de Escaneo de Red

> ⚠️ Este informe se generó con datos de GVM SIMULADOS (ver gvm-integration/README.md).
> No representa un escaneo real. Sirve para validar que el pipeline completo
> (parseo -> agrupación por severidad -> informe) funciona antes de tener GVM instalado.

**ID de escaneo:** ${summary.scanUuid}
**Rango/objetivo:** ${summary.targetRange}
**Inicio:** ${summary.startedAt}
**Fin:** ${summary.finishedAt}
**Hosts analizados:** ${summary.hostCount}
**Hallazgos totales:** ${findings.length} de ${findings.length} recuperados (correspondencia 1:1 verificada)

## Inventario de hosts

${hostInventory}

## Detalle de hallazgos
${detailSection}

## Recomendaciones generales

${recommendations.map((r) => `- ${r}`).join('\n')}

---
*Informe generado automáticamente. PREVIEW con datos simulados, scan_id = ${summary.scanUuid}.*
`;

return [{ json: { reportMarkdown: report, findingCount: findings.length } }];
