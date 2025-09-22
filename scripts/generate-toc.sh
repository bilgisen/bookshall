#!/usr/bin/env bash
set -euo pipefail

# ----------  KULLANIM  ----------
if [[ $# -ne 2 ]]; then
  echo "Kullanım: $0 <payload.json> <output.xhtml>" >&2
  exit 1
fi

PAYLOAD_FILE=$1
OUTPUT_FILE=$2

# ----------  TEK JQ ÇAĞRISI  ----------
read -r -d '' XHTML <<'JQ' || true
jq -r '
  def escape_html:
      gsub("&";  "&amp;")
    | gsub("<";  "&lt;")
    | gsub(">";  "&gt;")
    | gsub("\"";"&quot;");

  def pad_num: (. + 2) | tostring | ("000" + .) | .[-3:];

  # 1) Dil → TOC başlığı look-up table
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

  # 2) TOC gövdesi
  | "<nav epub:type=\"toc\" id=\"toc\">
      <h1>\($title)</h1>
      <ul>
        \(
          .book.chapters
          | sort_by(.order // 0)
          | map("<li><a href=\"ch\(.order | pad_num).html\">\(.title | escape_html)</a></li>")
          | join("\n        ")
        )
      </ul>
    </nav>" as $toc_body

  # 3) Tam XHTML çıktısı
  | "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE html>
<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\">
<head>
  <meta charset=\"utf-8\"/>
  <title>\($title)</title>
</head>
<body>
  \($toc_body)
</body>
</html>"
' "$PAYLOAD_FILE"
JQ

# ----------  DOSYAYA YAZ  ----------
printf '%s\n' "$XHTML" > "$OUTPUT_FILE"

echo "✅ TOC sayfası oluşturuldu: $OUTPUT_FILE"