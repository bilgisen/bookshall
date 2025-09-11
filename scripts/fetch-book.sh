#!/bin/bash
set -euo pipefail

# Validate required environment variables
: "${BOOKSHALL_API_KEY:?BOOKSHALL_API_KEY must be set in workflow environment}"

# Base URL for API requests
BASE_URL="${API_URL:-${NEXT_PUBLIC_APP_URL:-https://bookshall.com}}"

# Ensure the base URL doesn't end with a slash
BASE_URL="${BASE_URL%/}"
API_URL="${API_URL:-$BASE_URL/api}"
WORKDIR="./work"
PAYLOAD_DIR="$WORKDIR/payload"
CHAPTERS_DIR="$WORKDIR/chapters"
OUTPUT_DIR="$WORKDIR/output"

# Required parameters
BOOK_ID="${BOOK_ID:?BOOK_ID is required}"
CONTENT_ID="${CONTENT_ID:?CONTENT_ID is required}"

# Debug: Print environment variables for troubleshooting
echo "=== Environment Variables ==="
printenv | sort
echo "==========================="

# Handle metadata with proper JSON validation
METADATA="${METADATA:-{}}"

# Debug: Print the raw metadata for troubleshooting
echo "=== RAW METADATA INPUT ==="
echo "$METADATA"
echo "========================="

# Function to clean and validate JSON
clean_and_validate_json() {
  local json="$1"
  
  # Debug: Print the input to the function
  echo "clean_and_validate_json input: $json"
  
  # If input is empty or 'null', return empty object
  if [ -z "$json" ] || [ "$json" = "null" ] || [ "$json" = "''" ] || [ "$json" = '""' ]; then
    echo '{}'
    return 0
  fi
  
  # Remove surrounding single/double quotes if they exist
  json=$(echo "$json" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["\x27]//' -e 's/["\x27]$//')
  
  # Debug: Print after removing quotes
  echo "After cleaning: $json"
  
  # If the string doesn't start with {, assume it's not a JSON object and wrap it
  if [[ ! "$json" =~ ^\{.*\}$ ]]; then
    # If it's not a JSON object, try to parse it as a string value
    if [[ "$json" =~ ^[\"\'].*[\"\']$ ]]; then
      # Already quoted string
      json="{\"value\": $json}"
    else
      # Unquoted string, add quotes
      json="{\"value\": \"$json\"}"
    fi
    echo "Wrapped metadata as: $json"
  fi
  
  # Try to parse with jq
  if ! echo "$json" | jq -e . >/dev/null 2>&1; then
    echo "::warning::Invalid JSON in metadata, using empty object" >&2
    echo '{}'
    return 1
  fi
  
  # If we got here, the JSON is valid
  echo "$json"
  return 0
}

# Clean and validate the JSON
echo "=== VALIDATING METADATA ==="
# First try to parse as is
if ! CLEANED_METADATA=$(echo "$METADATA" | jq -c . 2>/dev/null); then
  echo "Failed to parse metadata as JSON, trying to fix..."
  
  # If it's not valid JSON, try to parse it as a string
  if [[ "$METADATA" =~ ^[\"\'].*[\"\']$ ]]; then
    # It's already a quoted string
    METADATA="{\"value\": $METADATA}"
  else
    # It's an unquoted string, add quotes
    METADATA="{\"value\": \"$METADATA\"}"
  fi
  
  echo "Reparsed metadata as: $METADATA"
  
  # Try parsing again
  if ! CLEANED_METADATA=$(echo "$METADATA" | jq -c . 2>/dev/null); then
    echo "::warning::Failed to parse metadata, using empty object"
    METADATA='{}'
  else
    METADATA="$CLEANED_METADATA"
  fi
else
  METADATA="$CLEANED_METADATA"
fi

# Extract slug if it exists
SLUG=$(echo "$METADATA" | jq -r '.slug // empty' 2>/dev/null || true)
if [ -n "$SLUG" ]; then
  echo "SLUG=$SLUG" >> $GITHUB_ENV
  echo "Extracted slug: $SLUG"
fi

echo "=== FINAL METADATA ==="
echo "$METADATA"

echo "Using metadata: $METADATA"

mkdir -p "$PAYLOAD_DIR" "$CHAPTERS_DIR" "$OUTPUT_DIR"

# --- FUNCTIONS ---
log() { echo -e "[INFO] $*"; }
warn() { echo -e "[WARN] $*"; }
error() { echo -e "[ERROR] $*" >&2; exit 1; }

download_with_retry() {
  local url="$1" output="$2"
  local max_retries=3
  
  # Debug info
  log "Downloading $url to $output"
  
  for i in $(seq 1 $max_retries); do
    log "Attempt $i of $max_retries..."
    
    # Always use BOOKSHALL_API_KEY for authentication
    local curl_cmd="curl -v"
    curl_cmd+=" -H \"x-api-key: $BOOKSHALL_API_KEY\""
    
    curl_cmd+=" -H \"X-Request-ID: $(uuidgen || date +%s)\""
    curl_cmd+=" -H \"X-GitHub-Event: workflow_dispatch\""
    curl_cmd+=" -o \"$output.tmp\""
    curl_cmd+=" \"$url\" 2>\"$output.curl.log\""
    
    # Execute the curl command
    if ! eval "$curl_cmd"; then
      
      # Log the error but continue to retry
      warn "Attempt $i failed. Response code: $(grep -o 'HTTP/[0-9.]* [0-9]*' "$output.curl.log" || echo 'unknown')"
      [ $i -lt $max_retries ] && sleep $((i*2))
    else
      # Success - move the temp file to output
      mv "$output.tmp" "$output"
      log "Successfully downloaded to $output"
      return 0
    fi
  done
  
  # If we get here, all retries failed
  error "Failed to download $url after $max_retries attempts. Last error log:\n$(cat "$output.curl.log" 2>/dev/null || echo 'No error log available')"
}

update_status() {
  local phase="$1" local progress="$2" local message="$3"
  [ -n "${TOKEN}" ] && echo "::add-mask::${TOKEN}"
  [ -n "${R2_ACCESS_KEY_ID}" ] && echo "::add-mask::${R2_ACCESS_KEY_ID}"
  [ -n "${R2_SECRET_ACCESS_KEY}" ] && echo "::add-mask::${R2_SECRET_ACCESS_KEY}"
  if [ -n "${BACKEND_URL:-}" ] && [ -n "${TOKEN:-}" ]; then
    curl -s -X POST "$BACKEND_URL/api/publish/update" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"status\":\"in-progress\",\"phase\":\"$phase\",\"progress\":$progress,\"message\":\"$message\"}" >/dev/null 2>&1 || true
  fi
}

# --- FETCH PAYLOAD ---
log "Fetching book payload from $API_URL/books/by-id/$BOOK_ID/payload..."
mkdir -p "./work/payload"

# First, try to get the payload with verbose output
log "Making API request..."

# Create debug directory
mkdir -p "./work/debug"

# Make the API request with full debug output
log "Sending request to: $API_URL/books/by-id/$BOOK_ID/payload"
log "Using API key: ${BOOKSHALL_API_KEY:0:5}...${BOOKSHALL_API_KEY: -5} (${#BOOKSHALL_API_KEY} chars)"

# Make the request and capture all output
if ! curl -v \
  -H "x-api-key: $BOOKSHALL_API_KEY" \
  -H "X-Request-ID: $(uuidgen || date +%s)" \
  -H "X-GitHub-Event: workflow_dispatch" \
  -H "Accept: application/json" \
  -w "\n=== RESPONSE CODE: %{http_code} ===\n" \
  -o "./work/payload/payload.json" \
  "$API_URL/books/by-id/$BOOK_ID/payload" \
  > "./work/debug/curl_output.log" 2>"./work/debug/curl_debug.log"; then
  
  # If curl command failed, show detailed error info
  error "Curl command failed with status $?"
  
  # Get HTTP status code if available
  HTTP_STATUS=$(grep -oP '^< HTTP/\d\.\d \K\d+' "./work/debug/curl_debug.log" | tail -n1 || echo 'unknown')
  error "API request failed with HTTP status: ${HTTP_STATUS}"
  
  # Show request headers
  log "=== REQUEST HEADERS ==="
  grep -E '^> ' "./work/debug/curl_debug.log" || true
  
  # Show response headers
  log "=== RESPONSE HEADERS ==="
  grep -E '^< ' "./work/debug/curl_debug.log" | grep -v '^< HTTP' || true
  
  # Show response body if it exists
  if [ -f "./work/payload/payload.json" ] && [ -s "./work/payload/payload.json" ]; then
    log "=== RESPONSE BODY ==="
    cat "./work/payload/payload.json"
    log "=== END RESPONSE BODY ==="
  else
    log "No response body received or empty response"
  fi
  
  # Show full debug log
  log "=== FULL CURL DEBUG LOG ==="
  cat "./work/debug/curl_debug.log"
  
  # Special handling for common error codes
  if [ "$HTTP_STATUS" = "401" ]; then
    error "Authentication failed. Please check your API key."
  elif [ "$HTTP_STATUS" = "404" ]; then
    error "Book not found. Please check the book ID: $BOOK_ID"
  elif [ "$HTTP_STATUS" = "500" ]; then
    error "Server error. Please check the server logs."
  fi
  
  exit 1
fi

# If we get here, the request was successful
log "API request completed successfully"
log "Response saved to ./work/payload/payload.json"

# Verify the response is valid JSON
if ! jq empty "./work/payload/payload.json" 2> "./work/debug/json_validation.log"; then
  error "Invalid JSON in API response"
  log "=== JSON VALIDATION ERROR ==="
  cat "./work/debug/json_validation.log"
  log "=== RESPONSE CONTENT ==="
  cat "./work/payload/payload.json"
  exit 1
fi

# Verify the payload file exists and is not empty
if [ ! -s "./work/payload/payload.json" ]; then
  error "Payload file is empty. Check API response:"
  cat "./work/payload/curl_debug.log"
  exit 1
fi

# Display the API response content for debugging
log "=== API RESPONSE CONTENT ==="
cat "./work/payload/payload.json"
log "=== END API RESPONSE CONTENT ==="

# Check if we got a JSON error response
if jq -e '.error' "./work/payload/payload.json" >/dev/null 2>&1; then
  error "API returned an error:"
  jq '.' "./work/payload/payload.json"
  
  # Extract and display specific error details
  ERROR_MSG=$(jq -r '.error' "./work/payload/payload.json")
  case $ERROR_MSG in
    "Unauthorized")
      error "Authentication failed. Please check your API token."
      ;;
    "Forbidden")
      error "You don't have permission to access this resource."
      ;;
    "Book not found")
      error "The requested book was not found. Book ID: $BOOK_ID"
      ;;
    *)
      error "Unknown error: $ERROR_MSG"
      ;;
  esac
  
  exit 1
fi

# Validate JSON structure
if ! jq -e . "./work/payload/payload.json" >/dev/null 2>&1; then
  error "Invalid JSON in payload. First 200 chars:"
  head -c 200 "./work/payload/payload.json"
  log "\n=== Full Response ==="
  cat "./work/payload/payload.json"
  log "\n=== Debug Info ==="
  log "API URL: $API_URL/books/by-id/$BOOK_ID/export"
  log "Response headers:"
  grep -E '^< ' "./work/payload/curl_debug.log" || true
  exit 1
fi

# Check if we got a JSON error response
if jq -e '.error' "./work/payload/payload.json" >/dev/null 2>&1; then
  error "API returned an error:"
  jq '.' "./work/payload/payload.json"
  exit 1
fi

log "Successfully received valid payload"
log "Payload structure:"
jq 'keys' "./work/payload/payload.json"
log "Chapters count: $(jq '.chapters | length' "./work/payload/payload.json" 2>/dev/null || echo 'N/A')"

BOOK_TITLE=$(jq -r '.book.title // "Untitled"' "./work/payload/payload.json")
BOOK_AUTHOR=$(jq -r '.book.author // "Unknown"' "./work/payload/payload.json")
BOOK_LANG=$(jq -r '.book.language // "en"' "./work/payload/payload.json")
TOC_DEPTH=$(jq -r '.options.tocDepth // 2' "./work/payload/payload.json")
INCLUDE_COVER=$(jq -r '.options.includeCover // true' "./work/payload/payload.json")
INCLUDE_TOC=$(jq -r '.options.includeTOC // true' "./work/payload/payload.json")
INCLUDE_IMPRINT=$(jq -r '.options.includeImprint // true' "./work/payload/payload.json")

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
