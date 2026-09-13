// Configuración de Eleventy para www.javivela.dev.
//
// Entrada: content/<lang>/…  Salida: _site/  (lo que sube a GitHub Pages).
// Los ficheros estáticos de la raíz (media/, favicons, robots.txt, CNAME…)
// se copian tal cual con addPassthroughCopy.
const yaml = require("js-yaml");

module.exports = function (eleventyConfig) {
  eleventyConfig.addDataExtension("yaml,yml", (contents) => yaml.load(contents));

  eleventyConfig.setInputDirectory("content");
  eleventyConfig.setIncludesDirectory("../_includes");
  eleventyConfig.setDataDirectory("../_data");
  eleventyConfig.setOutputDirectory("_site");

  eleventyConfig.addPassthroughCopy({
    "media": "media",
    "favicon.ico": "favicon.ico",
    "favicon.svg": "favicon.svg",
    "apple-touch-icon.png": "apple-touch-icon.png",
    "robots.txt": "robots.txt",
    "CNAME": "CNAME",
    "libros/kubernetes-101/downloads": "libros/kubernetes-101/downloads",
  });

  // routes[lang][key] = URL de esa página en ese idioma. Alimenta la nav, el
  // pie, los puentes y (fase 2) hreflang y selector de idioma.
  eleventyConfig.addCollection("routes", (api) => {
    const routes = {};
    for (const p of api.getAll()) {
      const { key, lang } = p.data;
      if (!key || !lang) continue;
      routes[lang] ||= {};
      if (routes[lang][key]) {
        throw new Error(`Dos páginas con key=${key} lang=${lang}: ${routes[lang][key]} y ${p.url}`);
      }
      routes[lang][key] = p.url;
    }
    return routes;
  });

  // Prefijo relativo hasta la raíz del sitio ("" en /, "../../" en /a/b/).
  // Las páginas enlazan con rutas relativas, no absolutas: así se puede
  // abrir el sitio desde el disco y desde cualquier carpeta.
  eleventyConfig.addFilter("relprefix", (url) => {
    const depth = url.replace(/\/[^/]*$/, "").split("/").filter(Boolean).length;
    return "../".repeat(depth);
  });

  // Enlace relativo a otra página del sitio: prefijo + URL sin la barra inicial.
  eleventyConfig.addFilter("enlace", (url, pre) => {
    if (!url) throw new Error("enlace: ruta vacía (¿key sin página en este idioma?)");
    return pre + url.replace(/^\//, "") || "./";
  });

  // Entradas de nav o pie cuya página existe en este idioma (o son externas).
  // Una key sin página todavía (traducción parcial) se omite sin romper el build.
  eleventyConfig.addFilter("existentes", (items, rutasIdioma) =>
    (items || []).filter((item) => !item.key || rutasIdioma?.[item.key]),
  );

  // JSON-LD Person + WebSite de la home. Person lleva el mismo @id en todos
  // los idiomas (es la misma persona); WebSite es uno por idioma.
  eleventyConfig.addFilter("jsonldSite", (site, lang) => {
    const person = {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${site.url}/#persona`,
      name: site.author.name,
      alternateName: site.author.alternateName,
      jobTitle: site.author.jobTitle,
      url: `${site.url}/`,
      mainEntityOfPage: `${site.url}/`,
      image: `${site.url}/media/${site.default_lang}/og-home.png`,
      knowsAbout: site.author.knowsAbout,
      knowsLanguage: site.author.knowsLanguage,
      sameAs: site.author.sameAs,
    };
    const website = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${site.url}/#sitio`,
      name: "javivela.dev",
      alternateName: site.author.name,
      url: `${site.url}/`,
      inLanguage: lang,
      publisher: { "@id": `${site.url}/#persona` },
    };
    const tag = (o) => `<script type="application/ld+json">\n${JSON.stringify(o)}\n</script>`;
    return `${tag(person)}\n${tag(website)}`;
  });

  // Versiones de una página (key) en los idiomas vivos, idioma base primero.
  // Alimenta hreflang, og:locale:alternate, el selector y el sitemap.
  eleventyConfig.addFilter("alternates", (routes, key, live) =>
    live.filter((lang) => routes[lang]?.[key]).map((lang) => ({ lang, url: routes[lang][key] })),
  );

  // x-default: la versión en el idioma base, o su home si no existe.
  eleventyConfig.addFilter("xdefault", (routes, key, base) => routes[base]?.[key] || routes[base]?.home);

  // Destino del selector de idioma: la página equivalente o, si no existe en
  // ese idioma, su home. Nunca un 404.
  eleventyConfig.addFilter("destinoIdioma", (routes, key, lang) => routes[lang]?.[key] || routes[lang]?.home);

  // Página de una colección por key e idioma (para el 404 multiidioma).
  eleventyConfig.addFilter("pagina", (coleccion, key, lang) =>
    coleccion.find((p) => p.data.key === key && p.data.lang === lang),
  );

  // JSON-LD del libro a partir de data/editions/<lang>.yaml. El orden de las
  // claves reproduce el que tenía el HTML escrito a mano.
  eleventyConfig.addFilter("jsonldBook", (ed, site, pageUrl, lang) => {
    const url = site.url + pageUrl;
    const author = {
      "@type": "Person",
      name: site.author.name,
      url: site.url + "/",
      sameAs: site.author.sameAs,
    };
    // Una edición que aún no está a la venta no declara ofertas, ASIN, ISBN
    // ni fecha: llevan PENDIENTE hasta que KDP los asigne.
    const enVenta = ed.status === "live";
    const dato = (v) => (v && v !== "PENDIENTE" ? v : undefined);
    const workExample = ed.formats.map((f) => {
      const m = f.markets[0];
      const ex = {
        "@type": "Book",
        "@id": `${url}#${f.ld_id}`,
        bookFormat: `https://schema.org/${f.ld_format}`,
        name: f.name,
        inLanguage: lang,
        bookEdition: ed.edition_label,
      };
      if (f.id === "paperback") {
        ex.numberOfPages = ed.pages;
        if (dato(ed.isbn)) ex.isbn = ed.isbn;
      }
      if (!enVenta) return ex;
      ex.identifier = { "@type": "PropertyValue", propertyID: "ASIN", value: f.asin };
      ex.offers = {
        "@type": "Offer",
        price: m.price,
        priceCurrency: m.currency,
        priceValidUntil: ed.price_valid_until,
        availability: `https://schema.org/${ed.availability}`,
        url: `https://www.${m.domain}/dp/${f.asin}`,
        seller: { "@type": "Organization", name: m.seller },
      };
      return ex;
    });
    const book = {
      "@context": "https://schema.org",
      "@type": "Book",
      name: ed.title,
      alternativeHeadline: ed.headline,
      url,
      image: `${site.url}/media/${ed.cover}`,
      inLanguage: lang,
      bookEdition: ed.edition_label,
      isbn: dato(ed.isbn),
      numberOfPages: ed.pages,
      datePublished: dato(ed.published),
      genre: ed.genre,
      about: ed.about,
      author,
      publisher: { "@type": "Person", name: site.author.name },
      description: ed.ld_description,
      workExample,
    };
    return `<script type="application/ld+json">${JSON.stringify(book)}</script>`;
  });

  return {
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
