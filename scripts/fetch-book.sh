#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

# ------------------------------------------------------------------
# fetch-book.sh (cleaned + improved)
# ------------------------------------------------------------------

# === Required ENV ===
if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "❌ NEXT_PUBLIC_APP_URL is not set"
  exit 1
fi

# --- BOOK_ID ---
if [ -z "${BOOK_ID:-}" ] && [ $# -lt 1 ]; then
  echo "❌ BOOK_ID is required (env or arg)"
  exit 1
fi
if [ -z "${BOOK_ID:-}" ]; then
  BOOK_ID="$1"
fi

# --- Auth header ---
AUTH_HEADER=()
if [ -n "${BOOKSHALL_API_KEY:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $BOOKSHALL_API_KEY")
elif [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

# --- Workspace ---
WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"
PAYLOAD_FILE="$WORKDIR/payload.json"

# --- Fetch initial payload ---
INITIAL_PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID"
echo "📥 Fetching initial payload from: $INITIAL_PAYLOAD_URL"

http_status=$(curl -s -o "$PAYLOAD_FILE" -w "%{http_code}" "${AUTH_HEADER[@]}" "$INITIAL_PAYLOAD_URL")
if [ "$http_status" -ne 200 ]; then
  echo "❌ Failed to download initial payload (HTTP $http_status)" >&2
  exit 1
fi

if ! jq -e '.' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ Invalid JSON in initial payload" >&2
  head -c 200 "$PAYLOAD_FILE" >&2
  exit 1
fi

BOOK_ID_FROM_PAYLOAD=$(jq -r '.id // empty' "$PAYLOAD_FILE" || true)
if [ -z "$BOOK_ID_FROM_PAYLOAD" ]; then
  echo "❌ Could not extract BOOK_ID from payload"
  exit 1
fi
if [ "$BOOK_ID" != "$BOOK_ID_FROM_PAYLOAD" ]; then
  echo "⚠️ BOOK_ID mismatch, using payload value" >&2
  BOOK_ID="$BOOK_ID_FROM_PAYLOAD"
fi
echo "📚 Processing book with ID: $BOOK_ID"

# --- Options ---
INCLUDE_TOC="${INCLUDE_TOC:-true}"
TOC_LEVEL="${TOC_LEVEL:-3}"
INCLUDE_METADATA="${INCLUDE_METADATA:-true}"
INCLUDE_COVER="${INCLUDE_COVER:-true}"

PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID/payload?generate_toc=$INCLUDE_TOC&toc_depth=$TOC_LEVEL&includeMetadata=$INCLUDE_METADATA&includeCover=$INCLUDE_COVER"
echo "📥 Fetching full payload: $PAYLOAD_URL"

http_status=$(curl -s -o "$PAYLOAD_FILE" -w "%{http_code}" "${AUTH_HEADER[@]}" "$PAYLOAD_URL")
if [ "$http_status" -ne 200 ]; then
  echo "❌ Failed to download full payload (HTTP $http_status)" >&2
  exit 1
fi

if ! jq -e '.book' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ Payload missing .book"
  exit 1
fi

# --- Escape helper ---
escape_for_yaml() {
  local raw="$1"
  printf '%s' "$raw" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e "s/'/''/g" -e 's/:/\\:/g'
}

# --- Safe number extractor ---
safe_extract_number() {
  local field=$1 default=$2
  local raw
  raw=$(jq -r "$field" "$PAYLOAD_FILE" 2>/dev/null || echo "")
  [[ "$raw" =~ ^[0-9]+$ ]] && echo "$raw" || echo "$default"
}

# --- Book fields ---
BOOK_TITLE=$(jq -r '.book.title // empty' "$PAYLOAD_FILE")
[ -z "$BOOK_TITLE" ] && BOOK_TITLE="Untitled Book"
BOOK_AUTHOR=$(jq -r '.book.author // empty' "$PAYLOAD_FILE")
[ -z "$BOOK_AUTHOR" ] && BOOK_AUTHOR="Unknown Author"
BOOK_LANG=$(jq -r '.book.language // empty' "$PAYLOAD_FILE")
[ -z "$BOOK_LANG" ] && BOOK_LANG="en"
BOOK_PUBLISHER=$(jq -r '.book.publisher // empty' "$PAYLOAD_FILE")
[ -z "$BOOK_PUBLISHER" ] && BOOK_PUBLISHER="Unknown Publisher"
FALLBACK_SLUG="book-${BOOK_ID}"
BOOK_SLUG=$(jq -r '.book.slug // empty' "$PAYLOAD_FILE")
[ -z "$BOOK_SLUG" ] && BOOK_SLUG="$FALLBACK_SLUG"
BOOK_ISBN=$(jq -r '.book.isbn // empty' "$PAYLOAD_FILE")
BOOK_YEAR=$(safe_extract_number '.book.publish_year' "")
META_GENERATED_AT=$(jq -r '.metadata.generated_at // empty' "$PAYLOAD_FILE")
META_GENERATED_BY=$(jq -r '.metadata.generated_by // empty' "$PAYLOAD_FILE")
META_USER_ID=$(jq -r '.metadata.user_id // empty' "$PAYLOAD_FILE")
META_USER_EMAIL=$(jq -r '.metadata.user_email // empty' "$PAYLOAD_FILE")

echo "📚 $BOOK_TITLE by $BOOK_AUTHOR"

# --- metadata.yaml ---
META_FILE="$WORKDIR/metadata.yaml"
cat > "$META_FILE" <<EOF
---
title: "$(escape_for_yaml "$BOOK_TITLE")"
author: "$(escape_for_yaml "$BOOK_AUTHOR")"
lang: "$(escape_for_yaml "$BOOK_LANG")"
publisher: "$(escape_for_yaml "$BOOK_PUBLISHER")"
EOF
[ -n "$BOOK_ISBN" ] && echo "isbn: \"$BOOK_ISBN\"" >> "$META_FILE"
[ -n "$BOOK_YEAR" ] && echo "date: \"$BOOK_YEAR\"" >> "$META_FILE" || echo "date: \"$(date -u +%Y-%m-%d)\"" >> "$META_FILE"
echo "rights: \"All rights reserved\"" >> "$META_FILE"
[ -n "$META_GENERATED_BY" ] && echo "generator: \"$META_GENERATED_BY\"" >> "$META_FILE"
[ -n "$META_GENERATED_AT" ] && echo "generated_at: \"$META_GENERATED_AT\"" >> "$META_FILE"
[ -n "$META_USER_ID" ] && echo "user_id: \"$META_USER_ID\"" >> "$META_FILE"
[ -n "$META_USER_EMAIL" ] && echo "user_email: \"$META_USER_EMAIL\"" >> "$META_FILE"
echo "📝 metadata.yaml created"

# --- Cover ---
COVER_FILE=""
if [[ "${INCLUDE_COVER,,}" == "true" ]]; then
  COVER_URL=$(jq -r '.book.cover_url // empty' "$PAYLOAD_FILE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [ -n "$COVER_URL" ]; then
    COVER_FILE="$WORKDIR/cover.${COVER_URL##*.}"
    curl -fsSL "$COVER_URL" -o "$COVER_FILE" || COVER_FILE=""
  fi
fi

# --- Process chapters ---
process_chapters() {
  if ! jq -e '.book.chapters | length > 0' "$PAYLOAD_FILE" >/dev/null; then
    echo "{\"title\":\"$BOOK_TITLE\",\"order\":1,\"content\":\"<p>No content</p>\"}"
  else
    jq -c '(.book.chapters // []) | sort_by(.order // 0) | .[]' "$PAYLOAD_FILE"
  fi
}

while IFS= read -r chap; do
  [ -z "$chap" ] && continue
  order=$(jq -r '.order // 0' <<<"$chap")
  title=$(jq -r '.title // "Untitled"' <<<"$chap")
  content_url=$(jq -r '.url // empty' <<<"$chap" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  content="<p>No content</p>"
  if [ -n "$content_url" ]; then
    temp_file=$(mktemp)
    if curl -fsSL "${AUTH_HEADER[@]}" "$content_url" -o "$temp_file"; then
      if command -v xmllint >/dev/null; then
        content=$(xmllint --html --xmlout --xpath "//body" "$temp_file" 2>/dev/null | sed -e 's/^.*<body[^>]*>//' -e 's/<\/body>.*$//')
      else
        content=$(sed -n '/<body[^>]*>/,/<\/body>/p' "$temp_file" | sed -e 's/<body[^>]*>//' -e 's/<\/body>//')
      fi
    fi
    rm -f "$temp_file"
  fi
  chapter_num=$(printf "%03d" "$order")
  chapter_file="$CHAPTER_DIR/ch${chapter_num}.xhtml"
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<!DOCTYPE html>'
    echo '<html xmlns="http://www.w3.org/1999/xhtml">'
    echo "<head><title>${title}</title></head><body>"
    echo "$content"
    echo '</body></html>'
  } > "$chapter_file"
  echo "$chapter_file" >> "$WORKDIR/_chapters.txt"
done < <(process_chapters)

mapfile -t CHAPTER_FILES < "$WORKDIR/_chapters.txt"
rm -f "$WORKDIR/_chapters.txt"

# --- Optional extra files ---
[[ "${INCLUDE_METADATA,,}" == "true" ]] && ./scripts/colophon.sh "$PAYLOAD_FILE" "$WORKDIR/imprint.xhtml" || true
[[ "${INCLUDE_TOC,,}" == "true" ]] && ./scripts/toc.sh "$PAYLOAD_FILE" "$WORKDIR/toc.xhtml" || true

# --- Stylesheet ---
EPUB_CSS=""
STYLESHEET_URL=$(jq -r '.book.stylesheet_url // empty' "$PAYLOAD_FILE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
if [ -n "$STYLESHEET_URL" ]; then
  EPUB_CSS="$WORKDIR/epub.css"
  curl -fsSL "$STYLESHEET_URL" -o "$EPUB_CSS" || EPUB_CSS=""
fi

# --- Build EPUB ---
SAFE_SLUG="${BOOK_SLUG// /_}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
EPUB_FILENAME="${SAFE_SLUG}-${TIMESTAMP}.epub"

EPUB_FILES=()
[ -n "$COVER_FILE" ] && EPUB_FILES+=("$COVER_FILE")
[ -f "$WORKDIR/imprint.xhtml" ] && EPUB_FILES+=("$WORKDIR/imprint.xhtml")
[ -f "$WORKDIR/toc.xhtml" ] && EPUB_FILES+=("$WORKDIR/toc.xhtml")
EPUB_FILES+=("${CHAPTER_FILES[@]}")

PANDOC_ARGS=(--epub-title-page=false
  --metadata="title:$BOOK_TITLE"
  --metadata="author:$BOOK_AUTHOR"
  --metadata="language:$BOOK_LANG"
  --metadata="publisher:$BOOK_PUBLISHER"
  --metadata-file="$META_FILE"
)
[ -n "$COVER_FILE" ] && PANDOC_ARGS+=(--epub-cover-image="$COVER_FILE")
[ -n "$EPUB_CSS" ] && PANDOC_ARGS+=(--css="$EPUB_CSS")
PANDOC_ARGS+=("${EPUB_FILES[@]}" --output="$EPUB_FILENAME")

pandoc "${PANDOC_ARGS[@]}" || { echo "❌ Pandoc failed" >&2; exit 1; }

mkdir -p output
ln -sf "../$EPUB_FILENAME" output/book.epub
echo "✅ EPUB created: $EPUB_FILENAME → output/book.epub"
