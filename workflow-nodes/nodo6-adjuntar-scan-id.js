// Nodo 6 — Adjuntar el scan_id (generado en el Nodo 5 / "Insert Scan
// History") a cada hallazgo individual, antes de insertarlos en
// vulnerability_scans.
//
// Fix directo del hallazgo C-06 del dictamen: en la tesis anterior, un
// nodo generaba un taskId que ningún nodo posterior capturaba
// explícitamente, rompiendo la cadena de datos. Acá el ID se recupera
// por nombre de nodo (mecanismo nativo de n8n, no un objeto inventado) y
// se propaga a cada item sin pérdida.

const scanId = $('Insert Scan History').first().json.id;
const findings = $('Parsear XML Nmap').all();

if (scanId === undefined || scanId === null) {
  throw new Error('No se pudo obtener el scan_id del nodo "Insert Scan History".');
}

return findings.map((item) => ({
  json: {
    ...item.json,
    scanId,
  },
}));
