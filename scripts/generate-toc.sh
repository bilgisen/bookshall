#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 2 ]] || { echo "Kullanım: $0 <payload.json> <toc.xhtml>" >&2; exit 1; }

PAYLOAD_FILE=$1
OUTPUT_FILE=$2

if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "HATA: Payload dosyası bulunamadı: $PAYLOAD_FILE" >&2
  exit 1
fi

read -r -d '' JQ_SCRIPT << 'EOF_JQ_SCRIPT'
def escape_html:
  gsub("&"; "&amp;")
  | gsub("<"; "&lt;")
  | gsub(">"; "&gt;")
  | gsub("\""; "&quot;");

def pad_num:
  tostring | ("000" + .) | .[-3:];

(.book.language // "en") as $lang |
({
  "tr": "İçindekiler",
  "en": "Table of Contents",
  "fr": "Table des matières",
  "de": "Inhaltsverzeichnis",
  "es": "Índice",
  "ru": "Содержание",
  "zh": "目录",
  "ar": "جدول المحتويات"
}[$lang] // "Table of Contents") as $title |

# chapters'ı sırala ve çocukları ekle
[.book.chapters[] 
 | .children = ([.book.chapters[] | select(.parent == .id)] | sort_by(.order // 0))
] as $chapters |

# kök chapters
($chapters | map(select(.parent == null or .parent == "")) | sort_by(.order // 0)) as $roots |

def build_item($depth):
  "<li><a href=\"ch\(.order | pad_num).xhtml\">\(.title | escape_html)</a>"
  + (if (.children | length > 0) and ($depth < 10) then
       "<ol>" + ([.children[] | build_item($depth+1)] | join("")) + "</ol>"
     else "" end)
  + "</li>";

"<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE html>
<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\" lang=\"\($lang)\" xml:lang=\"\($lang)\">
<head>
  <meta charset=\"utf-8\" />
  <title>\($title | escape_html)</title>
</head>
<body>
  <nav epub:type=\"toc\" id=\"toc\">
    <h1>\($title | escape_html)</h1>
    <ol>
      \($roots | map(build_item(1)) | join(""))
    </ol>
  </nav>
</body>
</html>"
EOF_JQ_SCRIPT

if OUTPUT=$(jq -r "$JQ_SCRIPT" "$PAYLOAD_FILE" 2>&1); then
    echo "$OUTPUT" > "$OUTPUT_FILE"
    echo "✅ TOC sayfası oluşturuldu: $OUTPUT_FILE"
else
    echo "HATA: jq komutu başarısız oldu:" >&2
    echo "$OUTPUT" >&2
    exit 1
fi
