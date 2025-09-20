#!/usr/bin/env bash
set -euo pipefail

# Usage: ./toc.sh payload.json output.xhtml

if [ $# -ne 2 ]; then
  echo "Usage: $0 <payload.json> <output.xhtml>"
  exit 1
fi

PAYLOAD_FILE="$1"
OUTPUT_FILE="$2"

# --- Detect language ---
BOOK_LANG=$(jq -r '.book.language // "en"' "$PAYLOAD_FILE")

TOC_TITLE="Table of Contents"
case "$BOOK_LANG" in
  tr) TOC_TITLE="İçindekiler" ;;
  de) TOC_TITLE="Inhaltsverzeichnis" ;;
  fr) TOC_TITLE="Table des matières" ;;
  es) TOC_TITLE="Índice" ;;
  it) TOC_TITLE="Indice" ;;
  *)  TOC_TITLE="Table of Contents" ;;
esac

# --- Determine TOC depth automatically ---
MAX_LEVEL=$(jq '[.book.chapters[].level] | max' "$PAYLOAD_FILE")
if [ "$MAX_LEVEL" -lt 1 ]; then
  MAX_LEVEL=1
fi

# --- Build hierarchical tree (recursive) ---
jq -c '.book.chapters[]' "$PAYLOAD_FILE" | \
  jq -s 'def tree(parent):
           map(select(.parent == parent)
               | . + { children: tree(.id) });
         tree(null)' \
  > "$OUTPUT_FILE.json"

generate_list() {
  local parent="$1"
  local indent="$2"
  jq -c --arg parent "$parent" '.[] | select(.parent == $parent)' "$OUTPUT_FILE.json" | \
  while read -r node; do
    local title=$(echo "$node" | jq -r '.title')
    local id=$(echo "$node" | jq -r '.id')
    local level=$(echo "$node" | jq -r '.level')
    local children=$(echo "$node" | jq -c '.children')

    # Dosya adı chapter index'e göre üretildiği için, index'i payload'dan al
    local order=$(echo "$node" | jq -r '.order')
    local filename=$(printf "chapter-%03d.xhtml" "$order")

    printf "%s<li><a href=\"%s\">%s</a>" "$indent" "$filename" "$title" >> "$OUTPUT_FILE"

    if [ "$children" != "[]" ] && [ "$level" -lt "$MAX_LEVEL" ]; then
      printf "\n%s  <ol>\n" "$indent" >> "$OUTPUT_FILE"
      echo "$children" | jq -c '.[]' | while read -r child; do
        child_title=$(echo "$child" | jq -r '.title')
        child_order=$(echo "$child" | jq -r '.order')
        child_filename=$(printf "chapter-%03d.xhtml" "$child_order")
        printf "%s    <li><a href=\"%s\">%s</a></li>\n" "$indent" "$child_filename" "$child_title" >> "$OUTPUT_FILE"
      done
      printf "%s  </ol>\n%s</li>\n" "$indent" "$indent" >> "$OUTPUT_FILE"
    else
      echo "</li>" >> "$OUTPUT_FILE"
    fi
  done
}

# --- Generate XHTML ---
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE html>'
  echo '<html xmlns="http://www.w3.org/1999/xhtml">'
  echo '<head><meta charset="utf-8"/></head>'
  echo '<body>'
  echo "  <h2 style=\"text-align:center;\">$TOC_TITLE</h2>"
  echo '  <nav id="toc" epub:type="toc">'
  echo '    <ol>'
} > "$OUTPUT_FILE"

generate_list null "      "

{
  echo '    </ol>'
  echo '  </nav>'
  echo '</body>'
  echo '</html>'
} >> "$OUTPUT_FILE"

rm -f "$OUTPUT_FILE.json"

echo "🧭 TOC page created at $OUTPUT_FILE (depth=$MAX_LEVEL)"
