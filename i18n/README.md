# Añadir el idioma N

El español vive en la raíz y es el `x-default`. Cada idioma nuevo vive bajo
su prefijo con **slugs localizados** (decisión de septiembre de 2026; van
impresos en cada edición del libro, así que no se cambian):

| key | es | en | fr | it | de | pt |
|---|---|---|---|---|---|---|
| home | `/` | `/en/` | `/fr/` | `/it/` | `/de/` | `/pt/` |
| book | `/libros/kubernetes-101/` | `/en/books/kubernetes-101/` | `/fr/livres/kubernetes-101/` | `/it/libri/kubernetes-101/` | `/de/buecher/kubernetes-101/` | `/pt/livros/kubernetes-101/` |
| errata | `…/erratas/` | `…/errata/` | `…/errata/` | `…/errata/` | `…/errata/` | `…/errata/` |
| practice | `…/practica/` | `…/practice/` | `…/pratique/` | `…/pratica/` | `…/praxis/` | `…/pratica/` |
| bibliography | `…/bibliografia/` | `…/bibliography/` | `…/bibliographie/` | `…/bibliografia/` | `…/bibliographie/` | `…/bibliografia/` |
| glossary | `/kubernetes/glosario/` | `/en/kubernetes/glossary/` | `/fr/kubernetes/glossaire/` | `/it/kubernetes/glossario/` | `/de/kubernetes/glossar/` | `/pt/kubernetes/glossario/` |
| whats-new-1-37 | `/kubernetes/novedades-1-37/` | `/en/kubernetes/whats-new-1-37/` | `/fr/kubernetes/nouveautes-1-37/` | `/it/kubernetes/novita-1-37/` | `/de/kubernetes/neuerungen-1-37/` | `/pt/kubernetes/novidades-1-37/` |
| puentes | `/ir/<x>/` | `/en/go/<x>/` | `/fr/go/<x>/` | `/it/go/<x>/` | `/de/go/<x>/` | `/pt/go/<x>/` |

## Pasos

1. **`i18n/<lang>.yaml`**: copia de `es.yaml` traducido, con `prefix: /<lang>`,
   `go_prefix: go`, `locale` (`en_US`, `fr_FR`…) y **`status: draft`**.
   Draft se construye (se puede revisar en `/<lang>/`) pero no aparece en
   hreflang, selector, sitemap, banner ni 404.
2. **`data/editions/<lang>.yaml`**: la edición de ese idioma. ISBN, ASIN y
   precios cuando KDP los asigne; hasta entonces `status: preorder` y
   `availability: PreOrder`. Mercados según KDP (papel: no hay en `.com.mx`
   ni `.com.br`; ver NOTAS-PUBLICACION.md).
3. **`content/<lang>/<lang>.11tydata.json`** con `{ "lang": "<lang>" }`.
4. **Páginas**: copia de cada `content/es/…/index.html` a su ruta localizada,
   con `permalink` de la tabla y `translated_from: <commit>` (el commit en
   el que está el fichero español que traduces: `git log -1 --format=%h --
   content/es/…`). Se traduce el front matter (title, description, og, jsonld)
   y el cuerpo, con los glosarios y guías de estilo del repo `books`
   (`tools/lang/glosario-<lang>.yaml`, `estilo-<lang>.md`).
   El 404 es un fragmento: `content/<lang>/404.html` con `permalink: false`.
   **Ojo con los enlaces relativos del cuerpo**: `/en/books/kubernetes-101/`
   tiene un nivel más que `/libros/kubernetes-101/`, así que cada `../../`
   del español pasa a `../../../`, y los enlaces a páginas hermanas
   (`erratas/`, `practica/`) pasan a sus slugs traducidos. `make check`
   falla por cada enlace o imagen que no exista, así que no hace falta
   revisarlos a ojo.
5. **Imágenes** en `media/<lang>/`, **mismos nombres y mismas dimensiones**
   que en `media/es/`: `og-home.png`, `og-book.png`, `og-glossary.png`,
   `og-whats-new-1-37.png`, `og-errata.png`, `og-practice.png` (1200×630) y
   `diagrams/*.png` (los del repo `books`, ya traducidos). La portada de la
   edición va en `media/` con su propio nombre y se declara en `cover:`.
6. `make check` en verde y `make status` sin obsoletas.
7. **`status: live`** en `i18n/<lang>.yaml`. Con eso aparecen solos el
   selector en nav y pie, los `hreflang`, los `og:locale:alternate`, las
   entradas del sitemap con alternates, la sección del 404 y el banner.

## Mantener

- Cuando cambia una página española, `make status` lista qué traducciones
  están por detrás y el `git diff` que hay que aplicar. Al actualizar la
  traducción se pone el commit nuevo en `translated_from`.
- Un precio, un ASIN o un mercado se cambian en `data/editions/<lang>.yaml`.
- Una entrada nueva en la nav o el pie se añade en cada `i18n/<lang>.yaml`.
