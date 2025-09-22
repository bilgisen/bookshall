#!/usr/bin/env bash
set -euo pipefail

# Argümanları kontrol et
if [[ $# -ne 2 ]]; then
  echo "Kullanım: $0 <payload_file> <output_file>" >&2
  exit 1
fi

export PAYLOAD_FILE="$1"
OUTPUT_FILE="$2"

# --- jq ile Sağlam TOC Oluşturma ---
TOC_BODY=$(jq -r '
  def escape_html: gsub("&"; "&amp;") | gsub("<"; "&lt;") | gsub(">"; "&gt;") | gsub("\""; "&quot;");
  def pad_num: tostring | ("000" + .) | .[-3:];

  (.book.language // "en") as $lang
  | (if $lang == "tr" then "İçindekiler" else "Table of Contents" end) as $title
  | "<nav epub:type=\"toc\" id=\"toc\"><h1>\($title)</h1><ol>" + (
      .book.chapters
      | sort_by(.order // 0)
      | map(
          "<li><a href=\"ch\(.order | pad_num).html\">" +
          (.title | escape_html) +
          "</a></li>"
        ) | join("")
    ) + "</ol></nav>"
' "$PAYLOAD_FILE")

# --- XHTML Dosyasını Oluşturma ---
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE html>'
  echo '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
  echo '<head><meta charset="utf-8"/><title>İçindekiler</title></head>'
  echo '<body>'
  echo "$TOC_BODY"
  echo '</body></html>'
} > "$OUTPUT_FILE"

echo "✅ TOC sayfası oluşturuldu: $OUTPUT_FILE"