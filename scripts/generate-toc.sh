#!/usr/bin/env bash
set -euo pipefail

[[ $# -eq 2 ]] || { echo "Kullanım: $0 <payload.json> <toc.xhtml>" >&2; exit 1; }

PAYLOAD_FILE=$1
OUTPUT_FILE=$2

# jq script'ini bir değişkene atayalım ki okunabilirliği artsın
read -r -d '' JQ_SCRIPT << 'EOF_JQ_SCRIPT'
  def escape_html:
      gsub("&"; "&amp;")
    | gsub("<"; "&lt;")
    | gsub(">"; "&gt;")
    | gsub("\""; "&quot;");

  def pad_num:
    (. + 2) | tostring | ("000" + .) | .[-3:];

  # Her bir chapter objesine, children (alt başlıklar) alanını ekler
  def add_children($chapters):
    . as $parent |
    $chapters | map(select(.parent == $parent.id)) | sort_by(.order // 0);

  # Recursive olarak <ul><li>...</li></ul> yapısını oluşturur
  def build_toc($all_chapters; $indent_level):
    if length == 0 then
      ""
    else
      # Girinti miktarını hesapla
      ("\n" + ("  " * ($indent_level))) as $nl_indent |
      ("\n" + ("  " * ($indent_level - 1))) as $nl_indent_close |
      # Her bir chapter için <li> oluştur ve gerekirse children için recursive çağır
      ($all_chapters as $chaps |
       map(
         "<li><a href=\"ch\(.order | pad_num).xhtml\">\(.title | escape_html)</a>" +
         (if (.children // []) | length > 0 then
           "<ul>" + (.children | build_toc($chaps; $indent_level + 1)) + ($nl_indent_close + "</ul>")
          else
           ""
          end) +
         "</li>"
       ) |
       join($nl_indent)
      ) as $list_items |
      # Sonuç: <ul> etiketleri ve içerik
      $nl_indent + $list_items + $nl_indent_close
    end;

  # Ana işlemler
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

  # Chapter listesini al ve children alanını ekle
  .book.chapters | sort_by(.order // 0) as $sorted_chapters |
  (reduce $sorted_chapters[] as $chapter ({}; .[$chapter.id] = $chapter)) as $chapter_dict |
  (reduce $sorted_chapters[] as $chapter ([]; 
    . + [($chapter | .children = ($chapter | add_children($sorted_chapters)))]
  )) as $chapters_with_children |

  # Root-level (parent'sı null veya olmayan) chapter'ları bul
  ($chapters_with_children | map(select(.parent == null or (.parent | type) == "null")) | sort_by(.order // 0)) as $root_chapters |

  # XML çıktısını oluştur
  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE html>
<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\" lang=\"\($lang)\" xml:lang=\"\($lang)\">
<head>
  <meta charset=\"utf-8\" />
  <title>\($title)</title>
</head>
<body>
  <nav epub:type=\"toc\" id=\"toc\">
    <h1>\($title)</h1>
    <ul>
      \(
        $root_chapters | build_toc($chapters_with_children; 3)
      )
    </ul>
  </nav>
</body>
</html>"

EOF_JQ_SCRIPT

# jq script'ini çalıştır
jq -r "$JQ_SCRIPT" "$PAYLOAD_FILE" > "$OUTPUT_FILE"

echo "✅ TOC sayfası oluşturuldu: $OUTPUT_FILE"