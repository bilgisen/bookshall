#!/bin/bash
set -euo pipefail

# Validate required environment variables
: "${GITHUB_TOKEN:?GITHUB_TOKEN must be set in workflow environment}"

# --- CONFIG ---
BASE_URL="${NEXT_PUBLIC_APP_URL:-https://bookshall.com}"
API_URL="${API_URL:-$BASE_URL/api}"
WORKDIR="./work"
PAYLOAD_DIR="$WORKDIR/payload"
CHAPTERS_DIR="$WORKDIR/chapters"
OUTPUT_DIR="$WORKDIR/output"

# Required parameters
BOOK_ID="${BOOK_ID:?BOOK_ID is required}"
CONTENT_ID="${CONTENT_ID:?CONTENT_ID is required}"
COMBINED_TOKEN="${COMBINED_TOKEN:-${GITHUB_TOKEN:-}}"

# Handle metadata with proper JSON validation
METADATA="${METADATA:-'{}'}"

# Remove surrounding single quotes added by GitHub Actions
METADATA=$(echo "$METADATA" | sed "s/^'\|'$//g")

# Validate JSON
if ! echo "$METADATA" | jq -e . >/dev/null 2>&1; then
  echo "::warning::Invalid JSON in metadata, using empty object"
  METADATA='{}'
else
  # Extract slug if it exists
  SLUG=$(echo "$METADATA" | jq -r '.slug // empty' 2>/dev/null)
  if [ -n "$SLUG" ]; then
    echo "SLUG=$SLUG" >> $GITHUB_ENV
  fi
fi

echo "Using metadata: $METADATA"

mkdir -p "$PAYLOAD_DIR" "$CHAPTERS_DIR" "$OUTPUT_DIR"

# --- FUNCTIONS ---
log() { echo -e "[INFO] $*"; }
warn() { echo -e "[WARN] $*"; }
error() { echo -e "[ERROR] $*" >&2; exit 1; }

download_with_retry() {
  local url="$1" output="$2"
  local max_retries=3
  for i in $(seq 1 $max_retries); do
    if curl -sSf -H "Authorization: Bearer $COMBINED_TOKEN" -o "$output.tmp" "$url"; then
      mv "$output.tmp" "$output"
      return 0
    fi
    sleep $((i*2))
  done
  error "Failed to download $url"
}

update_status() {
  local phase="$1" local progress="$2" local message="$3"
  [ -n "${BACKEND_URL:-}" ] && [ -n "${COMBINED_TOKEN:-}" ] && \
  curl -s -X POST "$BACKEND_URL/api/publish/update" \
    -H "Authorization: Bearer $COMBINED_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"in-progress\",\"phase\":\"$phase\",\"progress\":$progress,\"message\":\"$message\"}" >/dev/null 2>&1 || true
}

# --- FETCH PAYLOAD ---
log "Fetching book payload..."
download_with_retry "$BASE_URL/api/books/by-id/$CONTENT_ID/export" "$PAYLOAD_DIR/payload.json"

BOOK_TITLE=$(jq -r '.book.title // "Untitled"' "$PAYLOAD_DIR/payload.json")
BOOK_AUTHOR=$(jq -r '.book.author // "Unknown"' "$PAYLOAD_DIR/payload.json")
BOOK_LANG=$(jq -r '.book.language // "en"' "$PAYLOAD_DIR/payload.json")
TOC_DEPTH=$(jq -r '.options.tocDepth // 2' "$PAYLOAD_DIR/payload.json")
INCLUDE_COVER=$(jq -r '.options.includeCover // true' "$PAYLOAD_DIR/payload.json")
INCLUDE_TOC=$(jq -r '.options.includeTOC // true' "$PAYLOAD_DIR/payload.json")
INCLUDE_IMPRINT=$(jq -r '.options.includeImprint // true' "$PAYLOAD_DIR/payload.json")

# --- DOWNLOAD CHAPTERS ---
log "Downloading chapters..."
update_status "downloading" 10 "Starting chapter downloads"

jq -r '.chapters[] | "\(.order) \(.id)"' "$PAYLOAD_DIR/payload.json" | while read -r order chapterId; do
  download_with_retry "$BASE_URL/api/chapters/$chapterId/html" "$CHAPTERS_DIR/chapter-$order.xhtml"
  update_status "downloading" 10 "Downloaded chapter $order"
done

# --- DOWNLOAD COVER ---
if [ "$INCLUDE_COVER" = "true" ]; then
  COVER_URL=$(jq -r '.book.coverUrl // empty' "$PAYLOAD_DIR/payload.json")
  [ -n "$COVER_URL" ] && download_with_retry "$COVER_URL" "$WORKDIR/cover.jpg"
fi

# --- DOWNLOAD IMPPRINT ---
if [ "$INCLUDE_IMPRINT" = "true" ]; then
  BOOK_SLUG=$(jq -r '.book.slug // empty' "$PAYLOAD_DIR/payload.json")
  [ -n "$BOOK_SLUG" ] && download_with_retry "$BASE_URL/api/books/by-slug/$BOOK_SLUG/imprint" "$WORKDIR/imprint.xhtml"
fi

update_status "processing" 90 "Preparing EPUB package"

# --- PANDOC EPUB GENERATION ---
log "Generating EPUB with Pandoc..."
OUTPUT_FILE="$OUTPUT_DIR/${CONTENT_ID}.epub"
PANDOC_CMD=(pandoc --from=html --to=epub3 --output="$OUTPUT_FILE" --epub-chapter-level=1
            --metadata=title:"$BOOK_TITLE" --metadata=author:"$BOOK_AUTHOR" --metadata=language:"$BOOK_LANG"
            --metadata=identifier:"$CONTENT_ID")

[ "$INCLUDE_TOC" = "true" ] && PANDOC_CMD+=(--toc --toc-depth="$TOC_DEPTH")
[ "$INCLUDE_COVER" = "true" ] && [ -f "$WORKDIR/cover.jpg" ] && PANDOC_CMD+=(--epub-cover-image="$WORKDIR/cover.jpg")
[ -f "$WORKDIR/styles/epub.css" ] && PANDOC_CMD+=(--css="$WORKDIR/styles/epub.css")

for file in $(ls "$CHAPTERS_DIR"/chapter-*.xhtml | sort -V); do
  PANDOC_CMD+=("$file")
done
[ "$INCLUDE_IMPRINT" = "true" ] && [ -f "$WORKDIR/imprint.xhtml" ] && PANDOC_CMD+=("$WORKDIR/imprint.xhtml")

"${PANDOC_CMD[@]}"
update_status "completed" 100 "EPUB generation complete"

log "✅ EPUB generated at $OUTPUT_FILE"
