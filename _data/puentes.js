// Páginas puente (/ir/… en español, /<lang>/go/… en el resto): una por
// formato × mercado de cada edición, más las de GitHub, Substack y labs.
// Las genera content/puentes.njk. Son noindex y miden clics salientes en
// Cloudflare Web Analytics, que no tiene eventos personalizados.
const editions = require("./editions.js");
const i18n = require("./i18n.js");

const puentes = [];
for (const [lang, ed] of Object.entries(editions)) {
  const t = i18n[lang];
  if (!t) throw new Error(`data/editions/${lang}.yaml sin i18n/${lang}.yaml`);
  const base = `${t.prefix}/${t.go_prefix}/`;
  // Los puentes a Amazon solo existen cuando la edición está a la venta:
  // antes no hay ASIN (PENDIENTE) y la ficha no muestra botones de compra.
  for (const f of ed.status === "live" ? ed.formats : []) {
    for (const m of f.markets) {
      puentes.push({
        lang,
        id: `${f.slug}-${m.id}`,
        path: `${base}${f.slug}-${m.id}/`,
        url: `https://www.${m.domain}/dp/${f.asin}`,
        abriendo: t.puente.abriendo.amazon,
        volver: "book",
      });
    }
  }
  for (const p of ed.puentes || []) {
    puentes.push({
      lang,
      id: p.id,
      path: `${base}${p.id}/`,
      url: p.url,
      abriendo: t.puente.abriendo[p.abriendo],
      volver: p.volver,
    });
  }
}

module.exports = puentes;
