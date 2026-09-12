# www.javivela.dev

Sitio estático generado con [Eleventy](https://www.11ty.dev/). Un push a
`main` lo construye y lo despliega en GitHub Pages
(`.github/workflows/static.yml`); si el build o el linter fallan, no se
despliega nada.

```bash
npm ci          # una vez
make serve      # http://localhost:8080 con recarga
make check      # build + linter de paridad entre idiomas
make status     # traducciones por detrás del español
make compara    # diff de _site/ contra el HTML de main
```

## Dónde está cada cosa

```
content/<lang>/…/index.html   el cuerpo de cada página (<main>…), con front matter
content/puentes.njk           genera las páginas puente (/ir/…) desde las ediciones
content/sitemap.njk           genera sitemap.xml desde las páginas con `sitemap:`
_includes/layouts/base.njk    <head>, nav, pie, analítica: una vez para todas
_includes/partials/           nav, pie, filas de compra
_includes/css/base.css        el CSS común; <pagina>.css lo que solo usa una página
i18n/<lang>.yaml              textos de interfaz: nav, pie, puentes, botones
data/editions/<lang>.yaml     la edición del libro: ISBN, ASIN, precios, mercados, labs
_data/site.yaml               dominio, autor, redes, token de Cloudflare
media/, favicon*, robots.txt  se copian tal cual a _site/
scripts/check-i18n.mjs        linter (CI): imágenes, dimensiones, keys, traducciones
scripts/i18n-status.mjs       qué traducciones están obsoletas (translated_from)
```

## Una página

```yaml
---
key: "errata"                     # id común a todos los idiomas
permalink: "/libros/kubernetes-101/erratas/index.html"
title: "…"                        # <title>
description: "…"                  # meta description, og:description, twitter
og: { type: "article", title: "…", image: "og-erratas.png", alt: "…" }
robots: "…"                       # opcional; por defecto index, follow
css: "book"                       # opcional: añade _includes/css/book.css
sitemap: { lastmod: "2026-08-03", changefreq: "monthly", priority: "0.5" }
jsonld: |                         # JSON-LD propio de la página, tal cual
  <script type="application/ld+json">…</script>
---
<main id="contenido">
…
</main>
```

El cuerpo se procesa con Nunjucks: `{{ edition.formats[0].price_label }}`
o `{% include "partials/compra.njk" %}` funcionan dentro del HTML. Si un
día hay que escribir `{{` literal (plantillas de Helm), va entre
`{% raw %}…{% endraw %}`.

La ficha del libro no escribe precios ni ASIN: `book_jsonld: true` genera el
`Book` del JSON-LD y `partials/compra.njk` las filas de compra, ambos desde
`data/editions/<lang>.yaml`. Los puentes `/ir/kindle-es/` etc. salen del
mismo fichero: **un precio o un ASIN se cambia en un solo sitio**.

## Añadir un idioma

1. `i18n/<lang>.yaml` con `prefix: /<lang>` y `go_prefix: go`.
2. `data/editions/<lang>.yaml` con la edición de ese idioma.
3. `content/<lang>/<lang>.11tydata.json` con `{ "lang": "<lang>" }` y las
   páginas traducidas, cada una con su `permalink` y `translated_from`
   (el commit del español del que viene).
4. `make check` y `make status`.

Con `status: live` en su `i18n/<lang>.yaml`, el idioma aparece solo en el
selector (nav y pie), en los `hreflang` y `og:locale:alternate`, en el
sitemap con alternates, en el 404 (una `<section data-lang>` por idioma) y
en el banner «esta página está disponible en…», que nunca redirige. El
runbook completo, con la tabla de slugs por idioma, está en
[i18n/README.md](i18n/README.md).

Una página que solo existe en un idioma no lleva `hreflang`; por eso con el
español solo vivo la salida es la misma que antes.

## Imágenes

`media/` es neutro (portada, `icon-512.png`, fotos del libro impreso);
`media/<lang>/` lleva las OG y los diagramas de ese idioma, con los mismos
nombres en todos los idiomas para que el linter compare dimensiones.
Las rutas antiguas (`media/og-*.png`, `media/diagramas/`) se conservan hasta
el **1 de noviembre de 2026** porque LinkedIn, X y WhatsApp vuelven a pedir la
OG por su URL al compartir un enlace ya publicado; el linter avisa cuando
toca borrarlas.

## Qué cambió respecto al HTML a mano (septiembre de 2026)

`make compara` demuestra que la salida es la misma salvo, a propósito:

- El pie lleva «Bibliografía» en todas las páginas (antes solo en la ficha y el 404).
- Todas las páginas llevan el script `.js`, el de eventos y el beacon de
  Cloudflare (la bibliografía no tenía ninguno; novedades y 404 no tenían el `.js`).
- El CSS propio de una página va al final del `<style>`, no intercalado.
  Comprobado con Playwright que los estilos computados de cada elemento son
  idénticos a 1280, 700 y 400 px.
- En la ficha, la barra de compra móvil va antes del pie (es `position:fixed`).
- El `sitemap.xml` va ordenado por URL y declara el namespace `xhtml` para
  los alternates.
- Las OG y los diagramas se sirven desde `media/es/` con ids en inglés.
- El 404 envuelve su cuerpo en `<section data-lang="es">` y su script
  cambia de sección según el prefijo de la URL.
- `base.css` gana las reglas del selector de idioma y del banner.
