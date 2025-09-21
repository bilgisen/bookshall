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

# --- Determine TOC depth automatically (Robust version) ---
# 1. Önce tüm chapter'ları al ve level değerlerini güvenli bir şekilde işle
MAX_LEVEL=$(jq -r '
  def to_valid_number:
    if type == "number" and . >= 1 and . <= 5 then .
    elif type == "string" and test("^[1-5]$") then tonumber
    else 1
    end;

  [.book.chapters[] | .level | to_valid_number] | 
  if length > 0 then max else 1 end
' "$PAYLOAD_FILE" 2>/dev/null) || MAX_LEVEL=1

# Ensure MAX_LEVEL is between 1 and 5
if [[ ! "$MAX_LEVEL" =~ ^[1-5]$ ]]; then
  MAX_LEVEL=1
fi

echo "🔍 Using TOC depth: $MAX_LEVEL (based on maximum chapter level)" >&2

# --- Prepare output file ---
# Output will be written directly later

# --- Updated generate_list function ---
generate_list() {
  local indent="$1"
  local prev_level=1
  local first_item=true

  # Process chapters with robust jq filter
  jq -c --argjson max_level "$MAX_LEVEL" '
    .book.chapters 
    | sort_by(.order // 0)[] 
    | select((.order // 0) > 0)
    | .level_normalized = (
        if (.level | type) == "number" and .level >= 1 and .level <= $max_level then .level
        elif (.level | type) == "string" and .level | test("^[1-5]$") then .level | tonumber
        else 1
        end
      )
    | select(.level_normalized <= $max_level)
    | {order: (.order // 0), level: .level_normalized, title: (.title // "Untitled Chapter")}
  ' "$PAYLOAD_FILE" | while IFS= read -r chapter_json; do
    
    # Extract values from JSON using jq (safer than regex)
    local title=$(echo "$chapter_json" | jq -r '.title')
    local level=$(echo "$chapter_json" | jq -r '.level')
    local order=$(echo "$chapter_json" | jq -r '.order')
    
    # Validate extracted values
    if [[ ! "$level" =~ ^[1-5]$ ]] || [[ ! "$order" =~ ^[0-9]+$ ]] || [ "$order" -le 0 ]; then
      echo "Warning: Skipping chapter due to invalid level/order: title='$title', level='$level', order='$order'" >&2
      continue
    fi
    
    local filename=$(printf "ch%03d.xhtml" "$order")

    # Debug output
    if [ "${DEBUG:-false}" = "true" ]; then
      echo "Debug: Processing chapter: $title (level: $level, order: $order, file: $filename)" >&2
    fi

    # Handle list level changes
    if [ $level -gt $prev_level ]; then
      # Start new sublist
      if [ "$first_item" = false ] || [ $prev_level -gt 1 ]; then
        echo "" >> "$OUTPUT_FILE"
      fi
      printf "%s<ol>\n" "$indent" >> "$OUTPUT_FILE"
      indent="  $indent"
    elif [ $level -lt $prev_level ]; then
      # Close previous levels
      if [ "$first_item" = false ]; then
        echo "</li>" >> "$OUTPUT_FILE"
      fi
      for ((i=prev_level; i>level; i--)); do
        indent=${indent:2}
        printf "%s</ol>\n" "$indent" >> "$OUTPUT_FILE"
      done
    elif [ "$first_item" = false ]; then
      # Close previous item at same level
      echo "</li>" >> "$OUTPUT_FILE"
    fi

    # Add list item with link (escape HTML entities in title)
    local escaped_title=$(printf '%s' "$title" | sed 's/&/\&amp;/g; s/</\</g; s/>/\>/g; s/"/\&quot;/g; s/'"'"'/\&#39;/g')
    printf "%s<li><a href=\"%s\">%s</a>" "$indent" "$filename" "$escaped_title" >> "$OUTPUT_FILE"

    prev_level=$level
    first_item=false
  done

  # Close any remaining open tags
  if [ "$first_item" = false ]; then
    echo "</li>" >> "$OUTPUT_FILE"
  fi
  for ((i=prev_level; i>1; i--)); do
    indent=${indent:2}
    printf "%s</ol>\n" "$indent" >> "$OUTPUT_FILE"
  done
  if [ "$prev_level" -eq 1 ] && [ "$first_item" = false ]; then
    echo "</ol>" >> "$OUTPUT_FILE"
  fi
}

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