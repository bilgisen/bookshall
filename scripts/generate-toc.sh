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
# --- Güvenli hiyerarşi oluşturma ve render ---
# $all_chapters zaten tanımlı olsun (array veya [])
(.book.language // "en") as $lang |
({
  "tr": "İçindekiler", "en": "Table of Contents", "fr": "Table des matières",
  "de": "Inhaltsverzeichnis", "es": "Índice", "ru": "Содержание",
  "zh": "目录", "ar": "جدول المحتويات"
}[$lang] // "Table of Contents") as $title |

# .book.chapters'ın bir dizi olduğundan emin ol, değilse boş dizi kullan.
(.book.chapters | if type == "array" then . else [] end) as $all_chapters |

# Parent ID'ye göre çocukları grupla
reduce $all_chapters[] as $c ({}; .[($c.parent // "")] += [$c]) as $children_by_parent |

# recursive node builder with depth guard (avoid cycles)
def build_node($node; $depth):
  if $depth > 50 then
    ($node + {children: []})
  else
    ($children_by_parent[($node.id // "")] // []
     | sort_by(.order // 0)
     | map(build_node(.; $depth + 1))) as $kids
    | ($node + {children: $kids});
  end;

# collect roots: parent == null OR parent == "" OR parent missing
($children_by_parent[""] // []) as $roots_from_empty |
($children_by_parent[null] // []) as $roots_from_null |
($all_chapters | map(select(.parent == null or .parent == "")) ) as $explicit_roots |

# unify roots (remove duplicates) and sort
($roots_from_empty + $roots_from_null + $explicit_roots)
| unique_by(.id)
| sort_by(.order // 0)
| map(build_node(.; 1)) as $roots |

# render function: safe title & order fallback
def pad_num:
  tostring | ("000" + .) | .[-3:];

def escape_html:
  (.|tostring) | gsub("&"; "&amp;") | gsub("<"; "&lt;") | gsub(">"; "&gt;") | gsub("\""; "&quot;");

def build_item($depth):
  "<li><a href=\"" +
   ( (.url // ("ch" + ( (.order // 0) | pad_num ) + ".xhtml")) | escape_html ) +
   "\">" + ((.title // "") | escape_html) + "</a>"
  + (if (.children | length > 0) and ($depth < 50) then
       "<ol>" + ([.children[] | build_item($depth+1)] | join("")) + "</ol>"
     else "" end)
  + "</li>";
# --- son ---

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
    echo "✅ TOC sayfası başarıyla oluşturuldu: $OUTPUT_FILE"
else
    echo "HATA: jq komutu başarısız oldu (exit code: $?):" >&2
    echo "$OUTPUT" >&2
    exit 1
fi