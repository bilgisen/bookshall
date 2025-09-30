#!/usr/bin/env bash
set -euo pipefail

# --- Kurulum ve Değişkenler ---
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/helpers.sh"

if [[ -z "${NEXT_PUBLIC_APP_URL:-}" ]]; then die "NEXT_PUBLIC_APP_URL ortam değişkeni ayarlanmamış."; fi
if [[ -z "${BOOK_ID:-}" ]]; then die "BOOK_ID ortam değişkeni ayarlanmamış."; fi

WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"
export PAYLOAD_FILE="$WORKDIR/payload.json"

# --- Adım 1: Payload'ı İndir ---
PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID/payload?generate_toc=true&include_metadata=true&include_cover=true"
echo "📥 Kitap verileri indiriliyor: $PAYLOAD_URL"
AUTH_HEADER=()
[[ -n "${BOOKSHALL_API_KEY:-}" ]] && AUTH_HEADER=(-H "Authorization: Bearer $BOOKSHALL_API_KEY")
[[ -n "${GITHUB_TOKEN:-}" ]] && AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")

http_status=$(curl -w "%{http_code}" -fsSL "${AUTH_HEADER[@]}" "$PAYLOAD_URL" -o "$PAYLOAD_FILE")
if [[ "$http_status" -ne 200 ]]; then die "Payload indirilemedi. URL: $PAYLOAD_URL, HTTP Durumu: $http_status"; fi
if ! jq -e '.book.id' "$PAYLOAD_FILE" >/dev/null 2>&1; then die "İndirilen payload geçersiz."; fi
echo "✅ Payload başarıyla indirildi ve doğrulandı."

# --- Adım 2: Yardımcı Sayfaları Oluştur ---
IMPRINT_ENABLED=$(jq -r '.options.imprint // false' "$PAYLOAD_FILE")
if [[ "$IMPRINT_ENABLED" == "true" ]]; then
  echo "📄 Colophon (imprint) sayfası oluşturuluyor..."
  "$SCRIPT_DIR/generate-colophon.sh" "$PAYLOAD_FILE" "$WORKDIR/colophon.xhtml"
else
  echo "ℹ️ Colophon (imprint) sayfası atlandı."
fi

# --- Adım 3: Kapak ve Stil Dosyasını İndir ---
COVER_URL=$(get_book_value '.book.cover_url' '')
COVER_FILE=""
if [[ -n "$COVER_URL" ]]; then
    echo "🖼️  Kapak resmi indiriliyor..."
    COVER_EXT="${COVER_URL##*.}"
    COVER_FILE="$WORKDIR/cover.${COVER_EXT%%[?#]*}"
    if ! curl -fsSL "$COVER_URL" -o "$COVER_FILE"; then
        echo "⚠️ Kapak resmi indirilemedi." >&2; COVER_FILE=""
    fi
fi

STYLESHEET_URL=$(get_book_value '.book.stylesheet_url' '')
EPUB_CSS=""
if [[ -n "$STYLESHEET_URL" ]]; then
    echo "🎨 Stil dosyası indiriliyor..."
    EPUB_CSS="$WORKDIR/epub.css"
    if ! curl -fsSL "$STYLESHEET_URL" -o "$EPUB_CSS"; then
        echo "⚠️ Stil dosyası indirilemedi." >&2; EPUB_CSS=""
    fi
fi

# --- Adım 4: Bölümleri İndir ---
echo "챕 Bölümler indiriliyor..."
mapfile -t chapters_json < <(jq -c '(.book.chapters // []) | sort_by(.order // 0) | .[]' "$PAYLOAD_FILE")
for chap_json in "${chapters_json[@]}"; do
    order=$(jq -r '.order' <<<"$chap_json")
    title=$(jq -r '.title' <<<"$chap_json")
    # Önce title_tag kontrol et, yoksa level'a göre belirle (1-6 arası)
    title_tag=$(jq -r '.title_tag // ("h" + (.level | if . and . >= 1 and . <= 6 then . else 1 end | tostring))' <<<"$chap_json")
    content_url=$(jq -r '.url // ""' <<<"$chap_json")
    chapter_file="$CHAPTER_DIR/ch$(printf "%03d" "$order").html"
    echo "  📥 Bölüm $order: $title (${title_tag})"
    if [[ -n "$content_url" ]]; then
        if ! curl -fsSL "${AUTH_HEADER[@]}" "$content_url" -o "$chapter_file"; then
            echo "<${title_tag}>${title}</${title_tag}><p>İçerik yüklenemedi.</p>" > "$chapter_file"
        fi
    else
        echo "<${title_tag}>${title}</${title_tag}><p>İçerik mevcut değil.</p>" > "$chapter_file"
    fi
done

# --- Adım 5: EPUB Oluşturma (Pandoc) ---
BOOK_SLUG=$(get_book_value '.book.slug' "book-${BOOK_ID}")
EPUB_FILENAME="output/${BOOK_SLUG}.epub"
mkdir -p output

META_FILE="$WORKDIR/metadata.yaml"
{
  echo "---"
  echo "title: \"$(get_book_value '.book.title' 'Başlıksız Kitap')\""
  echo "author: \"$(get_book_value '.book.author' 'Bilinmeyen Yazar')\""
  echo "lang: \"$(get_book_value '.book.language' 'en')\""
  # ... diğer metadata alanları ...
  echo "..."
} > "$META_FILE"

PANDOC_INPUT_FILES=("$WORKDIR/colophon.xhtml" "$CHAPTER_DIR"/*.html)
# Metadata'ları doğrudan Pandoc'a geçiriyoruz
PANDOC_ARGS=(
  --from=html --to=epub3
  --output="$EPUB_FILENAME"
  --metadata="title=$(get_book_value '.book.title' 'Başlıksız Kitap' | sed 's/"/\\"/g')"
  --metadata="author=$(get_book_value '.book.author' 'Bilinmeyen Yazar' | sed 's/"/\\"/g')"
  --metadata="language=$(get_book_value '.book.language' 'tr')"
  --metadata="publisher=$(get_book_value '.book.publisher' '' | sed 's/"/\\"/g')"
  --metadata="isbn=$(get_book_value '.book.isbn' '')"
  --metadata="date=$(get_book_value '.book.publish_year' '')"
  --metadata-file="$META_FILE"
  --toc
  --toc-depth=2
  --epub-title-page=false
)
[[ -n "$COVER_FILE" ]] && PANDOC_ARGS+=(--epub-cover-image="$COVER_FILE")
[[ -n "$EPUB_CSS" ]] && PANDOC_ARGS+=(--css="$EPUB_CSS")

echo "🚀 Pandoc ile EPUB oluşturuluyor..."
if ! pandoc "${PANDOC_ARGS[@]}" "${PANDOC_INPUT_FILES[@]}"; then
  die "Pandoc EPUB dosyasını oluşturamadı."
fi

echo "✅ Başarılı! EPUB dosyası oluşturuldu: $EPUB_FILENAME"