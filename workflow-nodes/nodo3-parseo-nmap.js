// Nodo 3 — Parseo del XML de Nmap.
// Manejo de errores real: try/catch real, parseStringPromise
// (async, no callback), encadenamiento opcional en todo acceso a campos
// que pueden no existir (evita que un host "raro" tire abajo el nodo).
// v2: agrega los timestamps reales del escaneo (tomados del propio XML
// de Nmap, no de la hora de ejecución de n8n).

const { parseStringPromise } = require('xml2js');

const results = [];

for (const item of $input.all()) {
  const rawXml = item.json.stdout;

  if (!rawXml) {
    throw new Error('El item no contiene stdout con el XML de Nmap. Verificar el nodo Execute Command anterior.');
  }

  let parsed;
  try {
    parsed = await parseStringPromise(rawXml, { explicitArray: true });
  } catch (err) {
    results.push({
      json: {
        parseError: true,
        errorMessage: err.message,
        rawXmlSnippet: rawXml.slice(0, 200),
      },
    });
    continue;
  }

  // Timestamps reales del escaneo, tomados del propio Nmap (epoch en
  // segundos -> ISO 8601 para que Postgres los acepte sin conversión).
  const startEpoch = parsed?.nmaprun?.$?.start ?? null;
  const endEpoch = parsed?.nmaprun?.runstats?.[0]?.finished?.[0]?.$?.time ?? null;
  const scanStartedAt = startEpoch ? new Date(Number(startEpoch) * 1000).toISOString() : null;
  const scanFinishedAt = endEpoch ? new Date(Number(endEpoch) * 1000).toISOString() : null;

  const hosts = parsed?.nmaprun?.host ?? [];

  for (const host of hosts) {
    const address = host?.address?.[0]?.$?.addr ?? 'unknown';
    const hostname = host?.hostnames?.[0]?.hostname?.[0]?.$?.name ?? null;
    const hostStatus = host?.status?.[0]?.$?.state ?? 'unknown';
    const ports = host?.ports?.[0]?.port ?? [];

    if (ports.length === 0) {
      results.push({
        json: {
          parseError: false,
          hostIp: address,
          hostname,
          hostStatus,
          port: null,
          protocol: null,
          serviceName: null,
          serviceProduct: null,
          serviceVersion: null,
          scanStartedAt,
          scanFinishedAt,
        },
      });
      continue;
    }

    for (const port of ports) {
      const service = port?.service?.[0]?.$ ?? {};
      results.push({
        json: {
          parseError: false,
          hostIp: address,
          hostname,
          hostStatus,
          port: port?.$?.portid ?? null,
          protocol: port?.$?.protocol ?? null,
          portState: port?.state?.[0]?.$?.state ?? 'unknown',
          serviceName: service.name ?? null,
          serviceProduct: service.product ?? null,
          serviceVersion: service.version ?? null,
          serviceExtraInfo: service.extrainfo ?? null,
          scanStartedAt,
          scanFinishedAt,
        },
      });
    }
  }
}

return results;
