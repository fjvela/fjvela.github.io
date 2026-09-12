# Sitio www.javivela.dev — Eleventy.
#
#   make build    genera _site/ (lo que sube a GitHub Pages)
#   make serve    build + servidor local con recarga en http://localhost:8080
#   make check    build + linter de paridad entre idiomas
#   make status   qué traducciones van por detrás del español
#   make compara  diff de _site/ contra el HTML a mano de main
#   make clean    borra _site/

.PHONY: build serve check status compara clean

build:
	npx @11ty/eleventy

serve:
	npx @11ty/eleventy --serve

check: build
	node scripts/check-i18n.mjs

status:
	node scripts/i18n-status.mjs

compara:
	scripts/compara-main.sh

clean:
	rm -rf _site
