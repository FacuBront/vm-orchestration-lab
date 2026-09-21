// Nodo de parseo GVM/GMP — VERSIÓN REAL, contra una instancia real de
// GVM/Greenbone, no contra datos simulados. Corregido contra la respuesta
// real de gvmd 26.36.1 / GVM 22.7. (ver
// gvm-integration/hallazgo-estructura-real-get-reports.md para el detalle
// completo y el XML de ejemplo real).
//
// Dos diferencias reales confirmadas contra lo que asumía el mock:
//
// 1) NO existe una etiqueta <cve> limpia dentro de <nvt>. Los CVEs vienen como
//    texto libre dentro de <tags>, en la sub-parte "insight=", y un solo
//    resultado de GVM puede mencionar VARIOS CVEs (los NVT tipo "Multiple
//    Vulnerabilities" agrupan CVEs relacionados con la misma versión de
//    software). Acá se extraen con una regex sobre el texto de "insight".
//
// 2) <host> no es un elemento de solo texto: tiene contenido mixto
//    (texto + hijos <asset/> y <hostname>). Con xml2js (explicitArray: true,
//    explicitCharkey por defecto), el texto queda bajo la clave "_", no
//    directamente en r.host[0] como asumía el mock.
//
// Decisión de diseño (22/08/2026, tras verificar el comportamiento real de GVM):
// como un mismo host:puerto puede tener MUCHOS hallazgos reales de GVM (se
// vio un caso real: 42 hallazgos distintos en el puerto 80 de target1), no
// alcanza con "actualizar" la única fila que dejó Nmap para ese puerto sin
// truncar datos. Se decidió INSERTAR una fila nueva por cada CVE encontrado,
// dejando la fila original de Nmap intacta como reconocimiento base. Menos
// prolijo que 1 fila por puerto, pero consistente con el principio del repo
// de no truncar resultados.
//
// Resultados sin ningún CVE en el texto:
//   - threat === 'Log' (ruido puramente informativo, ej. banners de detección
//     de versión sin vulnerabilidad asociada): se descartan, igual que la
//     propia UI de GVM los trata como no accionables por defecto.
//   - cualquier otro threat (Low/Medium/High/Critical) sin CVE textual (ej.
//     hallazgos de configuración sin CVE asignado): se conserva UNA fila con
//     cve_id = null — es un hallazgo real, no ruido, y el esquema ya tolera
//     cve_id nulo.

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

const CVE_REGEX = /CVE-\d{4}-\d+/g;

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

function extraerHostIp(hostNode) {
  // Contenido mixto real: texto (IP) + <asset/> + <hostname>. xml2js deja el
  // texto bajo "_" cuando hay hijos. Si algún día no hubiera hijos (como
  // asumía el mock), r.host[0] sería directamente el string — se contempla
  // igual por robustez.
  if (hostNode == null) return null;
  if (typeof hostNode === 'string') return hostNode;
  return hostNode._ ?? null;
}

function extraerCves(tagsString) {
  const insight = extraerTag(tagsString, 'insight') ?? '';
  const matches = insight.match(CVE_REGEX);
  return matches ? [...new Set(matches)] : [];
}

const scanId = $('Insert Scan History').first().json.id;
if (scanId === undefined || scanId === null) {
  throw new Error('No se pudo obtener el scan_id del nodo "Insert Scan History".');
}

const results = [];

for (const item of $input.all()) {
  const rawXml = item.json.stdout;

  if (!rawXml) {
    throw new Error('El item no contiene stdout con el XML de get_reports. Verificar el nodo "GMP Get Reports" anterior.');
  }

  let parsed;
  try {
    parsed = await parseStringPromise(rawXml, { explicitArray: true });
  } catch (err) {
    throw new Error(`No se pudo parsear el XML de get_reports: ${err.message}. Fragmento: ${rawXml.slice(0, 300)}`);
  }

  const reportResults =
    parsed?.get_reports_response?.report?.[0]?.report?.[0]?.results?.[0]?.result ?? [];

  if (reportResults.length === 0) {
    // 0 hallazgos es un resultado válido (target sin vulnerabilidades
    // detectadas), no un error — no se inserta nada, se sigue el flujo.
    continue;
  }

  for (const r of reportResults) {
    const hostIp = extraerHostIp(r?.host?.[0]);
    // formato normal "80/tcp"; pero también aparece "general/tcp",
    // "general/icmp", "general/CPE-T" para hallazgos a nivel de host/SO,
    // no atados a un puerto real (ej. detección de sistema operativo).
    // Caso real (22/08/2026): Number("general") da NaN, que al
    // serializarse a JSON se convierte en null silenciosamente, y ese null
    // terminaba llegando a Postgres como el TEXTO "null" en vez de un NULL
    // real, rompiendo el INSERT en la columna entera port. Se detecta
    // explícitamente con Number.isInteger en vez de confiar en el ternario.
    const portRaw = r?.port?.[0] ?? null;
    let portNum = null;
    let protocol = null;
    if (portRaw) {
      const [portPart, protoPart] = portRaw.split('/');
      const parsedPort = Number(portPart);
      portNum = Number.isInteger(parsedPort) ? parsedPort : null;
      protocol = protoPart ?? null;
    }

    const nvt = r?.nvt?.[0] ?? {};
    const tags = nvt?.tags?.[0] ?? null;

    const threat = r?.threat?.[0] ?? 'Log';
    const severityScore = Number(r?.severity?.[0] ?? 0);
    const description = extraerTag(tags, 'summary') ?? r?.description?.[0] ?? null;
    const solution = extraerTag(tags, 'solution') ?? null;

    const baseFields = {
      hostIp,
      port: portNum,
      protocol,
      severityScore,
      severityLabel: THREAT_TO_LABEL[threat] ?? 'Ninguna',
      description,
      solution,
      scanId,
    };

    const cves = extraerCves(tags);

    if (cves.length > 0) {
      for (const cveId of cves) {
        results.push({ json: { ...baseFields, cveId } });
      }
    } else if (threat !== 'Log') {
      results.push({ json: { ...baseFields, cveId: null } });
    }
    // threat === 'Log' sin CVE: se descarta (ver comentario del encabezado).
  }
}

return results;

