#!/usr/bin/env node
// ¿Qué traducciones van por detrás del español?
//
// Cada página traducida declara en su front matter `translated_from: <commit>`,
// el commit en el que estaba su fuente española cuando se tradujo. Si el
// fichero español ha cambiado desde ese commit, la traducción está obsoleta
// y aquí sale con el `git diff` que hay que aplicar.
//
// Uso: node scripts/i18n-status.mjs [--strict]
//   --strict  sale con 1 si hay traducciones obsoletas (por defecto solo avisa:
//             una errata española nueva no puede esperar a cinco traducciones).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = path.resolve(new URL(".", import.meta.url).pathname, "..");
const CONTENT = path.join(RAIZ, "content");
const IDIOMA_BASE = "es";
const strict = process.argv.includes("--strict");

const git = (...args) => execFileSync("git", args, { cwd: RAIZ, encoding: "utf8" }).trim();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}
function frontMatter(file) {
  const m = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  for (const line of (m?.[1] || "").split("\n")) {
    const mm = line.match(/^([\w-]+):\s*(.*)$/);
    if (mm) fm[mm[1]] = mm[2].replace(/^"(.*)"$/, "$1");
  }
  return fm;
}

const paginas = {}; // lang -> key -> { rel, fm }
for (const file of walk(CONTENT)) {
  const rel = path.relative(RAIZ, file);
  const lang = path.relative(CONTENT, file).split(path.sep)[0];
  const fm = frontMatter(file);
  if (!fm.key) continue;
  (paginas[lang] ||= {})[fm.key] = { rel, fm };
}

const idiomas = Object.keys(paginas).filter((l) => l !== IDIOMA_BASE).sort();
if (!idiomas.length) {
  console.log(`i18n-status: solo ${IDIOMA_BASE}; no hay traducciones que comprobar.`);
  process.exit(0);
}

let obsoletas = 0;
const filas = [];
for (const lang of idiomas) {
  for (const [key, base] of Object.entries(paginas[IDIOMA_BASE])) {
    const tr = paginas[lang][key];
    if (!tr) { filas.push([lang, key, "sin traducir", ""]); continue; }
    const desde = tr.fm.translated_from;
    if (!desde) { filas.push([lang, key, "sin translated_from", tr.rel]); obsoletas++; continue; }
    let cambios;
    try {
      cambios = git("rev-list", "--count", `${desde}..HEAD`, "--", base.rel);
    } catch {
      filas.push([lang, key, `commit ${desde} desconocido`, tr.rel]); obsoletas++; continue;
    }
    if (cambios !== "0") {
      obsoletas++;
      filas.push([lang, key, `obsoleta (${cambios} commits)`, `git diff ${desde}..HEAD -- ${base.rel}`]);
    } else {
      filas.push([lang, key, "al día", ""]);
    }
  }
}

const ancho = (i) => Math.max(...filas.map((f) => f[i].length));
for (const f of filas) console.log(`${f[0].padEnd(ancho(0))}  ${f[1].padEnd(ancho(1))}  ${f[2].padEnd(ancho(2))}  ${f[3]}`);
console.log(`i18n-status: ${obsoletas} traducciones obsoletas o sin origen`);
process.exit(strict && obsoletas ? 1 : 0);
