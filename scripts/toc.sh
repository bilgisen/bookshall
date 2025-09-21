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
# Calculate TOC depth based on the maximum chapter level (capped at 5)
MAX_LEVEL=$(jq -r '
  [.book.chapters[]
   | (.level | if type == "number" and . != null then .
              elif type == "string" and test("^[0-9]+$") then tonumber
              elif . == null or . == "" then 1
              else 1 end)
   | select(. >= 1)]
  | if length > 0 then max else 1 end
' "$PAYLOAD_FILE" 2>/dev/null) || MAX_LEVEL=1

# Ensure MAX_LEVEL is a valid number between 1 and 5
if ! [[ "$MAX_LEVEL" =~ ^[0-9]+$ ]] || [ -z "$MAX_LEVEL" ] || [ "$MAX_LEVEL" -lt 1 ]; then
  MAX_LEVEL=1  # Minimum 1 level
elif [ "$MAX_LEVEL" -gt 5 ]; then
  MAX_LEVEL=5  # Maximum 5 levels
fi

echo "🔍 Using TOC depth: $MAX_LEVEL (based on maximum chapter level)" >&2

# --- Prepare output file ---
# Output will be written directly later

# Debug info
if [ "${DEBUG:-false}" = "true" ]; then
  echo "TOC Generation Debug:" >&2
  echo "  MAX_LEVEL: $MAX_LEVEL" >&2
  echo "  PAYLOAD_FILE: $PAYLOAD_FILE" >&2
  echo "  OUTPUT_FILE: $OUTPUT_FILE" >&2
fi

generate_list() {
  local indent="$1"
  local prev_level=1
  local first_item=true

  # Process chapters, filtering out order=0 and levels > MAX_LEVEL in the jq query
  jq -c '.book.chapters 
        | sort_by(.order)[] 
        | {order, level: (.level // 1), title}
        | select(.order > 0 and .level <= ($ENV.MAX_LEVEL|tonumber))' "$PAYLOAD_FILE" | while read -r chapter; do
    
    # Clean title - only remove potentially problematic tags, preserve basic formatting
    local title=$(echo "$chapter" | jq -r '.title // "Untitled Chapter"' |
                 sed -e 's/<script\b[^>]*>[\s\S]*?<\/script>//g' \
                     -e 's/<style\b[^>]*>[\s\S]*?<\/style>//g' \
                     -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    local level=$(echo "$chapter" | jq -r '.level // 1')
    local order=$(echo "$chapter" | jq -r '.order')
    local filename=$(printf "ch%03d.xhtml" "$order")

    # Debug output
    if [ "${DEBUG:-false}" = "true" ]; then
      echo "Processing chapter: $title (level: $level, order: $order, file: $filename)" >&2
    fi

    # Handle list level changes
    if [ $level -gt $prev_level ]; then
      # Start new sublist
      echo "" >> "$OUTPUT_FILE"
      printf "%s<ol>\n" "$indent" >> "$OUTPUT_FILE"
      indent="  $indent"
    elif [ $level -lt $prev_level ]; then
      # Close previous levels
      for ((i=prev_level; i>level; i--)); do
        echo "</li>" >> "$OUTPUT_FILE"
        indent=${indent:2}
        printf "%s</ol>\n" "$indent" >> "$OUTPUT_FILE"
      done
      echo "</li>" >> "$OUTPUT_FILE"
    elif [ "$first_item" = false ]; then
      # Close previous item at same level
      echo "</li>" >> "$OUTPUT_FILE"
    fi

    # Add list item with link
    printf "%s<li><a href=\"%s\">%s</a>" "$indent" "$filename" "$title" >> "$OUTPUT_FILE"

    prev_level=$level
    first_item=false
  done

  # Close any remaining open tags
  for ((i=prev_level; i>=1; i--)); do
    echo "</li>" >> "$OUTPUT_FILE"
    if [ $i -gt 1 ]; then
      indent=${indent:2}
      printf "%s</ol>\n" "$indent" >> "$OUTPUT_FILE"
    fi
  done
}

# Debug: Check chapters in payload
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Debug: Chapters in payload:" >&2
  jq '.book.chapters' "$PAYLOAD_FILE" >&2
fi

# --- Generate XHTML ---
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE html>'
  echo '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
  echo '<head>'
  echo '  <meta charset="utf-8"/>'
  echo "  <title>$TOC_TITLE</title>"
  echo '  <style type="text/css">
    body { font-family: Arial, sans-serif; line-height: 1.5; }
    nav { margin: 1em 0; }
    ol { list-style-type: none; padding-left: 1em; }
    li { margin: 0.5em 0; }
    a { text-decoration: none; color: #0066cc; }
    a:hover { text-decoration: underline; }
  </style>'
  echo '</head>'
  echo '<body>'
  echo "  <h1>$TOC_TITLE</h1>"
  echo '  <nav epub:type="toc" id="toc">'
  echo '    <ol>'
  # Call generate_list with indentation
  generate_list "      "
  echo '    </ol>'
  echo '  </nav>'
  echo '</body>'
  echo '</html>'
} > "$OUTPUT_FILE"

echo "✅ TOC page created at $OUTPUT_FILE (depth=$MAX_LEVEL)"

# Debug output
if [ "${DEBUG:-false}" = "true" ]; then
  echo "=== TOC Preview ==="
  head -n 20 "$OUTPUT_FILE"
  echo "..."
  tail -n 10 "$OUTPUT_FILE"
fi
