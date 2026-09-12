#!/usr/bin/env node
// Linter de paridad entre idiomas. Se ejecuta en CI después del build y
// antes de subir _site/ a GitHub Pages. Falla (exit 1) si:
//
//  1. Una página de content/ no declara `key` o `permalink`, o dos páginas
//     del mismo idioma comparten `key`.
//  2. Una página traducida no declara `translated_from` (commit del español
//     del que viene) o su `key` no existe en el idioma base.
//  3. Un idioma con contenido no tiene i18n/<lang>.yaml, o tiene ficha del
//     libro sin data/editions/<lang>.yaml.
//  4. Un <img> de _site/ apunta a un fichero que no existe, o sus atributos
//     width/height no coinciden con el fichero real (provoca CLS).
//  5. Una página apunta a media/<otro idioma>/… (imagen del idioma equivocado).
//  6. La imagen og:image de una página no existe o no mide 1200×630.
//
// Solo comprueba lo que no se genera. hreflang, canonicals, sitemap y
// selector los produce el layout desde routes: no hace falta vigilarlos.
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(new URL(".", import.meta.url).pathname, "..");
const CONTENT = path.join(RAIZ, "content");
const SITE = path.join(RAIZ, "_site");
const IDIOMA_BASE = "es";

const errores = [];
const avisos = [];

function walk(dir, filtro, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filtro, out);
    else if (filtro(p)) out.push(p);
  }
  return out;
}

// Front matter YAML plano (clave: valor). Suficiente para key/permalink/translated_from.
function frontMatter(file) {
  const s = fs.readFileSync(file, "utf8");
  const m = s.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^([\w-]+):\s*(.*)$/);
    if (mm) fm[mm[1]] = mm[2].replace(/^"(.*)"$/, "$1");
  }
  return fm;
}

// ---- 1–3: content/ ---------------------------------------------------------
const paginas = {}; // lang -> key -> file
for (const file of walk(CONTENT, (p) => p.endsWith(".html"))) {
  const rel = path.relative(CONTENT, file);
  const lang = rel.split(path.sep)[0];
  const fm = frontMatter(file);
  if (!fm) { errores.push(`${rel}: sin front matter`); continue; }
  if (!fm.key) { errores.push(`${rel}: sin key`); continue; }
  if (!fm.permalink) errores.push(`${rel}: sin permalink`);
  paginas[lang] ||= {};
  if (paginas[lang][fm.key]) errores.push(`${rel}: key "${fm.key}" repetida en ${lang} (ya en ${paginas[lang][fm.key]})`);
  paginas[lang][fm.key] = rel;
  if (lang !== IDIOMA_BASE && !fm.translated_from) errores.push(`${rel}: sin translated_from`);
}
for (const [lang, keys] of Object.entries(paginas)) {
  if (!fs.existsSync(path.join(RAIZ, "i18n", `${lang}.yaml`))) errores.push(`falta i18n/${lang}.yaml`);
  if (keys.book && !fs.existsSync(path.join(RAIZ, "data", "editions", `${lang}.yaml`))) errores.push(`falta data/editions/${lang}.yaml`);
  if (lang === IDIOMA_BASE) continue;
  for (const key of Object.keys(keys)) {
    if (!paginas[IDIOMA_BASE]?.[key]) errores.push(`${keys[key]}: key "${key}" no existe en ${IDIOMA_BASE}`);
  }
}

// ---- 4–6: imágenes de _site/ ------------------------------------------------
function dimensiones(file) {
  const b = fs.readFileSync(file);
  if (b.subarray(1, 4).toString() === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null; // svg u otros: no se comprueba
}

if (!fs.existsSync(SITE)) {
  errores.push("no existe _site/: ejecuta el build antes del linter");
} else {
  for (const file of walk(SITE, (p) => p.endsWith(".html"))) {
    const rel = path.relative(SITE, file);
    const html = fs.readFileSync(file, "utf8");
    const lang = html.match(/<html lang="([^"]+)"/)?.[1];
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0];
      const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
      if (!src || /^(https?:)?\/\//.test(src) || src.startsWith("data:")) continue;
      const w = tag.match(/\bwidth="(\d+)"/)?.[1];
      const h = tag.match(/\bheight="(\d+)"/)?.[1];
      const abs = src.startsWith("/") ? path.join(SITE, src) : path.resolve(path.dirname(file), src);
      if (!fs.existsSync(abs)) { errores.push(`${rel}: <img src="${src}"> no existe`); continue; }
      const otro = src.match(/media\/([a-z]{2})\//)?.[1];
      if (otro && otro !== lang) errores.push(`${rel}: imagen de otro idioma (${src})`);
      if (w && h) {
        const d = dimensiones(abs);
        if (d && (String(d[0]) !== w || String(d[1]) !== h)) {
          errores.push(`${rel}: <img src="${src}"> declara ${w}×${h} y el fichero mide ${d[0]}×${d[1]}`);
        }
      }
    }
    const og = html.match(/<meta property="og:image" content="[^"]*\/media\/([^"]+)"/)?.[1];
    if (og) {
      const abs = path.join(SITE, "media", og);
      if (!fs.existsSync(abs)) errores.push(`${rel}: og:image media/${og} no existe`);
      else {
        const d = dimensiones(abs);
        if (d && (d[0] !== 1200 || d[1] !== 630)) errores.push(`${rel}: og:image media/${og} mide ${d[0]}×${d[1]}, no 1200×630`);
      }
    }
  }
}

for (const a of avisos) console.log(`aviso: ${a}`);
for (const e of errores) console.error(`error: ${e}`);
const idiomas = Object.keys(paginas).sort().join(", ");
console.log(`check-i18n: ${errores.length} errores, ${avisos.length} avisos · idiomas: ${idiomas}`);
process.exit(errores.length ? 1 : 0);
