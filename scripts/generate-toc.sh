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
  def pad_num: (. + 2) | tostring | ("000" + .) | .[-3:];  # +2 ekleyerek ch003'ten başlat

  # Dil kodlarına göre TOC başlıkları
  def get_toc_title:
    if . == "tr" then "İçindekiler"
    elif . == "en" then "Table of Contents"
    elif . == "fr" then "Table des matières"
    elif . == "de" then "Inhaltsverzeichnis"
    elif . == "es" then "Índice"
    elif . == "ru" then "Содержание"
    elif . == "zh" then "目录"
    elif . == "ar" then "جدول المحتويات"
    else "Table of Contents"
    end;

  (.book.language // "en") as $lang
  | ($lang | get_toc_title) as $title
  | "<nav epub:type=\"toc\" id=\"toc\"><h1>\($title)</h1><ul>" + (
      .book.chapters
      | sort_by(.order // 0)
      | map(
          "<li><a href=\"ch\(.order | pad_num).html\">" +
          (.title | escape_html) +
          "</a></li>"
        ) | join("")
    ) + "</ul></nav>"
' "$PAYLOAD_FILE")

# --- XHTML Dosyasını Oluşturma ---
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE html>'
  echo '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
  # TOC başlığını kitap diline göre ayarla
  TOC_TITLE=$(jq -r '
    if .book.language == "tr" then "İçindekiler"
    elif .book.language == "en" then "Table of Contents"
    elif .book.language == "fr" then "Table des matières"
    elif .book.language == "de" then "Inhaltsverzeichnis"
    elif .book.language == "es" then "Índice"
    elif .book.language == "ru" then "Содержание"
    elif .book.language == "zh" then "目录"
    elif .book.language == "ar" then "جدول المحتويات"
    else "Table of Contents"
    end' "$PAYLOAD_FILE")
  echo '<head><meta charset="utf-8"/><title>'"$TOC_TITLE"'</title></head>'
  echo '<body>'
  echo "$TOC_BODY"
  echo '</body></html>'
} > "$OUTPUT_FILE"

echo "✅ TOC sayfası oluşturuldu: $OUTPUT_FILE"