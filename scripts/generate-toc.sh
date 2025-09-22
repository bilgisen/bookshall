#!/usr/bin/env bash
set -euo pipefail

# Debug: Script başlangıcı
echo "DEBUG: Script başlatılıyor" >&2

[[ $# -eq 2 ]] || { echo "Kullanım: $0 <payload.json> <toc.xhtml>" >&2; exit 1; }

PAYLOAD_FILE=$1
OUTPUT_FILE=$2

# Debug: Dosya yolları
echo "DEBUG: Payload dosyası: $PAYLOAD_FILE" >&2
echo "DEBUG: Output dosyası: $OUTPUT_FILE" >&2

# Dosya var mı kontrol et
if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "HATA: Payload dosyası bulunamadı: $PAYLOAD_FILE" >&2
  exit 1
fi

# jq script'ini bir değişkene atayalım
read -r -d '' JQ_SCRIPT << 'EOF_JQ_SCRIPT'
def escape_html:
  gsub("&"; "&amp;") |
  gsub("<"; "<") |
  gsub(">"; ">") |
  gsub("\""; "&quot;");

def pad_num:
  (. + 2 | tostring | "000\(.)" | .[-3:]);

# Ana dil ve başlık
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

# Chapter'ları hazırla: ID ile indeksle ve sırala
(.book.chapters | sort_by(.order // 0) | map({(.id) : .}) | add // {}) as $chapters_by_id |

# Chapter'ları tekrar al ve parent/children ilişkisini kur
[.book.chapters[] | .children = [.book.chapters[] | select(.parent == .id)] | sort_by(.children[].order // 0)? // .] as $chapters_with_children |

# Kök chapter'ları (parent'ı null veya olmayanları) bul
($chapters_with_children | map(select(.parent == null or .parent == "")) | sort_by(.order // 0)) as $root_chapters |

# Recursive TOC oluşturma fonksiyonu
def build_item($all_chapters_by_id; $depth):
  "<li><a href=\"ch\(.order | pad_num).xhtml\">\(.title | escape_html)</a>" +
  (if (.children | length > 0) and ($depth < 10) then # Güvenlik önlemi: max 10 seviye
    "<ol>" + 
    ([.children[] | build_item($all_chapters_by_id; $depth + 1)] | join("")) +
    "</ol>"
   else "" end) +
  "</li>";

# XML çıktısını oluştur
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
      \($root_chapters | map(build_item($chapters_by_id; 1)) | join(""))
    </ol>
  </nav>
</body>
</html>"
EOF_JQ_SCRIPT

# Debug: jq script tanımlandı
echo "DEBUG: jq script'i tanımlandı" >&2

# jq script'ini çalıştır - Hatanın oluştuğu yer büyük olasılıkla burası
echo "DEBUG: jq komutu çalıştırılıyor..." >&2
# jq komutunu doğrudan çalıştır ve çıktıyı göster
if OUTPUT=$(jq -r "$JQ_SCRIPT" "$PAYLOAD_FILE" 2>&1); then
    echo "DEBUG: jq komutu başarıyla tamamlandı" >&2
    echo "$OUTPUT" > "$OUTPUT_FILE"
else
    echo "HATA: jq komutu başarısız oldu. jq çıktısı:" >&2
    echo "$OUTPUT" >&2
    exit 1
fi

echo "✅ TOC sayfası oluşturuldu: $OUTPUT_FILE"