#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
  echo "Generate a colophon page for an EPUB book"
  echo ""
  echo "Usage: $0 <payload.json> <output.xhtml>"
  echo ""
  echo "Arguments:"
  echo "  payload.json   Path to the JSON payload file containing book metadata"
  echo "  output.xhtml   Path where the generated XHTML file should be saved"
  echo ""
  echo "Environment variables:"
  echo "  DEBUG          Set to 'true' to enable debug output"
  exit 0
}

# Parse arguments
if [ $# -ne 2 ]; then
  show_help
  exit 1
fi

PAYLOAD_FILE="$1"
OUTPUT_FILE="$2"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ Error: jq is required but not installed${NC}" >&2
  echo "Install it with: brew install jq"
  exit 1
fi

# Check if input file exists and is readable
if [ ! -r "$PAYLOAD_FILE" ]; then
  echo -e "${RED}❌ Error: Cannot read payload file: $PAYLOAD_FILE${NC}" >&2
  exit 1
fi

# Validate JSON structure
if ! jq -e '.book' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: Invalid payload format: missing .book object${NC}" >&2
  if [ "${DEBUG:-false}" = "true" ]; then
    echo -e "${YELLOW}Debug: First 10 lines of $PAYLOAD_FILE:${NC}"
    head -n 10 "$PAYLOAD_FILE"
  fi
  exit 1
fi

# Ensure output directory exists
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
if ! mkdir -p "$OUTPUT_DIR" 2>/dev/null; then
  echo -e "${RED}❌ Error: Failed to create output directory: $OUTPUT_DIR${NC}" >&2
  exit 1
fi

# --- Extract fields from payload ---
BOOK_TITLE=$(jq -r '.book.title // "Untitled Book"' "$PAYLOAD_FILE")
BOOK_SUBTITLE=$(jq -r '.book.subtitle // empty' "$PAYLOAD_FILE")
BOOK_AUTHOR=$(jq -r '.book.author // "Unknown Author"' "$PAYLOAD_FILE")
BOOK_PUBLISHER=$(jq -r '.book.publisher // empty' "$PAYLOAD_FILE")
BOOK_ISBN=$(jq -r '.book.isbn // empty' "$PAYLOAD_FILE")
BOOK_YEAR=$(jq -r '.book.publish_year // empty' "$PAYLOAD_FILE")

# --- Generate XHTML ---
{
  # Add error handling for XHTML generation
  set -o pipefail
  
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

  echo '  <hr/>'
  echo '  </body>'
  echo '</html>'
} > "$OUTPUT_FILE.tmp"

# Check if file was written successfully
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error: Failed to write output to $OUTPUT_FILE${NC}" >&2
  rm -f "$OUTPUT_FILE.tmp" 2>/dev/null
  exit 1
fi

# Atomically move the file to the final destination
if ! mv -f "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Error: Failed to move output file to $OUTPUT_FILE${NC}" >&2
  echo -e "${YELLOW}Check directory permissions and disk space${NC}" >&2
  rm -f "$OUTPUT_FILE.tmp" 2>/dev/null
  exit 1
fi

# Show success message
echo -e "${GREEN}✅ Success: Colophon page created at $OUTPUT_FILE${NC}"

# Show debug info if enabled
if [ "${DEBUG:-false}" = "true" ]; then
  echo -e "${YELLOW}Debug: Book title: $BOOK_TITLE${NC}"
  echo -e "${YELLOW}Debug: Author: $BOOK_AUTHOR${NC}"
  [ -n "$BOOK_PUBLISHER" ] && echo -e "${YELLOW}Debug: Publisher: $BOOK_PUBLISHER${NC}"
  [ -n "$BOOK_ISBN" ] && echo -e "${YELLOW}Debug: ISBN: $BOOK_ISBN${NC}"
  [ -n "$BOOK_YEAR" ] && echo -e "${YELLOW}Debug: Year: $BOOK_YEAR${NC}"
fi
