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
MAX_LEVEL=$(jq '[.book.chapters[].level] | max // 1' "$PAYLOAD_FILE")
if [ "$MAX_LEVEL" -lt 1 ] || [ "$MAX_LEVEL" -gt 3 ]; then
  MAX_LEVEL=2  # Default to 2 levels if invalid
fi

# --- Prepare output file ---
> "$OUTPUT_FILE" # Create or clear the output file

# Debug info
if [ "${DEBUG:-false}" = "true" ]; then
  echo "TOC Generation Debug:" >&2
  echo "  MAX_LEVEL: $MAX_LEVEL" >&2
  echo "  PAYLOAD_FILE: $PAYLOAD_FILE" >&2
  echo "  OUTPUT_FILE: $OUTPUT_FILE" >&2
fi

generate_list() {
  local indent="$1"
  # Process chapters directly from the payload file
  local prev_level=1
  
  # First, generate the TOC entries with proper nesting
  jq -c '.book.chapters | sort_by(.order)[] | select(.level <= ($ENV.MAX_LEVEL | tonumber)) | {order, level, title, id}' "$PAYLOAD_FILE" | while read -r chapter; do
    # Skip the TOC chapter (order=0)
    local order=$(jq -r '.order' <<<"$chapter")
    if [ "$order" -eq 0 ]; then
      continue
    fi
    # Clean up the title by removing any HTML tags and leading/trailing whitespace
    local title=$(echo "$chapter" | jq -r '.title // "Untitled Chapter"' | 
                  sed -e 's/<[^>]*>//g' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
    local level=$(echo "$chapter" | jq -r '.level // 1')
    local order=$(echo "$chapter" | jq -r '.order // 0')
    
    # Generate proper filename - skip order 0 for TOC
    local filename
    if [ $order -eq 0 ]; then
      filename="toc.xhtml"
    else
      filename=$(printf "ch%03d.xhtml" "$order")
    fi
    
    # Debug output
    if [ "${DEBUG:-false}" = "true" ]; then
      echo "Processing chapter: $title (level: $level, order: $order, file: $filename)" >&2
    fi
    
    # Close previous list items if going up a level
    if [ $level -lt $prev_level ]; then
      for ((i=prev_level; i>level; i--)); do
        printf "%s</ol>\n" "$indent" >> "$OUTPUT_FILE"
        indent=${indent:2}
        printf "%s</li>\n" "$indent" >> "$OUTPUT_FILE"
      done
    # Start new sublist if going down a level
    elif [ $level -gt $prev_level ]; then
      printf "\n%s<ol>\n" "$indent" >> "$OUTPUT_FILE"
      indent="  $indent"
    # Close previous list item if at same level
    elif [ $prev_level -gt 0 ]; then
      echo "</li>" >> "$OUTPUT_FILE"
    fi
    
    # Add the list item
    printf "%s<li><a href=\"%s\">%s" "$indent" "$filename" "$title" >> "$OUTPUT_FILE"
    
    prev_level=$level
  done
  
  # Close any remaining open tags
  for ((i=prev_level; i>1; i--)); do
    echo "</li>" >> "$OUTPUT_FILE"
    indent=${indent:2}
    printf "%s</ol>\n" "$indent" >> "$OUTPUT_FILE"
  done
  if [ $prev_level -ge 1 ]; then
    echo "</li>" >> "$OUTPUT_FILE"
  fi
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

# Clean up
rm -f "$OUTPUT_FILE.json"

echo "✅ TOC page created at $OUTPUT_FILE (depth=$MAX_LEVEL)"

# Debug output
if [ "${DEBUG:-false}" = "true" ]; then
  echo "=== TOC Preview ==="
  head -n 20 "$OUTPUT_FILE"
  echo "..."
  tail -n 10 "$OUTPUT_FILE"
fi
