#!/usr/bin/env bash
#
# scripts/fetch-book.sh
# Bu script, bir API'den kitap verilerini çeker, içeriği indirir
# ve Pandoc kullanarak bir EPUB dosyası oluşturur.
#

# --- Script Ayarları ---
# -e: Herhangi bir komut hata verirse script'i anında sonlandır.
# -u: Tanımlanmamış değişken kullanımında hata ver.
# -o pipefail: Pipe içindeki komutlardan herhangi biri hata verirse tüm pipe'ı hatalı say.
set -euo pipefail
# shopt -s nullglob: Dosya desenleri eşleşmezse boş sonuç dönsün.
shopt -s nullglob

# --- Hata Yönetimi Fonksiyonu ---
# Hata mesajını standart bir formatta yazdırır ve script'i sonlandırır.
die() {
  echo "❌ Hata: $1" >&2
  exit 1
}

# --- Gerekli Ortam Değişkenleri ve Argümanların Kontrolü ---
if [[ -z "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  die "NEXT_PUBLIC_APP_URL ortam değişkeni ayarlanmamış."
fi

# BOOK_ID'yi ortam değişkeninden veya ilk argümandan al.
BOOK_ID="${BOOK_ID:-${1:-}}"
if [[ -z "$BOOK_ID" ]]; then
  die "BOOK_ID gerekli. Lütfen ortam değişkeni olarak ayarlayın veya ilk argüman olarak geçin."
fi

# --- Opsiyonel Kimlik Doğrulama ---
# API anahtarı veya GitHub token'ı varsa Authorization başlığını oluşturur.
AUTH_HEADER=()
if [[ -n "${BOOKSHALL_API_KEY:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer $BOOKSHALL_API_KEY")
elif [[ -n "${GITHUB_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

# --- Çalışma Alanı Kurulumu ---
WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"
PAYLOAD_FILE="$WORKDIR/payload.json"

# --- Payload'ı İndirme ve Doğrulama ---
# DEĞİŞİKLİK: Gereksiz olan ilk API çağrısı kaldırıldı. Tek bir API çağrısı ile tüm veriler çekiliyor.
PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID/payload?generate_toc=true&include_metadata=true&include_cover=true"
echo "📥 Kitap verileri indiriliyor: $PAYLOAD_URL"

# curl ile payload indirilirken hem HTTP durum kodu hem de içerik kontrolü yapılır.
http_status=$(curl -w "%{http_code}" -fsSL "${AUTH_HEADER[@]}" "$PAYLOAD_URL" -o "$PAYLOAD_FILE")
if [[ "$http_status" -ne 200 ]]; then
  die "Payload indirilemedi. URL: $PAYLOAD_URL, HTTP Durumu: $http_status"
fi

# İndirilen dosyanın geçerli bir JSON olup olmadığı kontrol edilir.
if ! jq -e '.book.id' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  die "İndirilen payload geçersiz JSON veya beklenen '.book.id' alanını içermiyor. Dosya içeriği: $(head -c 200 "$PAYLOAD_FILE")"
fi

# --- Kitap Bilgilerini Ayıklama (jq ile) ---
# DEĞİŞİKLİK: jq'nun 'jq -r .path // "fallback"' yapısı kullanılarak daha temiz ve güvenli veri ayıklama.
echo "📚 Kitap bilgileri işleniyor..."
BOOK_TITLE=$(jq -r '.book.title // "Başlıksız Kitap"' "$PAYLOAD_FILE")
BOOK_AUTHOR=$(jq -r '.book.author // "Bilinmeyen Yazar"' "$PAYLOAD_FILE")
BOOK_LANG=$(jq -r '.book.language // "en"' "$PAYLOAD_FILE")
BOOK_PUBLISHER=$(jq -r '.book.publisher // ""' "$PAYLOAD_FILE")
BOOK_SLUG=$(jq -r '.book.slug // "book-'$BOOK_ID'"' "$PAYLOAD_FILE")
BOOK_ISBN=$(jq -r '.book.isbn // ""' "$PAYLOAD_FILE")
BOOK_YEAR=$(jq -r '.book.publish_year // ""' "$PAYLOAD_FILE")

# --- Seçenekleri Belirleme (Payload ve Ortam Değişkenleri) ---
# Ortam değişkeni ayarlıysa onu, değilse payload'dan gelen değeri kullan.
EFFECTIVE_INCLUDE_TOC="${INCLUDE_TOC:-$(jq -r '.options.generate_toc // true' "$PAYLOAD_FILE")}"
EFFECTIVE_INCLUDE_COVER="${INCLUDE_COVER:-$(jq -r '.options.cover // true' "$PAYLOAD_FILE")}"
EFFECTIVE_INCLUDE_METADATA="${INCLUDE_METADATA:-$(jq -r '.options.embed_metadata // true' "$PAYLOAD_FILE")}"

echo "📖 Kitap: '$BOOK_TITLE' - Yazar: '$BOOK_AUTHOR'"
echo "⚙️  Seçenekler: TOC=$EFFECTIVE_INCLUDE_TOC, Kapak=$EFFECTIVE_INCLUDE_COVER, Metadata=$EFFECTIVE_INCLUDE_METADATA"

# --- metadata.yaml Oluşturma ---
# Pandoc için merkezi metadata dosyası.
META_FILE="$WORKDIR/metadata.yaml"
cat > "$META_FILE" <<EOF
---
title: "$BOOK_TITLE"
author: "$BOOK_AUTHOR"
lang: "$BOOK_LANG"
rights: "All rights reserved"
EOF

# Sadece dolu olan opsiyonel alanları ekle.
[[ -n "$BOOK_PUBLISHER" ]] && echo "publisher: \"$BOOK_PUBLISHER\"" >> "$META_FILE"
[[ -n "$BOOK_ISBN" ]] && echo "isbn: \"$BOOK_ISBN\"" >> "$META_FILE"
[[ -n "$BOOK_YEAR" ]] && echo "date: \"$BOOK_YEAR\"" >> "$META_FILE"

echo "📝 metadata.yaml oluşturuldu."

# --- Kapak Resmini İndirme ---
COVER_FILE=""
if [[ "${EFFECTIVE_INCLUDE_COVER,,}" == "true" ]]; then
  # DEĞİŞİKLİK: URL'deki boşlukları doğrudan jq ile temizle.
  COVER_URL=$(jq -r '(.book.cover_url // "") | sub("^[[:space:]]+|[[:space:]]+$"; "")' "$PAYLOAD_FILE")
  if [[ -n "$COVER_URL" ]]; then
    COVER_EXTENSION="${COVER_URL##*.}"
    COVER_FILE="$WORKDIR/cover.${COVER_EXTENSION%%[?#]*}" # URL parametrelerini temizle
    echo "🖼️  Kapak resmi indiriliyor: $COVER_URL"
    if ! curl -fsSL "$COVER_URL" -o "$COVER_FILE"; then
      echo "⚠️  Kapak resmi indirilemedi, işleme kapaksız devam edilecek." >&2
      COVER_FILE=""
    else
      echo "✅ Kapak resmi kaydedildi: $COVER_FILE"
    fi
  else
    echo "ℹ️  Payload'da kapak resmi URL'si bulunamadı."
  fi
fi

# --- Bölümleri İndirme ---
# DEĞİŞİKLİK: Bu bölüm tamamen yeniden yazıldı.
# Artık karmaşık sed/xmllint yerine sadece ham HTML indiriliyor.
# Pandoc, HTML'i doğru formata dönüştürme işini üstleniyor.
CHAPTER_FILES=()
echo "챕 Bölümleri işleme..."

# jq ile bölümleri sıralı ve filtrelenmiş şekilde al.
mapfile -t chapters_json < <(jq -c '(.book.chapters // []) | sort_by(.order // 0) | .[]' "$PAYLOAD_FILE")

if [[ ${#chapters_json[@]} -eq 0 ]]; then
  echo "⚠️  Kitap için hiç bölüm bulunamadı."
else
  for chap_json in "${chapters_json[@]}"; do
    order=$(jq -r '.order' <<<"$chap_json")
    title=$(jq -r '.title' <<<"$chap_json")
    content_url=$(jq -r '(.url // "") | sub("^[[:space:]]+|[[:space:]]+$"; "")' <<<"$chap_json")
    chapter_num=$(printf "%03d" "$order")
    # DEĞİŞİKLİK: Dosya uzantısı artık .html çünkü ham içerik kaydediyoruz.
    chapter_file="$CHAPTER_DIR/ch${chapter_num}.html"

    if [[ -n "$content_url" ]]; then
      echo "  📥 Bölüm $chapter_num indiriliyor: $title"
      if ! curl -fsSL "${AUTH_HEADER[@]}" "$content_url" -o "$chapter_file"; then
        echo "  ❌ Bölüm indirilemedi: $content_url. İçerik boş olacak." >&2
        echo "<h1>$title</h1><p>İçerik yüklenemedi.</p>" > "$chapter_file"
      fi
    else
      echo "  ⚠️  Bölüm $chapter_num için içerik URL'si yok. Boş içerik oluşturuluyor." >&2
      echo "<h1>$title</h1><p>İçerik mevcut değil.</p>" > "$chapter_file"
    fi
    CHAPTER_FILES+=("$chapter_file")
  done
fi

# --- Ek Sayfaları Oluşturma (colophon, toc) ---
# Bu script'lerin var olduğu ve çalıştırılabilir olduğu varsayılır.
IMPRINT_FILE="$WORKDIR/imprint.xhtml"
TOC_FILE="$WORKDIR/toc.xhtml"

if [[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]] && [[ -x "./scripts/colophon.sh" ]]; then
  echo "🔧 Künye (imprint) sayfası oluşturuluyor..."
  if ./scripts/colophon.sh "$PAYLOAD_FILE" "$IMPRINT_FILE"; then
    echo "✅ Künye sayfası oluşturuldu."
  else
    echo "⚠️  Künye sayfası oluşturulamadı." >&2
  fi
fi

if [[ "${EFFECTIVE_INCLUDE_TOC,,}" == "true" ]] && [[ -x "./scripts/toc.sh" ]]; then
  echo "🔧 TOC (içindekiler) sayfası oluşturuluyor..."
  if ./scripts/toc.sh "$PAYLOAD_FILE" "$TOC_FILE"; then
    echo "✅ TOC oluşturuldu."
  else
    echo "⚠️  TOC oluşturulamadı." >&2
  fi
fi

# --- Stil Dosyasını (CSS) İndirme ---
EPUB_CSS=""
STYLESHEET_URL=$(jq -r '(.book.stylesheet_url // "") | sub("^[[:space:]]+|[[:space:]]+$"; "")' "$PAYLOAD_FILE")
if [[ -n "$STYLESHEET_URL" ]]; then
  EPUB_CSS="$WORKDIR/epub.css"
  echo "🎨 Stil dosyası indiriliyor: $STYLESHEET_URL"
  if ! curl -fsSL "$STYLESHEET_URL" -o "$EPUB_CSS"; then
    echo "⚠️  Stil dosyası indirilemedi." >&2
    EPUB_CSS=""
  else
    echo "✅ Stil dosyası kaydedildi: $EPUB_CSS"
  fi
fi

# --- EPUB Dosyasını Oluşturma (Pandoc ile) ---
SAFE_SLUG="${BOOK_SLUG// /_}"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
EPUB_FILENAME="${SAFE_SLUG}-${TIMESTAMP}.epub"

# Pandoc'a verilecek dosyaları doğru sırada bir araya getir.
PANDOC_INPUT_FILES=()
# 1. Künye (varsa)
[[ -f "$IMPRINT_FILE" ]] && PANDOC_INPUT_FILES+=("$IMPRINT_FILE")
# 2. İçindekiler (varsa)
[[ -f "$TOC_FILE" ]] && PANDOC_INPUT_FILES+=("$TOC_FILE")
# 3. Bölümler
PANDOC_INPUT_FILES+=("${CHAPTER_FILES[@]}")

# Pandoc argümanlarını oluştur.
PANDOC_ARGS=()
PANDOC_ARGS+=(--from=html) # Girdi formatını belirt
PANDOC_ARGS+=(--to=epub3)  # Çıktı formatını belirt
PANDOC_ARGS+=(--output="$EPUB_FILENAME")
PANDOC_ARGS+=(--metadata-file="$META_FILE")
PANDOC_ARGS+=(--epub-title-page=false) # Pandoc'un otomatik başlık sayfasını devre dışı bırak
PANDOC_ARGS+=(--toc) # Bölüm başlıklarından otomatik bir TOC oluştur

[[ -n "$COVER_FILE" ]] && PANDOC_ARGS+=(--epub-cover-image="$COVER_FILE")
[[ -n "$EPUB_CSS" ]] && PANDOC_ARGS+=(--css="$EPUB_CSS")

echo "🚀 Pandoc ile EPUB oluşturuluyor... (${#PANDOC_INPUT_FILES[@]} dosya işlenecek)"

# Debug için pandoc komutunu göster
if [[ "${DEBUG:-false}" == "true" ]]; then
  echo "Pandoc Komutu: pandoc ${PANDOC_ARGS[*]} ${PANDOC_INPUT_FILES[*]}" >&2
fi

# Pandoc'u çalıştır.
if ! pandoc "${PANDOC_ARGS[@]}" "${PANDOC_INPUT_FILES[@]}"; then
  die "Pandoc EPUB dosyasını oluşturamadı."
fi

# Çıktıyı `output` klasörüne taşı.
mkdir -p output
mv "$EPUB_FILENAME" "output/book.epub"

echo "✅ Başarılı! EPUB dosyası oluşturuldu: output/book.epub"