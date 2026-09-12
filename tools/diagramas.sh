#!/usr/bin/env bash
# Copia a media/<lang>/diagrams/ los seis diagramas de la ficha del libro
# desde el repo `books` (kubernetes-101.<lang>/book/media/*.png, ya traducidos
# por tools/traducir_diagramas.py), reescalados a 1200 px de ancho, con los
# ids en inglés que usa el sitio. Uso: tools/diagramas.sh <lang> [ruta al repo books]
set -euo pipefail
lang="${1:?idioma}"
books="${2:-$HOME/dev/my/books}"
ed="$books/kubernetes-101"; [ "$lang" = es ] || ed="$ed.$lang"
dest="$(dirname "$0")/../media/$lang/diagrams"
mkdir -p "$dest"
while read -r origen id; do
  src="$ed/book/media/$origen.png"
  [ -f "$src" ] || { echo "falta $src" >&2; exit 1; }
  sips -s format png --resampleWidth 1200 "$src" --out "$dest/$id.png" >/dev/null
  echo "$dest/$id.png $(sips -g pixelWidth -g pixelHeight "$dest/$id.png" | awk '/pixel/{printf "%s ", $2}')"
done <<'TABLA'
01-arquitectura-del-cluster 01-cluster-architecture
15-deployment-replicaset-pods 15-deployment-replicaset-pods
24-service-tipos-enrutamiento 24-service-types-routing
38-taints-tolerations 38-taints-tolerations
42-arquitectura-observabilidad 42-observability-architecture
50-bucle-reconciliacion 50-reconciliation-loop
TABLA
