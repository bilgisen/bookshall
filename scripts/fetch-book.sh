#!/usr/bin/env bash
set -euo pipefail

# Debug info
echo "=== Debug Info ==="
echo "Working directory: $(pwd)"
echo "Content ID: $CONTENT_ID"

# Setup directories
WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"

# Set default values
BOOK_TITLE="Untitled Book"
BOOK_AUTHOR="Unknown Author"
BOOK_LANG="en"
BOOK_SLUG="book-$CONTENT_ID"

# Fetch book payload
echo "📥 Fetching book payload..."
if ! curl -v -s \
  -H "Authorization: Bearer ${BOOKSHALL_API_KEY:-$GITHUB_TOKEN}" \
  -H "Content-Type: application/json" \
  "$NEXT_PUBLIC_APP_URL/api/books/by-id/$CONTENT_ID/payload" \
  -o "$WORKDIR/payload.json" || [ ! -f "$WORKDIR/payload.json" ]; then
  echo "❌ Failed to fetch book payload"
  exit 1
fi

# Validate and parse payload
if [ ! -s "$WORKDIR/payload.json" ]; then
  echo "❌ Empty or invalid payload received"
  exit 1
fi

# Parse book info with better error handling
if ! BOOK_INFO=$(jq -e '.book' "$WORKDIR/payload.json" 2>/dev/null); then
  echo "❌ Invalid JSON in payload"
  jq . "$WORKDIR/payload.json"
  exit 1
fi

# Extract book information
BOOK_TITLE=$(echo "$BOOK_INFO" | jq -r '.title // empty')
BOOK_AUTHOR=$(echo "$BOOK_INFO" | jq -r '.author // empty')
BOOK_LANG=$(echo "$BOOK_INFO" | jq -r '.language // "en"')
BOOK_SLUG=$(echo "$BOOK_INFO" | jq -r '.slug // empty')

# Set defaults if values are empty
[ -z "$BOOK_TITLE" ] && BOOK_TITLE="Untitled Book"
[ -z "$BOOK_AUTHOR" ] && BOOK_AUTHOR="Unknown Author"
[ -z "$BOOK_SLUG" ] && BOOK_SLUG="book-$CONTENT_ID"

echo "📚 $BOOK_TITLE ($BOOK_LANG) by $BOOK_AUTHOR"

# Create metadata.yaml for pandoc
cat > metadata.yaml <<EOL
---
title: "$BOOK_TITLE"
author: "$BOOK_AUTHOR"
language: "$BOOK_LANG"
...
EOL

# Fetch chapters if they exist
if [ "$(jq -r '.chapters | length' "$WORKDIR/payload.json" 2>/dev/null || echo 0)" -gt 0 ]; then
  echo "📖 Fetching chapters..."
  jq -r '.chapters[] | "\(.order) \(.id)"' "$WORKDIR/payload.json" \
    | while read -r order id; do
      echo "  - Chapter $order ($id)"
      if ! curl -s -H "Authorization: Bearer ${BOOKSHALL_API_KEY:-$GITHUB_TOKEN}" \
        "$NEXT_PUBLIC_APP_URL/api/chapters/$id/html" \
        -o "$CHAPTER_DIR/chapter-$order.xhtml"; then
        echo "❌ Failed to fetch chapter $order"
      fi
    done
else
  echo "⚠️ No chapters found in payload"
  # Create a default chapter if none exist
  echo "<html><body><h1>$BOOK_TITLE</h1><p>No content available.</p></body></html>" > "$CHAPTER_DIR/chapter-1.xhtml"
fi

# Download cover if enabled
if [[ "$INCLUDE_COVER" == "true" ]]; then
  COVER_URL=$(jq -r '.book.coverUrl // empty' "$WORKDIR/payload.json" 2>/dev/null)
  if [ -n "$COVER_URL" ]; then
    echo "🖼️  Downloading cover..."
    if ! curl -s -o "$WORKDIR/cover.jpg" "$COVER_URL"; then
      echo "⚠️ Failed to download cover image"
      INCLUDE_COVER="false"
    fi
  fi
fi

# Build EPUB
EPUB_FILE="${BOOK_SLUG// /_}.epub"
echo "📦 Building EPUB: $EPUB_FILE"

# Prepare pandoc command
PANDOC_CMD=(
  pandoc
  "$CHAPTER_DIR"/*.xhtml
  --metadata-file=metadata.yaml
  --output="$EPUB_FILE"
  --epub-version=3.0
  --toc
  --toc-depth="$TOC_LEVEL"
)

# Add cover if available
if [[ "$INCLUDE_COVER" == "true" && -f "$WORKDIR/cover.jpg" ]]; then
  PANDOC_CMD+=(--epub-cover-image="$WORKDIR/cover.jpg")
fi

# Execute pandoc
if ! "${PANDOC_CMD[@]}"; then
  echo "❌ Failed to generate EPUB"
  exit 1
fi

# Verify EPUB was created
if [ ! -f "$EPUB_FILE" ]; then
  echo "❌ EPUB file was not created"
  exit 1
fi

echo "✅ Successfully created: $EPUB_FILE"
echo "📄 File size: $(du -h "$EPUB_FILE" | cut -f1)"
