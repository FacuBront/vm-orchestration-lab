#!/usr/bin/env node
// Recalcula la cadena de conteo 79 -> 57 -> 94 sobre reportes crudos de GVM (get_reports).
//
// Ejecuta, sin modificarlo, el código real del nodo "GMP Parsear Reporte Real" del workflow
// (campo jsCode de workflow/vm-pipeline-lab-apache.json) sobre cada reporte, y cuenta de forma
// independiente los resultados del XML (total, categoría Log, accionables).
//
// Uso:
//   npm install xml2js            (el mismo módulo que el workflow habilita en n8n)
//   node evidencia/recalculo-nodo21.js <reporte.xml|reporte.xml.gz|directorio> [...]
//
// Ejemplo con los diez reportes del protocolo:
//   node evidencia/recalculo-nodo21.js evidencia/reportes-gvm
//
// Cada archivo puede contener la respuesta completa de gvm-cli, tal como la recibe el nodo.
//
// Este script lee workflow/vm-pipeline-lab-apache.json del árbol de trabajo, no de un commit
// fijo. A la fecha de evidencia/gvm-diez-corridas.md ese archivo coincide con el commit b2eeaff
// citado en el Anexo B de la tesis (sin cambios desde entonces).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { parseStringPromise } = require('xml2js');

const WORKFLOW = path.join(__dirname, '..', 'workflow', 'vm-pipeline-lab-apache.json');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function leer(archivo) {
  const buf = fs.readFileSync(archivo);
  return archivo.endsWith('.gz') ? zlib.gunzipSync(buf) : buf;
}

function codigoNodo21() {
  const wf = JSON.parse(fs.readFileSync(WORKFLOW, 'utf8'));
  const nodo = wf.nodes.find((n) => n.name === 'GMP Parsear Reporte Real');
  if (!nodo) throw new Error('No se encontró el nodo "GMP Parsear Reporte Real" en el workflow.');
  return nodo.parameters.jsCode;
}

async function resumir(archivo, ejecutarNodo) {
  const xml = leer(archivo).toString('utf8');
  const sha256 = crypto.createHash('sha256').update(xml).digest('hex');

  // Conteo independiente, sin pasar por el código del nodo.
  const doc = await parseStringPromise(xml, { explicitArray: true });
  const informe = doc.get_reports_response.report[0].report[0];
  const resultados = informe.results?.[0]?.result ?? [];
  const declarado = Number(informe.result_count?.[0]?.full?.[0]);
  const log = resultados.filter((r) => r.threat?.[0] === 'Log').length;

  // Código real del nodo 21.
  const filas = (await ejecutarNodo(xml)).map((x) => x.json).filter((j) => j && !j.parseError);
  const conCve = filas.filter((f) => f.cveId).length;
  const cveUnicos = new Set(filas.map((f) => f.cveId).filter(Boolean)).size;
  const dist = {};
  for (const f of filas) dist[f.severityLabel] = (dist[f.severityLabel] ?? 0) + 1;

  return {
    archivo: path.basename(archivo),
    sha256,
    result_count: declarado,
    resultados: resultados.length,
    log,
    accionables: resultados.length - log,
    filas_gvm: filas.length,
    con_cve: conCve,
    sin_cve: filas.length - conCve,
    cve_unicos: cveUnicos,
    distribucion: `${dist['Crítica'] ?? 0}/${dist['Alta'] ?? 0}/${dist['Media'] ?? 0}/${dist['Baja'] ?? 0}`,
  };
}

async function main() {
  const archivos = process.argv.slice(2).flatMap((a) =>
    fs.existsSync(a) && fs.statSync(a).isDirectory()
      ? fs.readdirSync(a).filter((f) => /\.xml(\.gz)?$/.test(f)).sort().map((f) => path.join(a, f))
      : [a],
  );
  if (archivos.length === 0) {
    console.error('Uso: node evidencia/recalculo-nodo21.js <reporte.xml|reporte.xml.gz> [...]');
    process.exit(1);
  }
  const fn = new AsyncFunction('$input', '$', 'require', codigoNodo21());
  const nodo21 = (stdout) =>
    fn(
      { first: () => ({ json: { stdout } }), all: () => [{ json: { stdout } }] },
      () => ({ first: () => ({ json: { id: 0 } }), all: () => [] }),
      require,
    );
  console.log(
    ['archivo', 'result_count', 'resultados', 'Log', 'accionables', 'filas_gvm', 'con_cve', 'sin_cve', 'cve_unicos', 'Crit/Alta/Media/Baja', 'sha256'].join('\t'),
  );
  for (const a of archivos) {
    const r = await resumir(a, nodo21);
    console.log(
      [r.archivo, r.result_count, r.resultados, r.log, r.accionables, r.filas_gvm, r.con_cve, r.sin_cve, r.cve_unicos, r.distribucion, r.sha256].join('\t'),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
