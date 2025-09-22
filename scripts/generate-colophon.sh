#!/usr/bin/env bash
set -euo pipefail

# Argümanları kontrol et
if [[ $# -ne 2 ]]; then
  echo "Kullanım: $0 <payload_file> <output_file>" >&2
  exit 1
fi

export PAYLOAD_FILE="$1"
OUTPUT_FILE="$2"
HELPER_PATH="$(dirname "$0")/helpers.sh"

if [[ ! -f "$HELPER_PATH" ]]; then echo "Hata: helpers.sh bulunamadı" >&2; exit 1; fi
source "$HELPER_PATH"

# --- Merkezi Fonksiyon ile Verileri Çek ---
BOOK_TITLE=$(get_book_value '.book.title' 'Başlıksız Kitap')
BOOK_SUBTITLE=$(get_book_value '.book.subtitle' '')
BOOK_AUTHOR=$(get_book_value '.book.author' 'Bilinmeyen Yazar')
BOOK_PUBLISHER=$(get_book_value '.book.publisher' '')
BOOK_ISBN=$(get_book_value '.book.isbn' '')
BOOK_YEAR=$(get_book_value '.book.publish_year' '')
BOOK_LANG=$(get_book_value '.book.language' 'en')

# --- XHTML Dosyasını Oluşturma ---
{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!DOCTYPE html>'
  echo "<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\" lang=\"$BOOK_LANG\">"
  echo '<head><meta charset="utf-8"/>'
  echo "<title>Kitap Hakkında - $BOOK_TITLE</title>"
  echo '<style>body{text-align:center;font-family:serif;margin:2em auto;max-width:40em;} h1{font-size:1.5em;} .subtitle{font-style:italic;color:#555;} .author{font-size:1.2em;margin:1.5em 0;} .publisher{margin:1.5em 0;} .copyright{margin-top:2em;font-size:0.9em;color:#666;}</style>'
  echo '</head><body epub:type="colophon">'
  echo "<h1>$BOOK_TITLE</h1>"
  [[ -n "$BOOK_SUBTITLE" ]] && echo "<div class=\"subtitle\">$BOOK_SUBTITLE</div>"
  echo "<div class=\"author\">$BOOK_AUTHOR</div>"
  echo '<div class="publisher">'
  [[ -n "$BOOK_PUBLISHER" ]] && echo "<div>$BOOK_PUBLISHER</div>"
  [[ -n "$BOOK_ISBN" ]] && echo "<div>ISBN: $BOOK_ISBN</div>"
  [[ -n "$BOOK_YEAR" ]] && echo "<div>$BOOK_YEAR</div>"
  echo '</div>'
  echo "<div class=\"copyright\">&copy; $(date +'%Y') $BOOK_AUTHOR<br/>Tüm hakları saklıdır.</div>"
  echo '</body></html>'
} > "$OUTPUT_FILE"

echo "✅ Künye sayfası oluşturuldu: $OUTPUT_FILE"