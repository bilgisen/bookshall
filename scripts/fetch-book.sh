#!/bin/bash
set -euo pipefail

# Debug: Print environment variables (masking sensitive data)
echo "=== ENVIRONMENT VARIABLES ==="
env | sort | while IFS= read -r line; do
  if [[ $line == *"KEY"* || $line == *"TOKEN"* || $line == *"SECRET"* || $line == *"AUTH"* ]]; then
    echo "${line%%=*}=[MASKED]"
  else
    echo "$line"
  fi
done
echo "============================"

# Trim whitespace from API key
BOOKSHALL_API_KEY=$(echo -n "$BOOKSHALL_API_KEY" | tr -d '\r\n' | xargs)

# Validate required environment variables
: "${BOOKSHALL_API_KEY:?BOOKSHALL_API_KEY must be set in workflow environment}"
: "${BOOK_ID:?BOOK_ID is required}"
: "${CONTENT_ID:?CONTENT_ID is required}"

# Set default values if not provided
INCLUDE_METADATA="${INCLUDE_METADATA:-true}"
INCLUDE_COVER="${INCLUDE_COVER:-true}"
INCLUDE_TOC="${INCLUDE_TOC:-true}"
TOC_LEVEL="${TOC_LEVEL:-3}"
INCLUDE_IMPRINT="${INCLUDE_IMPRINT:-true}"
METADATA_JSON="${METADATA_JSON:-{}}"

# Base URL for API requests
BASE_URL="${BASE_URL:-https://bookshall.com}"
BASE_URL="${BASE_URL%/}"
API_URL="${API_URL:-$BASE_URL/api}"

# Working directories
WORKDIR="./work"
PAYLOAD_DIR="$WORKDIR/payload"
CHAPTERS_DIR="$WORKDIR/chapters"
OUTPUT_DIR="$WORKDIR/output"
mkdir -p "$PAYLOAD_DIR" "$CHAPTERS_DIR" "$OUTPUT_DIR"

# Logging functions
log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] INFO: $*"
}

warn() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] WARNING: $*" >&2
}

error() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] ERROR: $*" >&2
  exit 1
}

# Function to clean and validate JSON
clean_and_validate_json() {
  local json="$1"
  
  # If input is empty or 'null', return empty object
  if [ -z "$json" ] || [ "$json" = "null" ] || [ "$json" = "''" ] || [ "$json" = '""' ]; then
    echo '{}'
    return 0
  fi
  
  # Remove surrounding single/double quotes if they exist
  json=$(echo "$json" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["\x27]//' -e 's/["\x27]$//')
  
  # If the string doesn't start with {, assume it's not a JSON object and wrap it
  if [[ ! "$json" =~ ^\{.*\}$ ]]; then
    if [[ "$json" =~ ^[\"\'].*[\"\']$ ]]; then
      # Already quoted string
      json="{\"value\": $json}"
    else
      # Unquoted string, add quotes
      json="{\"value\": \"$json\"}"
    fi
  fi
  
  # Validate JSON
  if ! echo "$json" | jq -e . >/dev/null 2>&1; then
    warn "Invalid JSON in metadata, using empty object"
    echo '{}'
    return 1
  fi
  
  echo "$json"
  return 0
}

# Process metadata
log "Processing metadata..."
CLEANED_METADATA=$(clean_and_validate_json "$METADATA_JSON")
log "Using metadata: $CLEANED_METADATA"

# Create payload JSON
log "Creating payload..."
cat > "$PAYLOAD_DIR/payload.json" <<EOF
{
  "book": {
    "id": "$BOOK_ID",
    "contentId": "$CONTENT_ID"
  },
  "options": {
    "includeMetadata": $INCLUDE_METADATA,
    "includeCover": $INCLUDE_COVER,
    "includeTOC": $INCLUDE_TOC,
    "tocDepth": $TOC_LEVEL,
    "includeImprint": $INCLUDE_IMPRINT
  },
  "metadata": $CLEANED_METADATA
}
EOF

# Download with retry function
download_with_retry() {
  local url=$1
  local output=$2
  local max_retries=3
  local retry_count=0
  local wait_time=2

  while [ $retry_count -lt $max_retries ]; do
    log "Downloading $url (attempt $((retry_count + 1))/$max_retries)..."
    if curl -s -f -H "Authorization: Bearer $BOOKSHALL_API_KEY" -o "$output" "$url"; then
      log "Successfully downloaded to $output"
      return 0
    fi
    retry_count=$((retry_count + 1))
    warn "Download failed, retrying in ${wait_time}s..."
    sleep $wait_time
    wait_time=$((wait_time * 2))
  done

  error "Failed to download $url after $max_retries attempts"
}

# Update status function
update_status() {
  local status=$1
  local message=${2:-""}
  local progress=${3:-0}
  
  log "Updating status: $status, progress: $progress%, message: $message"
  
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $BOOKSHALL_API_KEY" \
    -d "{\"status\":\"$status\",\"message\":\"$message\",\"progress\":$progress}" \
    "$API_URL/workflows/update" || warn "Failed to update status"
}

# Main execution
main() {
  log "Starting book processing for Book ID: $BOOK_ID, Content ID: $CONTENT_ID"
  
  # Fetch book content
  log "Fetching book content from $API_URL/books/$BOOK_ID/content/$CONTENT_ID"
  download_with_retry "$API_URL/books/$BOOK_ID/content/$CONTENT_ID" "$PAYLOAD_DIR/content.json"
  
  # Process content and generate EPUB
  log "Processing content and generating EPUB..."
  # Add your EPUB generation logic here
  
  update_status "completed" "Book processing completed successfully" 100
  log "Book processing completed successfully"
}

# Run main function
main "$@"