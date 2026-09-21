// Nodo 6 — Adjuntar el scan_id (generado en el Nodo 5 / "Insert Scan
// History") a cada hallazgo individual, antes de insertarlos en
// vulnerability_scans.
//
// El INSERT del Nodo 5 devuelve solo el id (RETURNING id), sin los campos
// de los hallazgos. Por eso el id se recupera por nombre de nodo, y los
// hallazgos se leen del Nodo 3 ("Parsear XML Nmap"). Es un mecanismo
// nativo de n8n que no depende de que los datos "viajen solos" entre
// nodos. Así el scan_id se propaga a cada item sin pérdida.

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
