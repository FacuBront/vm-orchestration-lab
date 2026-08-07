// Nodo "Adaptar Mock + Resumen" — SOLO para el workflow de preview
// "MOCK - GVM Preview". NO se usa en el workflow real ni toca PostgreSQL.
//
// Hace dos cosas en un solo paso, para simplificar el workflow de preview:
// 1. Convierte los campos camelCase que produce nodo-gvm-parseo-mock.js
//    (hostIp, cveId, severityScore...) al snake_case que espera
//    nodo8-generar-informe.js (host_ip, cve_id...), porque ese nodo fue
//    diseñado para leer filas tal cual las devuelve una consulta SQL.
// 2. Arma el objeto "summary" (scanUuid, targetRange, etc.) en memoria,
//    sin ningún INSERT real.
//
// La tabla PORT_A_SERVICIO es una comodidad SOLO para este preview: en el
// pipeline real, service_name/service_version ya vienen guardados en
// vulnerability_scans desde el paso de Nmap (no hace falta inventarlos).

const crypto = require('crypto');

const PORT_A_SERVICIO = {
  21: { service_name: 'ftp', service_version: 'vsftpd 3.0.3' },
  22: { service_name: 'ssh', service_version: 'OpenSSH 7.6p1 Ubuntu 4ubuntu0.7' },
  80: { service_name: 'http', service_version: 'Apache httpd 2.4.29 ((Ubuntu))' },
};

const itemsGvm = $input.all();

if (itemsGvm.length === 0) {
  throw new Error('No hay items de entrada: el mock de GVM no produjo ningún resultado.');
}

const findingsAdaptados = itemsGvm.map((item) => {
  const j = item.json;
  const servicio = PORT_A_SERVICIO[j.port] ?? { service_name: null, service_version: null };
  return {
    scan_id: 'MOCK-PREVIEW',
    host_ip: j.hostIp,
    hostname: 'target1',
    port: j.port,
    protocol: j.protocol,
    service_name: servicio.service_name,
    service_version: servicio.service_version,
    cve_id: j.cveId,
    severity_score: j.severityScore,
    severity_label: j.severityLabel,
    description: j.description,
    solution: j.solution,
  };
});

const uniqueHosts = new Set(findingsAdaptados.map((f) => f.host_ip).filter(Boolean));

// Guardamos el resumen y los hallazgos en el mismo item (índice 0) para que
// el siguiente nodo (una copia de nodo8-generar-informe.js) pueda leer todo
// sin depender de $('Resumen Scan History'), que no existe en este preview.
return [
  {
    json: {
      summary: {
        scanUuid: 'MOCK-PREVIEW-' + crypto.randomUUID(),
        targetRange: Array.from(uniqueHosts).join(', '),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        hostCount: uniqueHosts.size,
        findingCount: findingsAdaptados.length,
      },
      findings: findingsAdaptados,
    },
  },
];
