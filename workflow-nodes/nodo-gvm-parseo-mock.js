// Nodo de parseo GVM/GMP — VERSIÓN DE PREPARACIÓN CON DATOS SIMULADOS.
//
// Contexto: GVM todavía no está instalado (Fase 2d, bloqueada por RAM insuficiente
// en la notebook de desarrollo). Este nodo se construyó y probó contra
// gvm-integration/mock-get-reports-response.xml, un XML simulado pero basado en
// CVEs reales aplicables a las versiones detectadas en target1 (ver ese archivo
// para el detalle y las fuentes consultadas).
//
// Cuando GVM esté disponible: el nodo "Execute Command" anterior a este va a
// invocar `gvm-cli` de verdad en vez de `cat gvm-integration/mock-...xml`, y este
// código de parseo NO debería necesitar cambios (mismo formato de entrada
// esperado). Verificar igual contra la respuesta real la primera vez.
//
// Decisión de diseño: los hallazgos de GVM NO se insertan como filas nuevas.
// Se usan para ACTUALIZAR (UPDATE) las filas que el pipeline de Nmap ya insertó
// en vulnerability_scans (cruzando por host_ip + port), completando cve_id,
// severity_score, severity_label, description y solution. Resultado: una sola
// fila por hallazgo real, enriquecida en dos pasadas (reconocimiento -> CVE),
// no filas duplicadas. Este nodo prepara esos datos; el UPDATE en sí lo hace el
// nodo Postgres siguiente (fuera del alcance de esta preparación).

const { parseStringPromise } = require('xml2js');

// Traducción de los niveles de threat de GMP a las etiquetas en español que
// usa nuestro esquema (columna severity_label: Crítica | Alta | Media | Baja | Ninguna).
const THREAT_TO_LABEL = {
  Critical: 'Crítica',
  High: 'Alta',
  Medium: 'Media',
  Low: 'Baja',
  Log: 'Ninguna',
  Debug: 'Ninguna',
};

function extraerTag(tagsString, clave) {
  // El campo "tags" de un NVT viene como pares clave=valor separados por "|",
  // ej: "summary=...|insight=...|solution=...". Convención documentada por
  // Greenbone; no hay subelementos separados para cada una en get_reports.
  if (!tagsString) return null;
  const partes = tagsString.split('|');
  for (const parte of partes) {
    const idx = parte.indexOf('=');
    if (idx === -1) continue;
    const k = parte.slice(0, idx).trim();
    const v = parte.slice(idx + 1).trim();
    if (k === clave) return v || null;
  }
  return null;
}

const results = [];

for (const item of $input.all()) {
  const rawXml = item.json.stdout;

  if (!rawXml) {
    throw new Error('El item no contiene stdout con el XML de get_reports. Verificar el nodo Execute Command anterior.');
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

  const reportResults =
    parsed?.get_reports_response?.report?.[0]?.report?.[0]?.results?.[0]?.result ?? [];

  if (reportResults.length === 0) {
    results.push({
      json: {
        parseError: false,
        noFindings: true,
        message: 'get_reports no devolvió resultados (0 hallazgos).',
      },
    });
    continue;
  }

  for (const r of reportResults) {
    const hostIp = r?.host?.[0] ?? null;
    const portRaw = r?.port?.[0] ?? null; // formato "80/tcp"
    const [portNum, protocol] = portRaw ? portRaw.split('/') : [null, null];

    const nvt = r?.nvt?.[0] ?? {};
    const cve = nvt?.cve?.[0] ?? null;
    const tags = nvt?.tags?.[0] ?? null;

    const threat = r?.threat?.[0] ?? 'Log';
    const severityScore = Number(r?.severity?.[0] ?? 0);

    results.push({
      json: {
        parseError: false,
        hostIp,
        port: portNum ? Number(portNum) : null,
        protocol: protocol ?? null,
        cveId: cve && cve !== 'NOCVE' ? cve : null,
        severityScore,
        severityLabel: THREAT_TO_LABEL[threat] ?? 'Ninguna',
        description: extraerTag(tags, 'summary') ?? r?.description?.[0] ?? null,
        solution: extraerTag(tags, 'solution') ?? null,
      },
    });
  }
}

return results;
