#!/usr/bin/env node
// Genera las imágenes Open Graph (1200×630) de un idioma a partir de
// tools/og/og.yaml, con el mismo diseño para todos los idiomas: fondo azul
// noche con rejilla, barra azul arriba, eyebrow en monoespaciada, título,
// subtítulo y dominio abajo. La de la ficha lleva la portada de la edición.
//
// Uso:  NODE_PATH=<node_modules con playwright> node tools/og/render.mjs <lang> [tipo…]
//       (Playwright no es dependencia del sitio; vale el de cualquier otro
//        proyecto de la máquina, p. ej. ~/dev/my/imprimatur-app/app/node_modules)
// Escribe media/<lang>/og-<tipo>.png. Cambiar el diseño = cambiar este fichero.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import yaml from "js-yaml";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const RAIZ = path.resolve(new URL(".", import.meta.url).pathname, "..", "..");
const [lang, ...tipos] = process.argv.slice(2);
if (!lang) { console.error("uso: render.mjs <lang> [tipo…]"); process.exit(2); }

const og = yaml.load(fs.readFileSync(path.join(RAIZ, "tools", "og", "og.yaml"), "utf8"));
const textos = og[lang];
if (!textos) { console.error(`tools/og/og.yaml no tiene "${lang}"`); process.exit(2); }
const edicion = yaml.load(fs.readFileSync(path.join(RAIZ, "data", "editions", `${lang}.yaml`), "utf8"));
const destino = path.join(RAIZ, "media", lang);
fs.mkdirSync(destino, { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const portadaB64 = () => "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "media", edicion.cover)).toString("base64");

function html(t) {
  const conPortada = t.portada;
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Space+Grotesk:wght@400;700&display=swap">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:#0a0e1a;color:#e8ecf4;font-family:"Space Grotesk","Helvetica Neue",Arial,sans-serif;position:relative;
  background-image:linear-gradient(rgba(50,108,229,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(50,108,229,.13) 1px,transparent 1px);
  background-size:40px 40px;background-position:-1px -1px}
.barra{position:absolute;left:0;top:0;right:0;height:8px;background:#326ce5}
.eyebrow{position:absolute;left:72px;top:88px;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:#5b8ef0}
h1{position:absolute;left:72px;top:140px;margin:0;font-size:${t.tamano || 64}px;line-height:1.1;font-weight:700;color:#fff;letter-spacing:-.01em;max-width:${conPortada ? 700 : 1050}px}
.sub{position:absolute;left:72px;top:${t.subTop || 232}px;font-size:28px;line-height:1.4;color:#b8c1d4;max-width:${conPortada ? 680 : 1000}px}
.dominio{position:absolute;left:72px;bottom:68px;font-family:"JetBrains Mono",monospace;font-size:22px;color:#8b95ab}
.portada{position:absolute;right:72px;top:106px;width:290px;height:auto;border:1px solid #1e2740;border-radius:4px;box-shadow:0 24px 60px rgba(0,0,0,.6)}
</style></head><body>
<div class="barra"></div>
<div class="eyebrow">${esc(t.eyebrow)}</div>
<h1>${esc(t.titulo)}</h1>
<div class="sub">${esc(t.subtitulo || "")}</div>
<div class="dominio">www.javivela.dev</div>
${conPortada ? `<img class="portada" src="${portadaB64()}" alt="">` : ""}
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const tipo of tipos.length ? tipos : Object.keys(textos)) {
  const t = textos[tipo];
  if (!t) { console.error(`${lang}: no hay textos para "${tipo}"`); continue; }
  await page.setContent(html(t), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(destino, `og-${tipo}.png`);
  await page.screenshot({ path: out, type: "png" });
  console.log(`${path.relative(RAIZ, out)}`);
}
await browser.close();
