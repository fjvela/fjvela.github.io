#!/usr/bin/env bash
# Compara la salida de Eleventy (_site/) con el sitio tal como está en la
# rama main (HTML escrito a mano). Sirve para demostrar que la migración no
# cambia lo que se sirve. Ignora líneas en blanco (-B): el HTML a mano tenía
# líneas vacías sueltas entre scripts que el layout no reproduce.
#
# Uso: scripts/compara-main.sh [rama]   (por defecto, main)
set -euo pipefail
rama="${1:-main}"
raiz="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git -C "$raiz" archive "$rama" | tar -x -C "$tmp"
# Lo que no forma parte del sitio servido.
rm -rf "$tmp"/.github "$tmp"/.gitignore "$tmp"/*.md "$tmp"/workflows

npx --prefix "$raiz" @11ty/eleventy --quiet >/dev/null

echo "== diff -r -B $rama ↔ _site (vacío = idéntico salvo líneas en blanco)"
diff -r -B "$tmp" "$raiz/_site" && echo "(sin diferencias)"
