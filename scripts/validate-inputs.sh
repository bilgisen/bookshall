#!/usr/bin/env bash
set -euo pipefail

# Required inputs with fallbacks
# Always require BOOK_ID
: "${BOOK_ID:?book_id is required}"

# Ensure METADATA is JSON (may contain userId, sessionId)
METADATA="${METADATA:-{}}"
if ! echo "$METADATA" | jq -e . >/dev/null 2>&1; then
  echo "::warning::Invalid JSON in metadata, using empty object"
  METADATA="{}"
fi

# Derive USER_ID and SESSION_ID from METADATA if not provided
USER_ID="${USER_ID:-}"
if [ -z "$USER_ID" ]; then
  USER_ID=$(echo "$METADATA" | jq -r '.userId // empty')
fi

SESSION_ID="${SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$METADATA" | jq -r '.sessionId // empty')
fi

# Derive CONTENT_ID from BOOK_ID if not provided
CONTENT_ID="${CONTENT_ID:-$BOOK_ID}"

# USER_ID and SESSION_ID are optional; warn if missing but do not fail
if [ -z "$USER_ID" ]; then
  echo "::warning::USER_ID is not provided; continuing without it"
fi
if [ -z "$SESSION_ID" ]; then
  echo "::warning::SESSION_ID is not provided; continuing without it"
fi

# TOC Level
TOC_LEVEL="${TOC_LEVEL:-3}"
if [[ "$TOC_LEVEL" -lt 1 || "$TOC_LEVEL" -gt 6 ]]; then
  echo "::warning::toc_level must be between 1 and 6, defaulting to 3"
  TOC_LEVEL=3
fi

# Booleans with defaults
INCLUDE_METADATA="${INCLUDE_METADATA:-true}"
INCLUDE_COVER="${INCLUDE_COVER:-true}"
INCLUDE_TOC="${INCLUDE_TOC:-true}"
INCLUDE_IMPRINT="${INCLUDE_IMPRINT:-true}"

# METADATA is already validated above

# Export vars for later steps
echo "TOC_LEVEL=$TOC_LEVEL" >> $GITHUB_ENV
echo "INCLUDE_METADATA=$INCLUDE_METADATA" >> $GITHUB_ENV
echo "INCLUDE_COVER=$INCLUDE_COVER" >> $GITHUB_ENV
echo "INCLUDE_TOC=$INCLUDE_TOC" >> $GITHUB_ENV
echo "INCLUDE_IMPRINT=$INCLUDE_IMPRINT" >> $GITHUB_ENV
echo "CONTENT_ID=$CONTENT_ID" >> $GITHUB_ENV
echo "USER_ID=$USER_ID" >> $GITHUB_ENV
echo "SESSION_ID=$SESSION_ID" >> $GITHUB_ENV

# Create pandoc metadata.yaml
echo "$METADATA" | jq -r '
  to_entries
  | map("\(.key): \"\(.value|tostring)\"")
  | .[]
' > metadata.yaml

echo "✅ Inputs validated and metadata.yaml generated"
