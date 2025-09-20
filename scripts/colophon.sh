#!/usr/bin/env bash
set -euo pipefail

# Usage: ./colophon.sh payload.json output.xhtml

if [ $# -ne 2 ]; then
  echo "Usage: $0 <payload.json> <output.xhtml>"
  exit 1
fi

PAYLOAD_FILE="$1"
OUTPUT_FILE="$2"

# --- Extract fields from payload ---
BOOK_TITLE=$(jq -r '.book.title // "Untitled Book"' "$PAYLOAD_FILE")
BOOK_SUBTITLE=$(jq -r '.book.subtitle // empty' "$PAYLOAD_FILE")
BOOK_AUTHOR=$(jq -r '.book.author // "Unknown Author"' "$PAYLOAD_FILE")
BOOK_PUBLISHER=$(jq -r '.book.publisher // empty' "$PAYLOAD_FILE")
BOOK_ISBN=$(jq -r '.book.isbn // empty' "$PAYLOAD_FILE")
BOOK_YEAR=$(jq -r '.book.publish_year // empty' "$PAYLOAD_FILE")

# --- Generate XHTML ---
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE html>'
  echo '<html xmlns="http://www.w3.org/1999/xhtml" lang="en">'
  echo '<head><meta charset="utf-8"/></head>'
  echo '<body style="text-align:center;">'

  # Title
  echo "  <h3>$BOOK_TITLE</h3>"

  # Subtitle (optional)
  if [ -n "$BOOK_SUBTITLE" ]; then
    echo "  <p>$BOOK_SUBTITLE</p>"
  fi

  echo "  <hr/>"

  # Author
  echo "  <p><strong>$BOOK_AUTHOR</strong></p>"

  echo "  <hr/>"

  # Publisher, ISBN, Year
  publine=""
  [ -n "$BOOK_PUBLISHER" ] && publine="$BOOK_PUBLISHER"
  [ -n "$BOOK_ISBN" ] && publine="${publine:+$publine, }ISBN: $BOOK_ISBN"
  [ -n "$BOOK_YEAR" ] && publine="${publine:+$publine, }$BOOK_YEAR"

  if [ -n "$publine" ]; then
    echo "  <p>$publine</p>"
  fi

  echo '</body>'
  echo '</html>'
} > "$OUTPUT_FILE"

echo "📄 Colophon page created at $OUTPUT_FILE"
