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

# Add debug output for the payload being fetched
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Debug: Fetching payload from: $PAYLOAD_URL" >&2
  echo "Debug: Using auth header: ${AUTH_HEADER[*]}" >&2
fi

# Download the payload with error handling
if ! curl -fsSL "${AUTH_HEADER[@]}" "$PAYLOAD_URL" -o "$PAYLOAD_FILE"; then
  echo "❌ Failed to download payload from $PAYLOAD_URL" >&2
  echo "❌ HTTP Status: $(curl -s -o /dev/null -w "%{http_code}" "$PAYLOAD_URL")" >&2
  exit 1
fi

# Validate the payload is valid JSON
if ! jq -e '.' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ Downloaded payload is not valid JSON" >&2
  echo "❌ First 100 chars of payload: $(head -c 100 "$PAYLOAD_FILE")" >&2
  exit 1
fi

# Validate the payload has the expected structure
if ! jq -e '.book' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ Invalid payload.json (missing .book)" >&2
  echo "❌ Payload structure:" >&2
  jq -c '.' "$PAYLOAD_FILE" | head -n 20 >&2
  exit 1
fi

# Debug: Show payload structure if debug is enabled
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Debug: Payload structure:" >&2
  jq -c '.book | {id, title, author, chapters: (.chapters | length)}' "$PAYLOAD_FILE" >&2
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

# Debug book metadata
echo "Debug: Book Metadata" >&2
echo "  Title: '$BOOK_TITLE'" >&2
echo "  Author: '$BOOK_AUTHOR'" >&2
echo "  Language: '$BOOK_LANG'" >&2
echo "  Publisher: '$BOOK_PUBLISHER'" >&2

# --- metadata.yaml ---
META_FILE="$WORKDIR/metadata.yaml"
cat > "$META_FILE" <<EOF
---
title: "$(escape_for_yaml "$BOOK_TITLE")"
author: "$(escape_for_yaml "$BOOK_AUTHOR")"
lang: "$(escape_for_yaml "$BOOK_LANG")"
publisher: "$(escape_for_yaml "$BOOK_PUBLISHER")"
EOF

# Debug metadata file content
echo "Debug: Generated metadata.yaml content:" >&2
cat "$META_FILE" >&2

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
# Function to process chapters
process_chapters() {
  echo "Debug: Starting chapter processing..." >&2
  
  # First, validate the chapters array exists and is not empty
  if ! jq -e '.book.chapters | length > 0' "$PAYLOAD_FILE" >/dev/null; then
    echo "⚠️  Warning: No chapters found in payload" >&2
    # Create a default chapter if none exist
    echo "{\"title\":\"$BOOK_TITLE\",\"order\":1,\"content\":\"<p>No content available</p>\"}" | jq -c .
  else
    # Extract and process chapters with better error handling
    jq -c '(.book.chapters // []) | sort_by(.order // 0) | .[] | select(. != null)' "$PAYLOAD_FILE" 2>&1 || {
      echo "❌ Error processing chapters:" >&2
      jq -c '.book.chapters[] | {order, title, has_content: (has("content") or has("url"))}' "$PAYLOAD_FILE" >&2
      exit 1
    }
  fi
}

# Process chapters and read them into the loop
while IFS= read -r chap; do
  if [ -z "$chap" ]; then
    echo "⚠️  Warning: Empty chapter data" >&2
    continue
  fi
  
  if [ "${DEBUG:-false}" = "true" ]; then
    echo "Debug: Processing chapter: $(jq -r '{order, title, has_url: (has("url") and (.url != null))}' <<<"$chap")" >&2
  fi
  order=$(jq -r '.order' <<<"$chap")
  title=$(jq -r '.title' <<<"$chap")
  content_url=$(jq -r '.url // empty' <<<"$chap")
  
  # Download chapter content if URL is available
  if [ -n "$content_url" ]; then
    # URL'deki boşlukları temizle
    content_url=$(echo "$content_url" | sed 's/[[:space:]]*$//')
    echo "📥 Downloading chapter content from $content_url"
    
    # Create a temporary file for the chapter content
    temp_file=$(mktemp)
    
    # Download the chapter content with error handling
    if curl -fsSL "${AUTH_HEADER[@]}" "$content_url" -o "$temp_file"; then
      echo "✅ Successfully downloaded content" >&2
      # Extract and clean the main content using xmllint for better HTML parsing
      if command -v xmllint >/dev/null 2>&1; then
        # Use xmllint if available (better HTML parsing)
        content=$(xmllint --html --xmlout --xpath "//body" "$temp_file" 2>/dev/null | 
          sed -e 's/^.*<body[^>]*>//' -e 's/<\/body>.*$//' |
          # Remove any script and style tags completely
          sed -e '/<script\b[^>]*>/,/<\/script>/d' -e '/<style\b[^>]*>/,/<\/style>/d' |
          # Clean up whitespace
          sed 's/^[[:space:]]*//;s/[[:space:]]*$//' |
          # Remove empty lines
          sed '/^[[:space:]]*$/d'
        )
      else
        # Fallback to sed if xmllint is not available
        content=$(cat "$temp_file" | 
          # Remove any existing DOCTYPE and HTML/HEAD tags
          sed -e 's/<!DOCTYPE[^>]*>//g' -e 's/<\/?html[^>]*>//g' -e 's/<\/?head[^>]*>//g' |
          # Extract the content between <body> tags or use the whole content
          sed -n '/<body[^>]*>/,/<\/body>/p' | sed -e 's/<body[^>]*>//' -e 's/<\/body>//' |
          # Remove any remaining script and style tags
          sed -e '/<script\b[^>]*>/,/<\/script>/d' -e '/<style\b[^>]*>/,/<\/style>/d' |
          # Clean up any empty lines and whitespace
          sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e '/^[[:space:]]*$/d' |
          # Ensure proper XHTML escaping
          sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g' -e "s/'/\&#39;/g"
        )
      fi
      
      # If we couldn't extract any meaningful content, use a fallback
      if [ -z "$content" ]; then
        content="<p>No content available for this chapter.</p>"
      fi
    else
      echo "❌ Failed to download chapter content from $content_url" >&2
      echo "❌ HTTP Status: $(curl -s -o /dev/null -w "%{http_code}" "${AUTH_HEADER[@]}" "$content_url")" >&2
      content="<p>Failed to load chapter content.</p>"
    # Clean up the temporary file
    rm -f "$temp_file"
          sed 's/^[[:space:]]*//;s/[[:space:]]*$//' |
          # Remove empty lines
          sed '/^[[:space:]]*$/d'
        )
      else
        # Fallback to sed if xmllint is not available
        content=$(cat "$temp_file" | 
          # Remove any existing DOCTYPE and HTML/HEAD tags
          sed -e 's/<!DOCTYPE[^>]*>//g' -e 's/<\/?html[^>]*>//g' -e 's/<\/?head[^>]*>//g' |
          # Extract the content between <body> tags or use the whole content
          sed -n '/<body[^>]*>/,/<\/body>/p' | sed -e 's/<body[^>]*>//' -e 's/<\/body>//' |
          # Remove any remaining script and style tags
          sed -e '/<script\b[^>]*>/,/<\/script>/d' -e '/<style\b[^>]*>/,/<\/style>/d' |
          # Clean up any empty lines and whitespace
          sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e '/^[[:space:]]*$/d' |
          # Ensure proper XHTML escaping
          sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g' -e "s/'/\&#39;/g"
        )
      fi
      
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
        # Clean up content by removing any existing body/html tags and unescape HTML entities
        echo "$content" | sed -e 's/<\/?body[^>]*>//g' -e 's/<\/?html[^>]*>//g' \
          -e 's/&amp;/\&/g' -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/&quot;/"/g' -e 's/&#39;/\'"'"'/g'
        echo '</body>'
        echo '</html>'
      } > "$chapter_file"

      # Add to chapters list
      echo "$chapter_file" >> "$WORKDIR/_chapters.txt"
done < <(process_chapters)

if [ -f "$WORKDIR/_chapters.txt" ]; then
  mapfile -t CHAPTER_FILES < "$WORKDIR/_chapters.txt"
  rm "$WORKDIR/_chapters.txt"
else
  echo "⚠️ No chapters found, creating placeholder"
  file="$CHAPTER_DIR/chapter-001.xhtml"
fi

# Create a new array for ordered files
ORDERED_FILES=()

# --- Optional colophon (metadata page) ---
if [[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" && -f "$WORKDIR/imprint.xhtml" ]]; then
  ./scripts/colophon.sh "$PAYLOAD_FILE" "$WORKDIR/imprint.xhtml"
  if [[ -f "$WORKDIR/imprint.xhtml" ]]; then
    ORDERED_FILES+=("$WORKDIR/imprint.xhtml")
    echo "✅ Added imprint.xhtml to EPUB"
  else
    echo "⚠️  Warning: Failed to generate imprint.xhtml" >&2
  fi
fi

# --- Optional custom TOC page ---
if [[ "${EFFECTIVE_INCLUDE_TOC,,}" == "true" ]]; then
  # Generate TOC as toc.xhtml
  ./scripts/toc.sh "$PAYLOAD_FILE" "$WORKDIR/toc.xhtml"
  
  if [[ -f "$WORKDIR/toc.xhtml" ]]; then
    ORDERED_FILES+=("$WORKDIR/toc.xhtml")
    echo "✅ Added toc.xhtml to EPUB"
  else
    echo "⚠️  Warning: Failed to generate toc.xhtml" >&2
  fi
fi

# Add all chapters after TOC and imprint
for chap_file in "${CHAPTER_FILES[@]}"; do
  if [[ -f "$chap_file" ]]; then
    ORDERED_FILES+=("$chap_file")
  else
    echo "⚠️  Warning: Chapter file not found: $chap_file" >&2
  fi
done

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

# Explicitly order files: imprint -> toc -> chapters
EPUB_FILES=()

# 1. Add imprint (colophon) if enabled and exists
if [[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]]; then
  if [[ -f "$WORKDIR/imprint.xhtml" ]]; then
    EPUB_FILES+=("$WORKDIR/imprint.xhtml")
    echo "📄 Adding imprint to EPUB (1/3)"
  else
    echo "⚠️  Imprint requested but file not found" >&2
  fi
fi

# 2. Add TOC if enabled and exists
if [[ "${EFFECTIVE_INCLUDE_TOC,,}" == "true" ]]; then
  if [[ -f "$WORKDIR/toc.xhtml" ]]; then
    EPUB_FILES+=("$WORKDIR/toc.xhtml")
    echo "📄 Adding TOC to EPUB (2/3)"
  else
    echo "⚠️  TOC requested but file not found" >&2
  fi
fi

# 3. Add chapter files
chapter_count=0
for chap_file in "${CHAPTER_FILES[@]}"; do
  if [[ -f "$chap_file" ]]; then
    EPUB_FILES+=("$chap_file")
    ((chapter_count++))
  else
    echo "⚠️  Warning: Chapter file not found: $chap_file" >&2
  fi
done
echo "📄 Adding $chapter_count chapters to EPUB (3/3)"

# Setup pandoc arguments
PANDOC_ARGS=()
# Disable automatic title page to use our custom imprint
PANDOC_ARGS+=(--epub-title-page=false)
# Add metadata
PANDOC_ARGS+=(--metadata="title:$BOOK_TITLE")
PANDOC_ARGS+=(--metadata="author:$BOOK_AUTHOR")
PANDOC_ARGS+=(--metadata="language:$BOOK_LANG")
[ -n "$BOOK_PUBLISHER" ] && PANDOC_ARGS+=(--metadata="publisher:$BOOK_PUBLISHER")
[ -n "$BOOK_YEAR" ] && PANDOC_ARGS+=(--metadata="date:$BOOK_YEAR")
# Add metadata file as additional metadata source
[[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]] && PANDOC_ARGS+=(--metadata-file="$META_FILE")
# Add cover and CSS if specified
[ -n "$COVER_FILE" ] && PANDOC_ARGS+=(--epub-cover-image="$COVER_FILE")
[ -n "$EPUB_CSS" ] && PANDOC_ARGS+=(--css="$EPUB_CSS")
# Add ordered files and output
PANDOC_ARGS+=("${EPUB_FILES[@]}" --output="$EPUB_FILENAME")

echo "🔧 Running pandoc with ${#PANDOC_ARGS[@]} arguments..."
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Files being passed to pandoc in order:"
  for i in "${!EPUB_FILES[@]}"; do
    echo "  [$((i+1))] ${EPUB_FILES[$i]}"
  done
fi

# Run pandoc with error handling
if ! pandoc "${PANDOC_ARGS[@]}"; then
  echo "❌ Error: Failed to generate EPUB with pandoc" >&2
  exit 1
fi

mkdir -p output
cp "$EPUB_FILENAME" output/book.epub

echo "✅ EPUB created: output/book.epub"
