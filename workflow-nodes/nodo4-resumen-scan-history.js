// Nodo 4 — Preparar resumen para scan_history.
// Corre una sola vez sobre TODOS los items que produjo el Nodo 3 (parseo),
// y arma un único registro-resumen del escaneo completo.

const crypto = require('crypto');

const items = $input.all();

if (items.length === 0) {
  throw new Error('No hay items de entrada: el escaneo no produjo ningún resultado.');
}

// Todos los items de una misma corrida comparten los mismos timestamps de
// escaneo (vienen del mismo XML de Nmap), así que tomamos el primero.
const scanStartedAt = items[0].json.scanStartedAt;
const scanFinishedAt = items[0].json.scanFinishedAt;

// Hosts únicos detectados (por si en el futuro escaneamos un rango con
// varios hosts, no solo target1).
const uniqueHosts = new Set(items.map((i) => i.json.hostIp).filter(Boolean));

return [
  {
    json: {
      scanUuid: crypto.randomUUID(),
      targetRange: Array.from(uniqueHosts).join(', '),
      startedAt: scanStartedAt,
      finishedAt: scanFinishedAt,
      hostCount: uniqueHosts.size,
      findingCount: items.length,
    },
  },
];
