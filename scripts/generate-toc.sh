#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 2 ]] || { echo "Kullanım: $0 <payload.json> <toc.xhtml>" >&2; exit 1; }

PAYLOAD_FILE=$1
OUTPUT_FILE=$2

jq -r '
  def escape_html:
      gsub("&";  "&amp;")
    | gsub("<";  "&lt;")
    | gsub(">";  "&gt;")
    | gsub("\\"";"&quot;");          # tırnak kaçışı: \"

  def pad_num: (. + 2) | tostring | ("000" + .) | .[-3:];

  (.book.language // "en") as $lang
  | ({
      "tr": "İçindekiler",
      "en": "Table of Contents",
      "fr": "Table des matières",
      "de": "Inhaltsverzeichnis",
      "es": "Índice",
      "ru": "Содержание",
      "zh": "目录",
      "ar": "جدول المحتويات"
    }[$lang] // "Table of Contents") as $title

  | "<?xml version=\"1.0\" encoding=\"UTF-8\"\"?>
<!DOCTYPE html>
<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\">
<head>
  <meta charset=\"utf-8\"/>
  <title>\($title)</title>
</head>
<body>
  <nav epub:type=\"toc\" id=\"toc\">
    <h1>\($title)</h1>
    <ul>
      \(
        .book.chapters
        | sort_by(.order // 0)
        | map("<li><a href=\"ch\(.order | pad_num).html\">\(.title | escape_html)</a></li>")
        | join("\n      ")
      )
    </ul>
  </nav>
</body>
</html>"
' "$PAYLOAD_FILE" > "$OUTPUT_FILE"

echo "✅ TOC sayfası oluşturuldu: $OUTPUT_FILE"