# Traducir una página del sitio

Instrucciones para quien traduce `content/es/…/index.html` a
`content/<lang>/…/index.html`. Vale para las cinco ediciones; lo que cambia
por idioma está en `i18n/<lang>.yaml`, `data/editions/<lang>.yaml` y en el
repo `books`: `tools/lang/glosario-<lang>.yaml` (terminología decidida para
el libro; la web usa la misma) y `tools/lang/estilo-<lang>.md` (voz y
ortotipografía). Léelos antes de empezar.

## Qué se traduce

- El **front matter**: `title`, `description`, `og.title`, `og.alt`, y los
  textos dentro de `jsonld` (`name`, `description`, `text`, `headline`…).
  `key`, `css`, `robots`, `sitemap`, `og.type`, `og.image`, `book_jsonld` y
  `preload_cover` se copian tal cual.
- Todo el **texto visible** del cuerpo, los `alt`, `aria-label`, `title=`,
  `placeholder` y el contenido de los comentarios HTML (documentan la
  página para quien la mantenga en ese idioma).
- Los textos de los **scripts** que el visitante ve (`textContent = "…"`).

## Qué no se toca

- La **estructura HTML**: mismas etiquetas, mismo orden, mismos `class`,
  `id`, `data-*`, `aria-labelledby`, `href="#…"`. `data-evento` son ids de
  analítica y son iguales en todos los idiomas. Excepción: `data-carrusel`
  es un texto que el script vuelca en un `aria-label` visible, y sí se
  traduce.
- Los **bloques de código** y los nombres del mundo del libro (`tienda`,
  `api`, `holgazan`…), igual que en el libro. Los comentarios `#` de un
  bloque sí se traducen.
- Las expresiones **Nunjucks** (`{{ … }}`, `{% … %}`): se copian tal cual.
- Los **números** que describen la edición (capítulos, laboratorios,
  módulos, preguntas) son los mismos en todas las ediciones. El número de
  **páginas**, el **ISBN**, los **ASIN**, los **precios** y la **fecha** son
  de cada edición: no se copian del español. Cuando el español los escribe a
  mano, en la traducción se sustituyen por la expresión que los lee de
  `data/editions/<lang>.yaml`: `{{ edition.pages }}`,
  `{{ edition.formats[0].price_label }}` (Kindle),
  `{{ edition.formats[1].price_label }}` (papel), `{{ edition.isbn }}`.
  Si un dato aún no existe, el YAML dice `PENDIENTE` y el linter impide
  publicar el idioma hasta que se rellene.

## Enlaces y rutas

- `permalink` en el front matter: el de la tabla de `i18n/README.md`.
- `translated_from`: el commit del fichero español que traduces
  (`git log -1 --format=%h -- content/es/…`).
- Los **enlaces relativos** del cuerpo dependen de la profundidad:
  `/en/books/kubernetes-101/` tiene un nivel más que
  `/libros/kubernetes-101/`, así que `../../` pasa a `../../../`, y la home
  `/en/` tiene un nivel más que `/`, así que `media/x.png` pasa a
  `../media/x.png` y `libros/kubernetes-101/` a `../en/books/kubernetes-101/`.
- Los enlaces a **páginas hermanas** usan el slug traducido (`erratas/` →
  `errata/`, `practica/` → `practice/`). Si una página aún no existe en el
  idioma (glosario, novedades, bibliografía en el bloque 1), el enlace va a
  la **página española** con su ruta completa; el linter falla si el
  destino no existe.
- Las **imágenes** propias del idioma van en `media/<lang>/` con el mismo
  nombre que en `media/es/` (`../../../media/en/diagrams/01-cluster-architecture.png`).
  Portada y fotos de páginas viven en `media/` y se comparten.
- Las **páginas puente** cambian de prefijo: `/ir/kindle-es/` es
  `/<lang>/go/<formato>-<mercado>/`, con los formatos y mercados de
  `data/editions/<lang>.yaml` (en inglés, `/en/go/kindle-com/`,
  `/en/go/paperback-com/`; no hay `kindle-es` ni `kindle-mx`). Las filas
  de compra no se escriben: son `{% include "partials/compra.njk" %}`.
- El curso de labs es el de la edición: `labs.iximiuz.com/courses/<labs_course>`
  del YAML, no el `kubernetes-101-1bdca3e4` español.
- Las URL absolutas del JSON-LD (`item`, `url`, `mainEntityOfPage`) son las
  del idioma: `https://www.javivela.dev/en/books/kubernetes-101/`.

## Cómo suena

- La voz del libro de esa edición (`estilo-<lang>.md`): segunda persona,
  frases cortas, sin glosas de préstamos ingleses.
- Donde el español dice «en español» como reclamo («la guía en español para
  entender Kubernetes»), la traducción **no dice «in Spanish»**: esa
  edición está en el idioma del lector, y el reclamo pasa a ser el
  contenido («the practical guide to understanding Kubernetes from
  scratch»).
- El libro en cada idioma se vende en los mercados de su YAML; las
  referencias a «Amazon.es, .com y .com.mx» siguen esa lista.

## Al terminar

```bash
make check     # enlaces, imágenes, hreflang, keys
make status    # translated_from al día
make serve     # revisar en http://localhost:8080/<lang>/
```

La revisión de calidad la hace **otra persona (u otro agente) sin el
contexto de la traducción**, con el glosario y la hoja de estilo delante:
los must/should se aplican con sustituciones exactas y las decisiones
nuevas se archivan en el glosario del repo `books`.
