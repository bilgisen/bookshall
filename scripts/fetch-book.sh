#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

# ------------------------------------------------------------------
# fetch-book.sh (with colophon + toc integration)
# ------------------------------------------------------------------

# === Required ENV ===
if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "❌ NEXT_PUBLIC_APP_URL is not set"
  exit 1
fi

# --- Auth header (optional API key or GitHub token) ---
AUTH_HEADER=()
if [ -n "${BOOKSHALL_API_KEY:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $BOOKSHALL_API_KEY")
elif [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

# --- Workspace setup ---
WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"
PAYLOAD_FILE="$WORKDIR/payload.json"

# --- Fetch payload ---
Q_INCLUDE_TOC=${INCLUDE_TOC:-true}
Q_TOC_LEVEL=${TOC_LEVEL:-3}
Q_INCLUDE_METADATA=${INCLUDE_METADATA:-true}
Q_INCLUDE_COVER=${INCLUDE_COVER:-true}

PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID/payload?generate_toc=$Q_INCLUDE_TOC&toc_depth=$Q_TOC_LEVEL&includeMetadata=$Q_INCLUDE_METADATA&includeCover=$Q_INCLUDE_COVER"
echo "📥 Fetching payload: $PAYLOAD_URL"
curl -fsSL "${AUTH_HEADER[@]}" "$PAYLOAD_URL" -o "$PAYLOAD_FILE"

if ! jq -e '.book' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ Invalid payload.json (missing .book)"
  exit 1
fi

# --- Escape helper for YAML ---
escape_for_yaml() {
  local raw="$1"
  printf '%s' "$raw" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

# --- Extract fields with better error handling ---
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Debug: Payload structure:" >&2
  jq '.' "$PAYLOAD_FILE" >&2
fi

# Function to safely extract numeric values with default
safe_extract_number() {
  local field=$1
  local default=$2
  local raw_value
  
  raw_value=$(jq -r "$field" "$PAYLOAD_FILE" 2>/dev/null)
  
  # Check if the value is a valid number or empty/null
  if [[ "$raw_value" =~ ^[0-9]+$ ]]; then
    echo "$raw_value"
  else
    echo "$default"
  fi
}

# Extract BOOK_ID from payload
BOOK_ID=$(jq -r '.book.id' "$PAYLOAD_FILE" 2>/dev/null || true)
if [ -z "$BOOK_ID" ] || [ "$BOOK_ID" = "null" ]; then
  echo "❌ Could not extract BOOK_ID from payload"
  echo "❌ Payload content:"
  head -n 50 "$PAYLOAD_FILE"
  exit 1
fi
echo "📚 Processing book with ID: $BOOK_ID"

# Extract book title - only use the book's title, never fall back to chapter titles
BOOK_TITLE=$(jq -r '.book.title | select(. != null) | tostring' "$PAYLOAD_FILE" 2>/dev/null || true)
if [ -z "$BOOK_TITLE" ] || [ "$BOOK_TITLE" = "null" ]; then
  BOOK_TITLE="Untitled Book"
  echo "⚠️  Warning: No book title found in payload, using default" >&2
else
  echo "📖 Book title: $BOOK_TITLE" >&2
fi

# Safely extract all fields with proper error handling
BOOK_AUTHOR=$(jq -r '(.book.author // "Unknown Author") | tostring' "$PAYLOAD_FILE" 2>/dev/null || echo "Unknown Author")
BOOK_LANG=$(jq -r '(.book.language // "en") | tostring' "$PAYLOAD_FILE" 2>/dev/null || echo "en")
BOOK_PUBLISHER=$(jq -r '(.book.publisher // "Unknown Publisher") | tostring' "$PAYLOAD_FILE" 2>/dev/null || echo "Unknown Publisher")
BOOK_SLUG=$(jq -r '(.book.slug // ("book-" + env.BOOK_ID)) | tostring' "$PAYLOAD_FILE" 2>/dev/null || echo "book-${BOOK_ID}")
BOOK_ISBN=$(jq -r '.book.isbn // empty' "$PAYLOAD_FILE" 2>/dev/null || true)
BOOK_YEAR=$(safe_extract_number '.book.publish_year' "")

META_GENERATED_AT=$(jq -r '.metadata.generated_at // empty' "$PAYLOAD_FILE" 2>/dev/null || true)
META_GENERATED_BY=$(jq -r '.metadata.generated_by // empty' "$PAYLOAD_FILE")
META_USER_ID=$(jq -r '.metadata.user_id // empty' "$PAYLOAD_FILE")
META_USER_EMAIL=$(jq -r '.metadata.user_email // empty' "$PAYLOAD_FILE")

# --- Options (payload + env override) ---
EFFECTIVE_INCLUDE_TOC="${INCLUDE_TOC:-$(jq -r '.options.generate_toc // true' "$PAYLOAD_FILE")}"
EFFECTIVE_INCLUDE_COVER="${INCLUDE_COVER:-$(jq -r '.options.cover // true' "$PAYLOAD_FILE")}"
EFFECTIVE_INCLUDE_METADATA="${INCLUDE_METADATA:-$(jq -r '.options.embed_metadata // true' "$PAYLOAD_FILE")}"

echo "📚 $BOOK_TITLE by $BOOK_AUTHOR"
echo "⚙️  Options → TOC=$EFFECTIVE_INCLUDE_TOC, Cover=$EFFECTIVE_INCLUDE_COVER, Metadata=$EFFECTIVE_INCLUDE_METADATA"

# --- metadata.yaml ---
META_FILE="$WORKDIR/metadata.yaml"
cat > "$META_FILE" <<EOF
---
title: "$(escape_for_yaml "$BOOK_TITLE")"
author: "$(escape_for_yaml "$BOOK_AUTHOR")"
lang: "$(escape_for_yaml "$BOOK_LANG")"
publisher: "$(escape_for_yaml "$BOOK_PUBLISHER")"
EOF

if [ -n "$BOOK_ISBN" ]; then
  echo "isbn: \"$BOOK_ISBN\"" >> "$META_FILE"
fi
if [ -n "$BOOK_YEAR" ]; then
  echo "date: \"$BOOK_YEAR\"" >> "$META_FILE"
else
  echo "date: \"$(date -u +"%Y-%m-%d")\"" >> "$META_FILE"
fi
echo "rights: \"All rights reserved\"" >> "$META_FILE"

[ -n "$META_GENERATED_BY" ] && echo "generator: \"$META_GENERATED_BY\"" >> "$META_FILE"
[ -n "$META_GENERATED_AT" ] && echo "generated_at: \"$META_GENERATED_AT\"" >> "$META_FILE"
[ -n "$META_USER_ID" ] && echo "user_id: \"$META_USER_ID\"" >> "$META_FILE"
[ -n "$META_USER_EMAIL" ] && echo "user_email: \"$META_USER_EMAIL\"" >> "$META_FILE"

echo "📝 metadata.yaml created"

# --- Fetch chapters ---
CHAPTER_FILES=()
jq -c '(.book.chapters // []) | sort_by(if .order == null then 0 else .order end)[]' "$PAYLOAD_FILE" \
  2>/dev/null | while IFS= read -r chap; do
  if [ -z "$chap" ]; then
    echo "⚠️  Warning: Empty chapter data" >&2
    continue
  fi
      order=$(jq -r '.order' <<<"$chap")
      title=$(jq -r '.title' <<<"$chap")
      content_url=$(jq -r '.url // empty' <<<"$chap")
      
      # Download chapter content if URL is available
      if [ -n "$content_url" ]; then
        echo "📥 Downloading chapter content from $content_url"
        # Create a temporary file for the chapter content
        temp_file=$(mktemp)
        
        # Download the chapter content with error handling
        if ! curl -fsSL "${AUTH_HEADER[@]}" "$content_url" -o "$temp_file"; then
          echo "⚠️  Failed to download chapter content from $content_url" >&2
          content="<p>Failed to load chapter content.</p>"
        else
          # Extract the main content from the HTML response
          content=$(cat "$temp_file" | 
            # Remove any existing DOCTYPE and HTML/HEAD tags
            sed -e 's/<!DOCTYPE[^>]*>//g' -e 's/<\/\?html[^>]*>//g' -e 's/<\/\?head[^>]*>//g' |
            # Extract the content between <body> tags or use the whole content
            sed -n '/<body[^>]*>/,/<\/body>/p' | sed -e 's/<body[^>]*>//' -e 's/<\/body>//' |
            # Remove any remaining script and style tags
            sed -e 's/<script[^>]*>[\s\S]*?<\/script>//g' -e 's/<style[^>]*>[\s\S]*?<\/style>//g' |
            # Clean up any empty lines
            sed '/^[[:space:]]*$/d' |
            # Ensure proper XHTML structure
            sed -e 's/&/&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g' -e "s/'/\&#39;/g"
          )
          
          # If we couldn't extract any meaningful content, use a fallback
          if [ -z "$content" ]; then
            content="<p>No content available for this chapter.</p>"
          fi
        fi
        
        # Clean up the temporary file
        rm -f "$temp_file"
      else
        content="<p>No content URL provided for this chapter.</p>"
      fi

      # Generate chapter file (use chXXX.xhtml format for compatibility with EPUB standards)
      chapter_num=$(printf "%03d" "$order")
      chapter_file="$CHAPTER_DIR/ch${chapter_num}.xhtml"

      # Skip if this is the TOC (order=0)
      if [ "$order" -eq 0 ]; then
        echo "ℹ️  Skipping TOC chapter (order=0)"
        continue
      fi

      echo "📄 Generating chapter: $chapter_file"

      # Create chapter content with proper XHTML structure
      {
        echo '<?xml version="1.0" encoding="UTF-8"?>'
        echo '<!DOCTYPE html>'
        echo '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
        echo '<head>'
        echo '  <meta charset="utf-8"/>'
        echo "  <title>${title}</title>"
        echo '  <style type="text/css">
            body { font-family: serif; line-height: 1.5; margin: 1em; }
            h1 { font-size: 1.5em; margin-bottom: 1em; }
            p { margin: 0.5em 0; text-indent: 1.5em; }
            .no-indent { text-indent: 0; }
          </style>'
        echo '</head>'
        echo '<body>'
        echo "  <h1>${title}</h1>"
        # Clean up content by removing any existing body/html tags
        echo "$content" | sed -e 's/<\/\?body[^>]*>//g' -e 's/<\/\?html[^>]*>//g'
        echo '</body>'
        echo '</html>'
      } > "$chapter_file"

      # Add to chapters list
      echo "$chapter_file" >> "$WORKDIR/_chapters.txt"
    done

if [ -f "$WORKDIR/_chapters.txt" ]; then
  mapfile -t CHAPTER_FILES < "$WORKDIR/_chapters.txt"
  rm "$WORKDIR/_chapters.txt"
else
  echo "⚠️ No chapters found, creating placeholder"
  file="$CHAPTER_DIR/chapter-001.xhtml"
  echo "<h1>$BOOK_TITLE</h1><p>No content</p>" > "$file"
  CHAPTER_FILES+=("$file")
fi

# --- Optional colophon (metadata page) ---
if [[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]]; then
  ./scripts/colophon.sh "$PAYLOAD_FILE" "$WORKDIR/imprint.xhtml"
  CHAPTER_FILES=("$WORKDIR/imprint.xhtml" "${CHAPTER_FILES[@]}")
fi

# --- Optional custom TOC page ---
if [[ "${EFFECTIVE_INCLUDE_TOC,,}" == "true" ]]; then
  # Generate TOC as toc.xhtml
  ./scripts/toc.sh "$PAYLOAD_FILE" "$WORKDIR/toc.xhtml"
  
  # Ensure TOC is the first file
  if [[ -f "$WORKDIR/toc.xhtml" ]]; then
    # Remove any existing TOC file from CHAPTER_FILES to avoid duplicates
    CHAPTER_FILES=("$WORKDIR/toc.xhtml" "${CHAPTER_FILES[@]}")
  fi
  
  # Rename ch001.xhtml to toc.xhtml if it exists (legacy support)
  if [[ -f "$WORKDIR/ch001.xhtml" ]]; then
    mv "$WORKDIR/ch001.xhtml" "$WORKDIR/toc.xhtml"
  fi
fi

# --- Cover ---
COVER_FILE=""
if [[ "${EFFECTIVE_INCLUDE_COVER,,}" == "true" ]]; then
  COVER_URL=$(jq -r '.book.cover_url // empty' "$PAYLOAD_FILE")
  if [ -n "$COVER_URL" ]; then
    COVER_FILE="$WORKDIR/cover.${COVER_URL##*.}"
    curl -fsSL "$COVER_URL" -o "$COVER_FILE" || COVER_FILE=""
  fi
fi

# --- Stylesheet ---
EPUB_CSS=""
STYLESHEET_URL=$(jq -r '.book.stylesheet_url // empty' "$PAYLOAD_FILE")
if [ -n "$STYLESHEET_URL" ]; then
  EPUB_CSS="$WORKDIR/epub.css"
  curl -fsSL "$STYLESHEET_URL" -o "$EPUB_CSS" || EPUB_CSS=""
fi

# --- Build EPUB ---
SAFE_SLUG="${BOOK_SLUG// /_}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
EPUB_FILENAME="${SAFE_SLUG}-${TIMESTAMP}.epub"

PANDOC_ARGS=("${CHAPTER_FILES[@]}" --output="$EPUB_FILENAME")

# No --toc here. Only metadata file, cover, css.
[[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]] && PANDOC_ARGS+=(--metadata-file="$META_FILE")
[ -n "$COVER_FILE" ] && PANDOC_ARGS+=(--epub-cover-image="$COVER_FILE")
[ -n "$EPUB_CSS" ] && PANDOC_ARGS+=(--css="$EPUB_CSS")

echo "🔧 Running pandoc..."
pandoc "${PANDOC_ARGS[@]}"

mkdir -p output
cp "$EPUB_FILENAME" output/book.epub

echo "✅ EPUB created: output/book.epub"
