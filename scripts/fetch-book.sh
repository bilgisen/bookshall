#!/usr/bin/env bash
set -euo pipefail

WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"

echo "📥 Fetching book payload..."
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "$NEXT_PUBLIC_APP_URL/api/books/by-id/$CONTENT_ID/payload" \
  -o "$WORKDIR/payload.json"

BOOK_TITLE=$(jq -r '.book.title // "Untitled Book"' "$WORKDIR/payload.json")
BOOK_AUTHOR=$(jq -r '.book.author // "Unknown Author"' "$WORKDIR/payload.json")
BOOK_LANG=$(jq -r '.book.language // "en"' "$WORKDIR/payload.json")
BOOK_SLUG=$(jq -r '.book.slug // "book"' "$WORKDIR/payload.json")

echo "📚 $BOOK_TITLE ($BOOK_LANG) by $BOOK_AUTHOR"

# Fetch chapters
jq -r '.chapters[] | "\(.order) \(.id)"' "$WORKDIR/payload.json" \
  | while read -r order id; do
    curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
      "$NEXT_PUBLIC_APP_URL/api/chapters/$id/html" \
      -o "$CHAPTER_DIR/chapter-$order.xhtml"
  done

# Download cover if enabled
if [[ "$INCLUDE_COVER" == "true" ]]; then
  COVER_URL=$(jq -r '.book.coverUrl // empty' "$WORKDIR/payload.json")
  if [ -n "$COVER_URL" ]; then
    curl -s -o "$WORKDIR/cover.jpg" "$COVER_URL" || true
  fi
fi

# Pandoc EPUB build
echo "📦 Building EPUB..."
EPUB_FILE="${BOOK_SLUG}.epub"
pandoc "$CHAPTER_DIR"/*.xhtml \
  --metadata title="$BOOK_TITLE" \
  --metadata author="$BOOK_AUTHOR" \
  --metadata language="$BOOK_LANG" \
  ${INCLUDE_TOC:+--toc --toc-depth="$TOC_LEVEL"} \
  ${INCLUDE_COVER:+--epub-cover-image="$WORKDIR/cover.jpg"} \
  -o "$EPUB_FILE"

echo "✅ EPUB created: $EPUB_FILE"
