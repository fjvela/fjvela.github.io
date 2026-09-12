// Idiomas del sitio, derivados de i18n/*.yaml.
//   all:    todos los códigos (se construyen todos, también los draft)
//   live:   los que se anuncian: hreflang, selector, sitemap, banner y 404.
//           El idioma base va primero; el resto en orden alfabético.
//   banner: textos del banner «esta página está disponible en…» por idioma vivo
const i18n = require("./i18n.js");
const site = require("js-yaml").load(require("node:fs").readFileSync(require("node:path").join(__dirname, "site.yaml"), "utf8"));

const all = Object.keys(i18n).sort((a, b) => (a === site.default_lang ? -1 : b === site.default_lang ? 1 : a.localeCompare(b)));
const live = all.filter((code) => i18n[code].status === "live");
if (!live.includes(site.default_lang)) throw new Error(`i18n/${site.default_lang}.yaml debe tener status: live`);

const banner = Object.fromEntries(live.filter((c) => i18n[c].banner).map((c) => [c, i18n[c].banner]));

module.exports = { all, live, banner };
