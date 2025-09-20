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

# --- Prepare output file ---
> "$OUTPUT_FILE" # Create or clear the output file

generate_list() {
  local indent="$1"
  # Process chapters directly from the payload file
  jq -c '.book.chapters[]' "$PAYLOAD_FILE" | while read -r chapter; do
    local title=$(echo "$chapter" | jq -r '.title // "Untitled Chapter"')
    local level=$(echo "$chapter" | jq -r '.level // 1')
    local order=$(echo "$chapter" | jq -r '.order // 0')
    local filename=$(printf "chapter-%03d.xhtml" "$order")

    # Add chapter to TOC with proper indentation
    printf "%s<li><a href=\"%s\">%s</a></li>\n" "$indent" "$filename" "$title" >> "$OUTPUT_FILE"
  done
}

# --- Generate XHTML ---
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE html>'
  echo '<html xmlns="http://www.w3.org/1999/xhtml">'
  echo '<head><meta charset="utf-8"/></head>'
  echo '<body>'
  echo "  <h1>$TOC_TITLE</h1>"
  echo '  <nav epub:type="toc">'
  echo '    <ol>'
  # Call generate_list with indentation
  generate_list "      "
  echo '    </ol>'
  echo '  </nav>'
  echo '</body>'
  echo '</html>'
} > "$OUTPUT_FILE"

rm -f "$OUTPUT_FILE.json"

echo "🧭 TOC page created at $OUTPUT_FILE (depth=$MAX_LEVEL)"
