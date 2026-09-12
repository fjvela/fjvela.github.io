// Datos comunes a todo content/. Cada página declara en su front matter
// `key` (id común a todos los idiomas) y `permalink`; `lang` lo pone el
// fichero <lang>.11tydata.json de su carpeta.
module.exports = {
  layout: "layouts/base.njk",
  eleventyComputed: {
    // t: textos de interfaz del idioma de la página; edition: su edición.
    t: (data) => (data.lang ? data.i18n[data.lang] : undefined),
    edition: (data) => (data.lang ? data.editions[data.lang] : undefined),
  },
};
