#!/usr/bin/env node
// Linter de paridad entre idiomas. Se ejecuta en CI después del build y
// antes de subir _site/ a GitHub Pages. Falla (exit 1) si:
//
//  content/
//   1. Una página no declara `key` o `permalink`, o dos páginas del mismo
//      idioma comparten `key`.
//   2. Una página traducida no declara `translated_from` o su `key` no
//      existe en el idioma base.
//   3. Un idioma con contenido no tiene i18n/<lang>.yaml, o tiene ficha del
//      libro sin data/editions/<lang>.yaml.
//  _site/
//   4. Un <img> apunta a un fichero que no existe, o sus width/height no
//      coinciden con el fichero real (provoca CLS).
//   5. Una página apunta a media/<otro idioma>/… .
//   6. La og:image de una página no existe o no mide 1200×630.
//   7. El canonical no es la propia URL absoluta, o <html lang> y og:locale
//      no coinciden con el idioma de la carpeta.
//   8. Los hreflang no son recíprocos, falta el autorreferencial o el
//      x-default, o el x-default no apunta al idioma base.
//   9. Al 404 le falta la <section data-lang> de algún idioma vivo.
//  10. El sitemap no contiene exactamente las páginas con `sitemap:` de los
//      idiomas vivos.
//
// Avisa (sin fallar) cuando pasa la fecha de borrado de las imágenes en
// periodo de gracia (media/og-*.png y media/diagramas/, 1 nov 2026).
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const RAIZ = path.resolve(new URL(".", import.meta.url).pathname, "..");
const CONTENT = path.join(RAIZ, "content");
const SITE = path.join(RAIZ, "_site");
const site = yaml.load(fs.readFileSync(path.join(RAIZ, "_data", "site.yaml"), "utf8"));
const BASE = site.default_lang;
const GRACIA_HASTA = "2026-11-01";

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

// ---- idiomas -----------------------------------------------------------------
const i18n = {};
for (const f of fs.readdirSync(path.join(RAIZ, "i18n")).filter((f) => f.endsWith(".yaml"))) {
  i18n[path.basename(f, ".yaml")] = yaml.load(fs.readFileSync(path.join(RAIZ, "i18n", f), "utf8"));
}
const vivos = Object.keys(i18n).filter((l) => i18n[l].status === "live");
const prefijos = Object.fromEntries(Object.keys(i18n).map((l) => [l, i18n[l].prefix || ""]));
const idiomaDeRuta = (url) => Object.keys(prefijos).find((l) => prefijos[l] && (url === prefijos[l] + "/" || url.startsWith(prefijos[l] + "/"))) || BASE;

// ---- 1–3: content/ ---------------------------------------------------------
const paginas = {}; // lang -> key -> { rel, fm }
for (const file of walk(CONTENT, (p) => p.endsWith(".html"))) {
  const rel = path.relative(CONTENT, file);
  const lang = rel.split(path.sep)[0];
  const fm = frontMatter(file);
  if (!fm) { errores.push(`${rel}: sin front matter`); continue; }
  if (!fm.key) { errores.push(`${rel}: sin key`); continue; }
  if (!fm.permalink) errores.push(`${rel}: sin permalink`);
  paginas[lang] ||= {};
  if (paginas[lang][fm.key]) errores.push(`${rel}: key "${fm.key}" repetida en ${lang} (ya en ${paginas[lang][fm.key].rel})`);
  paginas[lang][fm.key] = { rel, fm };
  if (lang !== BASE && !fm.translated_from) errores.push(`${rel}: sin translated_from`);
}
for (const [lang, keys] of Object.entries(paginas)) {
  if (!i18n[lang]) errores.push(`falta i18n/${lang}.yaml`);
  const edicion = path.join(RAIZ, "data", "editions", `${lang}.yaml`);
  if (vivos.includes(lang) && fs.existsSync(edicion) && fs.readFileSync(edicion, "utf8").includes("PENDIENTE")) {
    errores.push(`data/editions/${lang}.yaml tiene datos PENDIENTE y el idioma está live`);
  }
  if (keys.book && !fs.existsSync(path.join(RAIZ, "data", "editions", `${lang}.yaml`))) errores.push(`falta data/editions/${lang}.yaml`);
  if (lang === BASE) continue;
  for (const key of Object.keys(keys)) {
    if (!paginas[BASE]?.[key]) errores.push(`${keys[key].rel}: key "${key}" no existe en ${BASE}`);
  }
}

// ---- 4–8: páginas de _site/ -------------------------------------------------
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

const urlDeFichero = (file) => "/" + path.relative(SITE, file).split(path.sep).join("/").replace(/index\.html$/, "");
const hreflangs = {}; // url -> { [hreflang]: href }

if (!fs.existsSync(SITE)) {
  errores.push("no existe _site/: ejecuta el build antes del linter");
} else {
  const htmls = walk(SITE, (p) => p.endsWith(".html"));
  for (const file of htmls) {
    const rel = path.relative(SITE, file);
    const url = urlDeFichero(file);
    const html = fs.readFileSync(file, "utf8");
    const lang = html.match(/<html lang="([^"]+)"/)?.[1];
    const esperado = idiomaDeRuta(url);
    if (lang !== esperado) errores.push(`${rel}: <html lang="${lang}"> y la ruta es de ${esperado}`);

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

    // Enlaces internos (relativos o con barra inicial): el destino tiene que
    // existir. Caza sobre todo los "../../" que se quedan cortos al copiar
    // una página a otra profundidad (/en/books/… tiene un nivel más que
    // /libros/…).
    for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"#]*)(#[^"]*)?"/g)) {
      const href = m[1];
      if (!href || /^(https?:|mailto:|tel:|data:|\/\/)/.test(href)) continue;
      const abs = href.startsWith("/") ? path.join(SITE, href) : path.resolve(path.dirname(file), href);
      const ok = fs.existsSync(abs) && (fs.statSync(abs).isFile() || fs.existsSync(path.join(abs, "index.html")));
      if (!ok) errores.push(`${rel}: <a href="${href}"> no existe`);
    }

    const og = html.match(/<meta property="og:image" content="[^"]*\/media\/([^"]+)"/)?.[1];
    if (og) {
      const abs = path.join(SITE, "media", og);
      if (!fs.existsSync(abs)) errores.push(`${rel}: og:image media/${og} no existe`);
      else {
        const d = dimensiones(abs);
        if (d && (d[0] !== 1200 || d[1] !== 630)) errores.push(`${rel}: og:image media/${og} mide ${d[0]}×${d[1]}, no 1200×630`);
      }
      const otro = og.match(/^([a-z]{2})\//)?.[1];
      if (otro && otro !== lang) errores.push(`${rel}: og:image de otro idioma (${og})`);
    }

    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    if (canonical && !/noindex/.test(html) && canonical !== site.url + url) errores.push(`${rel}: canonical ${canonical} ≠ ${site.url + url}`);
    const locale = html.match(/<meta property="og:locale" content="([^"]+)">/)?.[1];
    if (locale && i18n[lang] && locale !== i18n[lang].locale) errores.push(`${rel}: og:locale ${locale} ≠ ${i18n[lang].locale}`);

    const alts = {};
    for (const m of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)) alts[m[1]] = m[2];
    if (Object.keys(alts).length) {
      hreflangs[url] = alts;
      if (alts[lang] !== site.url + url) errores.push(`${rel}: falta el hreflang autorreferencial (${lang})`);
      if (!alts["x-default"]) errores.push(`${rel}: falta hreflang x-default`);
      else if (idiomaDeRuta(alts["x-default"].replace(site.url, "")) !== BASE) errores.push(`${rel}: x-default no apunta al idioma base (${alts["x-default"]})`);
      for (const [hl, href] of Object.entries(alts)) {
        if (hl !== "x-default" && hl !== lang && !vivos.includes(hl)) errores.push(`${rel}: hreflang ${hl} de un idioma que no está live`);
        const destino = path.join(SITE, href.replace(site.url, ""), "index.html");
        if (!href.startsWith(site.url) || !fs.existsSync(destino)) errores.push(`${rel}: hreflang ${hl} apunta a ${href}, que no existe`);
      }
    }
  }

  // 8. reciprocidad: cada destino declara exactamente el mismo conjunto.
  for (const [url, alts] of Object.entries(hreflangs)) {
    const conjunto = Object.keys(alts).filter((k) => k !== "x-default").sort().join(",");
    for (const [hl, href] of Object.entries(alts)) {
      if (hl === "x-default") continue;
      const otra = hreflangs[href.replace(site.url, "")];
      const suyo = otra ? Object.keys(otra).filter((k) => k !== "x-default").sort().join(",") : "(sin hreflang)";
      if (suyo !== conjunto) errores.push(`${url}: hreflang sin retorno desde ${href} (${conjunto} ≠ ${suyo})`);
    }
  }

  // 9. 404 con una sección por idioma vivo
  const html404 = fs.existsSync(path.join(SITE, "404.html")) ? fs.readFileSync(path.join(SITE, "404.html"), "utf8") : "";
  for (const l of vivos) {
    if (!html404.includes(`<section data-lang="${l}"`)) errores.push(`404.html: falta <section data-lang="${l}">`);
  }

  // 10. sitemap = páginas con sitemap: de los idiomas vivos
  const sitemap = fs.existsSync(path.join(SITE, "sitemap.xml")) ? fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8") : "";
  const enSitemap = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const esperadas = new Set();
  for (const [lang, keys] of Object.entries(paginas)) {
    if (!vivos.includes(lang)) continue;
    for (const { fm } of Object.values(keys)) {
      if (fm.sitemap !== undefined && fm.permalink && fm.permalink !== "false") esperadas.add(site.url + fm.permalink.replace(/index\.html$/, ""));
    }
  }
  for (const u of esperadas) if (!enSitemap.has(u)) errores.push(`sitemap.xml: falta ${u}`);
  for (const u of enSitemap) if (!esperadas.has(u)) errores.push(`sitemap.xml: sobra ${u}`);
}

// ---- periodo de gracia de las imágenes antiguas ----------------------------
if (new Date().toISOString().slice(0, 10) >= GRACIA_HASTA) {
  const viejas = [...fs.readdirSync(path.join(RAIZ, "media")).filter((f) => /^og-.*\.png$/.test(f)).map((f) => `media/${f}`)];
  if (fs.existsSync(path.join(RAIZ, "media", "diagramas"))) viejas.push("media/diagramas/");
  if (viejas.length) avisos.push(`periodo de gracia terminado (${GRACIA_HASTA}): borrar ${viejas.join(", ")}`);
}

for (const a of avisos) console.log(`aviso: ${a}`);
for (const e of errores) console.error(`error: ${e}`);
console.log(`check-i18n: ${errores.length} errores, ${avisos.length} avisos · idiomas: ${Object.keys(paginas).sort().join(", ")} · live: ${vivos.join(", ")}`);
process.exit(errores.length ? 1 : 0);
