#!/usr/bin/env bash
set -euo pipefail

# Required inputs
: "${BOOK_ID:?book_id is required}"
: "${USER_ID:?user_id is required}"
: "${SESSION_ID:?session_id is required}"
: "${CONTENT_ID:?content_id is required}"

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

# Metadata validation
METADATA="${METADATA:-{}}"
if ! echo "$METADATA" | jq -e . >/dev/null 2>&1; then
  echo "::warning::Invalid JSON in metadata, using empty object"
  METADATA="{}"
fi

# Export vars for later steps
echo "TOC_LEVEL=$TOC_LEVEL" >> $GITHUB_ENV
echo "INCLUDE_METADATA=$INCLUDE_METADATA" >> $GITHUB_ENV
echo "INCLUDE_COVER=$INCLUDE_COVER" >> $GITHUB_ENV
echo "INCLUDE_TOC=$INCLUDE_TOC" >> $GITHUB_ENV
echo "INCLUDE_IMPRINT=$INCLUDE_IMPRINT" >> $GITHUB_ENV

# Create pandoc metadata.yaml
echo "$METADATA" | jq -r '
  to_entries
  | map("\(.key): \"\(.value|tostring)\"")
  | .[]
' > metadata.yaml

echo "✅ Inputs validated and metadata.yaml generated"
