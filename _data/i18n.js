// Carga i18n/<lang>.yaml → { es: {...}, en: {...} }.
// Cada fichero lleva los textos de interfaz de un idioma (nav, pie, puentes…).
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const dir = path.join(__dirname, "..", "i18n");

module.exports = Object.fromEntries(
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => [path.basename(f, ".yaml"), yaml.load(fs.readFileSync(path.join(dir, f), "utf8"))]),
);
