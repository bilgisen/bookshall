#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

# ------------------------------------------------------------------
# Robust fetch-book.sh
# - uses BOOK_ID to fetch payload: /api/books/by-id/<BOOK_ID>/payload
# - respects payload.options and workflow ENV overrides (INCLUDE_*)
# - supports cover_url / coverUrl (camelCase/snake_case)
# - supports stylesheet_url / stylesheetUrl
# - sorts chapters by .order and fetches them in order
# - creates metadata.yaml and passes it to pandoc
# - produces epub filename based on book.slug or fallback to book-<BOOK_ID>
# ------------------------------------------------------------------

# --- Debug / minimal checks ---
echo "=== Debug Info ==="
echo "Working directory: $(pwd)"
echo "NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-<not-set>}"
echo "BOOKSHALL_API_KEY present: ${BOOKSHALL_API_KEY:+yes}"
echo "GITHUB_TOKEN present: ${GITHUB_TOKEN:+yes}"
echo "BOOK_ID: ${BOOK_ID:-<not-set>}"
echo "CONTENT_ID: ${CONTENT_ID:-<not-set>}"

# Ensure BOOK_ID is available (preferred). If not, fail early.
if [ -z "${BOOK_ID:-}" ]; then
  echo "❌ BOOK_ID environment variable is not set. This script requires BOOK_ID to fetch the payload."
  exit 1
fi

if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "❌ NEXT_PUBLIC_APP_URL environment variable is not set. Set it to your app base URL (e.g. https://bookshall.com)."
  exit 1
fi

# Prepare auth header array if token exists
AUTH_HEADER=()
if [ -n "${BOOKSHALL_API_KEY:-}" ]; then
  AUTH_HEADER=( -H "Authorization: Bearer $BOOKSHALL_API_KEY" )
elif [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=( -H "Authorization: Bearer $GITHUB_TOKEN" )
fi

# Workspace
WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"

PAYLOAD_FILE="$WORKDIR/payload.json"

# Fetch payload from book ID
PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID/payload"
echo "📥 Fetching payload from: $PAYLOAD_URL"

if ! curl -fsSL "${AUTH_HEADER[@]}" -H "Content-Type: application/json" "$PAYLOAD_URL" -o "$PAYLOAD_FILE"; then
  echo "❌ Failed to fetch payload from $PAYLOAD_URL"
  exit 1
fi

if [ ! -s "$PAYLOAD_FILE" ]; then
  echo "❌ Empty payload received at $PAYLOAD_FILE"
  exit 1
fi

# Quick validation: must contain .book
if ! jq -e '.book' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ payload.json is missing 'book' root object. See payload:"
  jq . "$PAYLOAD_FILE" || true
  exit 1
fi

# Helper to escape strings for YAML (simple escaping of double quotes and CR)
escape_for_yaml() {
  local raw="$1"
  printf '%s' "$raw" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\r//g'
}

# Extract core book fields (use payload values; fallback to sensible defaults)
BOOK_TITLE=$(jq -r '.book.title // empty' "$PAYLOAD_FILE")
BOOK_AUTHOR=$(jq -r '.book.author // empty' "$PAYLOAD_FILE")
BOOK_LANG=$(jq -r '.book.language // "en"' "$PAYLOAD_FILE")
BOOK_SLUG=$(jq -r '.book.slug // empty' "$PAYLOAD_FILE")
BOOK_ID_FROM_PAYLOAD=$(jq -r '.book.id // empty' "$PAYLOAD_FILE")

[ -z "$BOOK_TITLE" ] && BOOK_TITLE="Untitled Book"
[ -z "$BOOK_AUTHOR" ] && BOOK_AUTHOR="Unknown Author"
[ -z "$BOOK_SLUG" ] && BOOK_SLUG="book-$BOOK_ID"

# Options precedence: environment inputs override payload.options when provided.
# Read payload options (if present)
PAYLOAD_GEN_TOC=$(jq -r 'try .options.generate_toc // .options.include_toc // empty' "$PAYLOAD_FILE")
PAYLOAD_TOC_DEPTH=$(jq -r 'try .options.toc_depth // .options.tocDepth // empty' "$PAYLOAD_FILE")
PAYLOAD_INCLUDE_COVER=$(jq -r 'try .options.cover // .options.include_cover // empty' "$PAYLOAD_FILE")
PAYLOAD_INCLUDE_METADATA=$(jq -r 'try .options.embed_metadata // .options.include_metadata // empty' "$PAYLOAD_FILE")
PAYLOAD_INCLUDE_IMPRINT=$(jq -r 'try .options.include_imprint // empty' "$PAYLOAD_FILE")

# Environment variables (from the workflow) — may be 'true'/'false' or empty
ENV_INCLUDE_TOC="${INCLUDE_TOC:-}"
ENV_TOC_LEVEL="${TOC_LEVEL:-}"
ENV_INCLUDE_COVER="${INCLUDE_COVER:-}"
ENV_INCLUDE_METADATA="${INCLUDE_METADATA:-}"
ENV_INCLUDE_IMPRINT="${INCLUDE_IMPRINT:-}"

# Compute effective flags (env overrides payload; payload defines defaults; final defaults below)
if [ -n "$ENV_INCLUDE_TOC" ]; then
  EFFECTIVE_INCLUDE_TOC="$ENV_INCLUDE_TOC"
elif [ -n "$PAYLOAD_GEN_TOC" ]; then
  EFFECTIVE_INCLUDE_TOC="$PAYLOAD_GEN_TOC"
else
  EFFECTIVE_INCLUDE_TOC="true"
fi

if [ -n "$ENV_TOC_LEVEL" ]; then
  EFFECTIVE_TOC_DEPTH="$ENV_TOC_LEVEL"
elif [ -n "$PAYLOAD_TOC_DEPTH" ]; then
  EFFECTIVE_TOC_DEPTH="$PAYLOAD_TOC_DEPTH"
else
  EFFECTIVE_TOC_DEPTH="3"
fi

if [ -n "$ENV_INCLUDE_COVER" ]; then
  EFFECTIVE_INCLUDE_COVER="$ENV_INCLUDE_COVER"
elif [ -n "$PAYLOAD_INCLUDE_COVER" ]; then
  EFFECTIVE_INCLUDE_COVER="$PAYLOAD_INCLUDE_COVER"
else
  EFFECTIVE_INCLUDE_COVER="true"
fi

if [ -n "$ENV_INCLUDE_METADATA" ]; then
  EFFECTIVE_INCLUDE_METADATA="$ENV_INCLUDE_METADATA"
elif [ -n "$PAYLOAD_INCLUDE_METADATA" ]; then
  EFFECTIVE_INCLUDE_METADATA="$PAYLOAD_INCLUDE_METADATA"
else
  EFFECTIVE_INCLUDE_METADATA="true"
fi

EFFECTIVE_INCLUDE_IMPRINT="${ENV_INCLUDE_IMPRINT:-${PAYLOAD_INCLUDE_IMPRINT:-false}}"

echo "📚 Book: $BOOK_TITLE"
echo "✍️  Author: $BOOK_AUTHOR"
echo "🔤 Lang: $BOOK_LANG"
echo "🔖 Slug: $BOOK_SLUG"
echo "⚙️  Effective options -> TOC: $EFFECTIVE_INCLUDE_TOC (depth $EFFECTIVE_TOC_DEPTH), Cover: $EFFECTIVE_INCLUDE_COVER, Metadata: $EFFECTIVE_INCLUDE_METADATA, Imprint: $EFFECTIVE_INCLUDE_IMPRINT"

# --- metadata.yaml creation (safe-ish quoting) ---
META_GENERATED_AT=$(jq -r '.metadata.generated_at // empty' "$PAYLOAD_FILE")
META_GENERATED_BY=$(jq -r '.metadata.generated_by // empty' "$PAYLOAD_FILE")
META_USER_ID=$(jq -r '.metadata.user_id // empty' "$PAYLOAD_FILE")
META_USER_EMAIL=$(jq -r '.metadata.user_email // empty' "$PAYLOAD_FILE")

cat > "$WORKDIR/metadata.yaml" <<EOF
---
title: "$(escape_for_yaml "$BOOK_TITLE")"
author: "$(escape_for_yaml "$BOOK_AUTHOR")"
language: "$(escape_for_yaml "$BOOK_LANG")"
generated_at: "$(escape_for_yaml "$META_GENERATED_AT")"
generated_by: "$(escape_for_yaml "$META_GENERATED_BY")"
user_id: "$(escape_for_yaml "$META_USER_ID")"
user_email: "$(escape_for_yaml "$META_USER_EMAIL")"
...
EOF

echo "📝 metadata.yaml written to $WORKDIR/metadata.yaml"

# --- Chapters fetching ---
CHAPTER_FILES=()
CHAPTER_COUNT=$(jq -r 'try (.book.chapters | length) // 0' "$PAYLOAD_FILE")

if [ "$CHAPTER_COUNT" -gt 0 ]; then
  echo "📖 Found $CHAPTER_COUNT chapters — fetching in order..."
  idx=0
  # iterate sorted by order (stable)
  jq -c '(.book.chapters // []) | sort_by(.order)[]' "$PAYLOAD_FILE" \
    | while read -r chap; do
      idx=$((idx+1))
      order=$(jq -r '.order // empty' <<<"$chap")
      cid=$(jq -r '.id // empty' <<<"$chap")
      curl_url=$(jq -r '.url // empty' <<<"$chap")
      # fallback: if url empty but id present, try chapter endpoint
      if [ -z "$curl_url" ] && [ -n "$cid" ]; then
        curl_url="$NEXT_PUBLIC_APP_URL/api/chapters/$cid/html"
      fi
      filename="$CHAPTER_DIR/chapter-$(printf "%03d" "$idx").xhtml"
      if [ -n "$curl_url" ]; then
        echo "  - fetching chapter #$idx (order=${order:-n/a}) from: $curl_url"
        if curl -fsSL "${AUTH_HEADER[@]}" -H "Accept: text/html" "$curl_url" -o "$filename"; then
          echo "    -> saved $filename"
        else
          echo "    ⚠️ Failed to fetch chapter (id=$cid, url=$curl_url). Writing placeholder."
          cat > "$filename" <<HTML
<!doctype html><html><head><meta charset="utf-8"/></head><body><h1>Chapter $(printf "%03d" "$idx")</h1><p>Failed to fetch chapter content from $curl_url</p></body></html>
HTML
        fi
      else
        echo "  - chapter #$idx has no url and no id; creating empty placeholder."
        cat > "$filename" <<HTML
<!doctype html><html><head><meta charset="utf-8"/></head><body><h1>Chapter $(printf "%03d" "$idx")</h1><p>No source URL for this chapter.</p></body></html>
HTML
      fi
      # append absolute path to array (we are in same script shell; to capture, we write to a temp file and later read)
      echo "$filename" >> "$WORKDIR/_chapter_files.txt"
    done

  # read back chapter files into array (preserve order)
  if [ -f "$WORKDIR/_chapter_files.txt" ]; then
    while IFS= read -r f; do
      CHAPTER_FILES+=("$f")
    done < "$WORKDIR/_chapter_files.txt"
    rm -f "$WORKDIR/_chapter_files.txt"
  fi

else
  echo "⚠️ No chapters found in payload — creating a single placeholder chapter."
  default_file="$CHAPTER_DIR/chapter-001.xhtml"
  cat > "$default_file" <<HTML
<!doctype html><html><head><meta charset="utf-8"/></head><body><h1>$(escape_for_yaml "$BOOK_TITLE")</h1><p>No content available.</p></body></html>
HTML
  CHAPTER_FILES+=("$default_file")
fi

# sanity: ensure there is at least one chapter file to feed pandoc
if [ "${#CHAPTER_FILES[@]}" -eq 0 ]; then
  echo "❌ No chapter files prepared; aborting."
  exit 1
fi

# --- Download cover (if enabled) ---
COVER_FILE=""
if [[ "${EFFECTIVE_INCLUDE_COVER,,}" == "true" ]]; then
  COVER_URL=$(jq -r 'try (.book.cover_url // .book.coverUrl // .cover_url // .coverUrl // empty)' "$PAYLOAD_FILE")
  if [ -n "$COVER_URL" ]; then
    # derive a stable filename for cover (preserve ext if present)
    cover_basename="$(basename "${COVER_URL%%\?*}" )"
    COVER_FILE="$WORKDIR/$cover_basename"
    echo "🖼️  Downloading cover from $COVER_URL -> $COVER_FILE"
    if ! curl -fsSL "${AUTH_HEADER[@]}" -o "$COVER_FILE" "$COVER_URL"; then
      echo "⚠️ Failed to download cover image from $COVER_URL (will continue without cover)"
      COVER_FILE=""
    fi
  else
    echo "⚠️ payload has no cover URL"
  fi
fi

# --- Download stylesheet (if any) ---
EPUB_CSS=""
STYLESHEET_URL=$(jq -r 'try (.book.stylesheet_url // .book.stylesheetUrl // .stylesheet_url // .stylesheetUrl // empty)' "$PAYLOAD_FILE")
if [ -n "$STYLESHEET_URL" ]; then
  EPUB_CSS="$WORKDIR/epub.css"
  echo "🎨 Downloading stylesheet from $STYLESHEET_URL -> $EPUB_CSS"
  if ! curl -fsSL "${AUTH_HEADER[@]}" -o "$EPUB_CSS" "$STYLESHEET_URL"; then
    echo "⚠️ Failed to download stylesheet; proceeding without stylesheet"
    EPUB_CSS=""
  fi
fi

# --- Build EPUB filename and call pandoc ---
# prefer book.slug from payload, fallback to book-$BOOK_ID
SAFE_SLUG="${BOOK_SLUG// /_}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
EPUB_FILENAME="${SAFE_SLUG}-${TIMESTAMP}.epub"

echo "📦 Building EPUB: $EPUB_FILENAME"

# Build pandoc args
PANDOC_ARGS=()
# add chapter files in order
for f in "${CHAPTER_FILES[@]}"; do
  PANDOC_ARGS+=( "$f" )
done

# metadata file
if [[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]]; then
  PANDOC_ARGS+=( --metadata-file="$WORKDIR/metadata.yaml" )
fi

# output and common options
PANDOC_ARGS+=( --output="$EPUB_FILENAME" )

# toc
if [[ "${EFFECTIVE_INCLUDE_TOC,,}" == "true" ]]; then
  PANDOC_ARGS+=( --toc --toc-depth="$EFFECTIVE_TOC_DEPTH" )
fi

# cover
if [ -n "$COVER_FILE" ] && [ -f "$COVER_FILE" ]; then
  PANDOC_ARGS+=( --epub-cover-image="$COVER_FILE" )
fi

# stylesheet
if [ -n "$EPUB_CSS" ] && [ -f "$EPUB_CSS" ]; then
  PANDOC_ARGS+=( --css="$EPUB_CSS" )
fi

# helpful: ensure pandoc binary exists
if ! command -v pandoc >/dev/null 2>&1; then
  echo "❌ pandoc not found in PATH. Install pandoc before running this script."
  exit 1
fi

# run pandoc
echo "🔧 Running pandoc with ${#PANDOC_ARGS[@]} arguments..."
if pandoc "${PANDOC_ARGS[@]}"; then
  echo "✅ Successfully created EPUB: $EPUB_FILENAME"
  echo "📄 File size: $(du -h "$EPUB_FILENAME" | cut -f1)"
else
  echo "❌ pandoc failed"
  exit 1
fi

# finished
echo "🎉 Done."
