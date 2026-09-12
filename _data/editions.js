// Carga data/editions/<lang>.yaml → { es: {...}, en: {...} }.
// Una edición del libro por idioma: ISBN, ASIN, precios, mercados, labs.
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const dir = path.join(__dirname, "..", "data", "editions");

module.exports = Object.fromEntries(
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => [path.basename(f, ".yaml"), yaml.load(fs.readFileSync(path.join(dir, f), "utf8"))]),
);
