#!/usr/bin/env bash
# fetch-book.sh - Dijital kitap içeriğini indirir ve EPUB oluşturur
set -euo pipefail
shopt -s nullglob

# ------------------------------------------------------------------
# fetch-book.sh (with colophon + toc integration)
# ------------------------------------------------------------------

# === Gerekli Ortam Değişkenleri ===
if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "❌ NEXT_PUBLIC_APP_URL ayarlanmamış"
  exit 1
fi

# BOOK_ID'nin sağlanıp sağlanmadığını kontrol et (ortam değişkeni veya ilk argüman)
if [ -z "${BOOK_ID:-}" ] && [ $# -lt 1 ]; then
  echo "❌ BOOK_ID gerekli. Lütfen BOOK_ID ortam değişkenini ayarlayın veya ilk argüman olarak geçirin."
  exit 1
fi

# BOOK_ID'yi ortam değişkeninden veya ilk argümandan al
if [ -z "${BOOK_ID:-}" ]; then
  BOOK_ID="$1"
fi

# --- Auth header (isteğe bağlı API anahtarı veya GitHub token) ---
AUTH_HEADER=()
if [ -n "${BOOKSHALL_API_KEY:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $BOOKSHALL_API_KEY")
elif [ -n "${GITHUB_TOKEN:-}" ]; then
  AUTH_HEADER=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

# --- Çalışma alanı kurulumu ---
WORKDIR="./book-content"
CHAPTER_DIR="$WORKDIR/chapters"
mkdir -p "$CHAPTER_DIR"
PAYLOAD_FILE="$WORKDIR/payload.json"

# --- İlk payload'ı indirerek kitap detaylarını al ---
INITIAL_PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID"
echo "📥 İlk payload indiriliyor: $INITIAL_PAYLOAD_URL"

# İlk payload'ı indir ve durum kodunu al
http_status=$(curl -s -o "$PAYLOAD_FILE" -w "%{http_code}" "${AUTH_HEADER[@]}" "$INITIAL_PAYLOAD_URL")
if [ "$http_status" -ne 200 ]; then
  echo "❌ İlk payload indirilemedi (HTTP $http_status)" >&2
  exit 1
fi

# İlk payload'ın geçerli JSON olduğundan emin ol
if ! jq -e '.' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ İndirilen ilk payload geçerli JSON değil" >&2
  echo "❌ Payload'ın ilk 100 karakteri: $(head -c 100 "$PAYLOAD_FILE")" >&2
  exit 1
fi

# BOOK_ID'yi ilk payload'tan çıkar (eşleştiğini doğrula)
BOOK_ID_FROM_PAYLOAD=$(jq -er '.id' "$PAYLOAD_FILE" 2>/dev/null || echo "")
if [ -z "$BOOK_ID_FROM_PAYLOAD" ]; then
  echo "❌ İlk payload'tan BOOK_ID çıkarılamadı"
  echo "❌ Payload içeriği:"
  head -n 20 "$PAYLOAD_FILE"
  exit 1
fi

if [ "$BOOK_ID" != "$BOOK_ID_FROM_PAYLOAD" ]; then
  echo "⚠️  Uyarı: Ortam değişkeninden gelen BOOK_ID ($BOOK_ID) payload ID'siyle ($BOOK_ID_FROM_PAYLOAD) eşleşmiyor. Payload ID'si kullanılıyor." >&2
  BOOK_ID="$BOOK_ID_FROM_PAYLOAD"
fi

echo "📚 Kitap işleniyor, ID: $BOOK_ID"

# --- Seçenekleri tanımla ---
INCLUDE_TOC="${INCLUDE_TOC:-true}"
TOC_LEVEL="${TOC_LEVEL:-3}"
INCLUDE_METADATA="${INCLUDE_METADATA:-true}"
INCLUDE_COVER="${INCLUDE_COVER:-true}"

# --- Tam payload'ı seçeneklerle indir ---
PAYLOAD_URL="$NEXT_PUBLIC_APP_URL/api/books/by-id/$BOOK_ID/payload?generate_toc=$INCLUDE_TOC&toc_depth=$TOC_LEVEL&includeMetadata=$INCLUDE_METADATA&includeCover=$INCLUDE_COVER"
echo "📥 Tam payload indiriliyor: $PAYLOAD_URL"

# Tam payload'ı indir ve durum kodunu al
http_status=$(curl -s -o "$PAYLOAD_FILE" -w "%{http_code}" "${AUTH_HEADER[@]}" "$PAYLOAD_URL")
if [ "$http_status" -ne 200 ]; then
  echo "❌ Payload indirilemedi (HTTP $http_status)" >&2
  exit 1
fi

# Payload'ın geçerli JSON olduğundan emin ol
if ! jq -e '.' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ İndirilen payload geçerli JSON değil" >&2
  echo "❌ Payload'ın ilk 100 karakteri: $(head -c 100 "$PAYLOAD_FILE")" >&2
  exit 1
fi

# Payload'ın beklenen yapıya sahip olduğundan emin ol
if ! jq -e '.book' "$PAYLOAD_FILE" >/dev/null 2>&1; then
  echo "❌ Geçersiz payload.json (.book eksik)" >&2
  echo "❌ Payload yapısı:" >&2
  jq -c '.' "$PAYLOAD_FILE" | head -n 20 >&2
  exit 1
fi

# Debug: Payload yapısını göster (debug etkinse)
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Debug: Payload yapısı:" >&2
  jq -c '.book | {id, title, author, chapters: (.chapters | length)}' "$PAYLOAD_FILE" >&2
fi

# --- YAML için kaçış yardımcısı ---
escape_for_yaml() {
  local raw="$1"
  # YAML için özel karakterleri kaçır
  printf '%s' "$raw" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e "s/'/''/g" -e 's/:/\\:/g' -e 's/\$/\\\$/g'
}

# --- Alanları güvenli bir şekilde çıkar ---
# Kitap başlığını çıkar (null kontrolü ile)
BOOK_TITLE=$(jq -er '.book.title' "$PAYLOAD_FILE" 2>/dev/null || echo "Untitled Book")
if [ "$BOOK_TITLE" = "null" ]; then
  BOOK_TITLE="Untitled Book"
  echo "⚠️  Uyarı: Payload'ta kitap başlığı bulunamadı, varsayılan kullanılıyor" >&2
else
  echo "📖 Kitap başlığı: $BOOK_TITLE" >&2
fi

# Diğer alanları güvenli bir şekilde çıkar
BOOK_AUTHOR=$(jq -er '.book.author' "$PAYLOAD_FILE" 2>/dev/null || echo "Unknown Author")
if [ "$BOOK_AUTHOR" = "null" ]; then
  BOOK_AUTHOR="Unknown Author"
fi

BOOK_LANG=$(jq -er '.book.language' "$PAYLOAD_FILE" 2>/dev/null || echo "en")
if [ "$BOOK_LANG" = "null" ]; then
  BOOK_LANG="en"
fi

BOOK_PUBLISHER=$(jq -er '.book.publisher' "$PAYLOAD_FILE" 2>/dev/null || echo "Unknown Publisher")
if [ "$BOOK_PUBLISHER" = "null" ]; then
  BOOK_PUBLISHER="Unknown Publisher"
fi

# Kitap slug'unu güvenli bir şekilde çıkar
FALLBACK_SLUG="book-${BOOK_ID}"
BOOK_SLUG=$(jq -er '.book.slug' "$PAYLOAD_FILE" 2>/dev/null || echo "$FALLBACK_SLUG")
if [ "$BOOK_SLUG" = "null" ]; then
  BOOK_SLUG="$FALLBACK_SLUG"
fi
echo "📖 Kitap slug: $BOOK_SLUG"

BOOK_ISBN=$(jq -er '.book.isbn // empty' "$PAYLOAD_FILE" 2>/dev/null || echo "")
BOOK_YEAR=$(jq -er '.book.publish_year // empty' "$PAYLOAD_FILE" 2>/dev/null || echo "")

META_GENERATED_AT=$(jq -er '.metadata.generated_at // empty' "$PAYLOAD_FILE" 2>/dev/null || echo "")
META_GENERATED_BY=$(jq -er '.metadata.generated_by // empty' "$PAYLOAD_FILE" 2>/dev/null || echo "")
META_USER_ID=$(jq -er '.metadata.user_id // empty' "$PAYLOAD_FILE" 2>/dev/null || echo "")
META_USER_EMAIL=$(jq -er '.metadata.user_email // empty' "$PAYLOAD_FILE" 2>/dev/null || echo "")

# --- Seçenekler (payload + ortam değişkeni geçersiz kılma) ---
EFFECTIVE_INCLUDE_TOC="${INCLUDE_TOC:-$(jq -er '.options.generate_toc' "$PAYLOAD_FILE" 2>/dev/null || echo "true")}"
EFFECTIVE_INCLUDE_COVER="${INCLUDE_COVER:-$(jq -er '.options.cover' "$PAYLOAD_FILE" 2>/dev/null || echo "true")}"
EFFECTIVE_INCLUDE_METADATA="${INCLUDE_METADATA:-$(jq -er '.options.embed_metadata' "$PAYLOAD_FILE" 2>/dev/null || echo "true")}"

echo "📚 $BOOK_TITLE - $BOOK_AUTHOR"
echo "⚙️  Seçenekler → TOC=$EFFECTIVE_INCLUDE_TOC, Kapak=$EFFECTIVE_INCLUDE_COVER, Metadata=$EFFECTIVE_INCLUDE_METADATA"

# Debug kitap metadata
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Debug: Kitap Metadata" >&2
  echo "  Başlık: '$BOOK_TITLE'" >&2
  echo "  Yazar: '$BOOK_AUTHOR'" >&2
  echo "  Dil: '$BOOK_LANG'" >&2
  echo "  Yayıncı: '$BOOK_PUBLISHER'" >&2
fi

# --- metadata.yaml ---
META_FILE="$WORKDIR/metadata.yaml"
cat > "$META_FILE" <<EOF
---
title: "$(escape_for_yaml "$BOOK_TITLE")"
author: "$(escape_for_yaml "$BOOK_AUTHOR")"
lang: "$(escape_for_yaml "$BOOK_LANG")"
publisher: "$(escape_for_yaml "$BOOK_PUBLISHER")"
EOF

# Debug metadata dosyası içeriği
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Debug: Oluşturulan metadata.yaml içeriği:" >&2
  cat "$META_FILE" >&2
fi

if [ -n "$BOOK_ISBN" ]; then
  echo "isbn: \"$(escape_for_yaml "$BOOK_ISBN")\"" >> "$META_FILE"
fi
if [ -n "$BOOK_YEAR" ]; then
  echo "date: \"$(escape_for_yaml "$BOOK_YEAR")\"" >> "$META_FILE"
else
  echo "date: \"$(date -u +"%Y-%m-%d")\"" >> "$META_FILE"
fi
echo "rights: \"All rights reserved\"" >> "$META_FILE"

[ -n "$META_GENERATED_BY" ] && echo "generator: \"$(escape_for_yaml "$META_GENERATED_BY")\"" >> "$META_FILE"
[ -n "$META_GENERATED_AT" ] && echo "generated_at: \"$(escape_for_yaml "$META_GENERATED_AT")\"" >> "$META_FILE"
[ -n "$META_USER_ID" ] && echo "user_id: \"$(escape_for_yaml "$META_USER_ID")\"" >> "$META_FILE"
[ -n "$META_USER_EMAIL" ] && echo "user_email: \"$(escape_for_yaml "$META_USER_EMAIL")\"" >> "$META_FILE"

echo "📝 metadata.yaml oluşturuldu"

# --- Kapak resmini indir (etkinse) ---
COVER_FILE=""
if [[ "${EFFECTIVE_INCLUDE_COVER,,}" == "true" ]]; then
  echo "🖼️  Kapak resmi indiriliyor..."
  # URL'deki baştaki ve sondaki boşlukları temizle
  COVER_URL=$(jq -er '.book.cover_url' "$PAYLOAD_FILE" 2>/dev/null || echo "")
  if [ -n "$COVER_URL" ] && [ "$COVER_URL" != "null" ]; then
    COVER_URL=$(echo "$COVER_URL" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  fi
  
  if [ -n "$COVER_URL" ]; then
    COVER_FILE="$WORKDIR/cover.${COVER_URL##*.}"
    # Kapak resmini indir ve durum kodunu kontrol et
    http_status=$(curl -s -o "$COVER_FILE" -w "%{http_code}" "$COVER_URL")
    if [ "$http_status" -ne 200 ]; then
      echo "⚠️  Kapak resmi indirilemedi $COVER_URL (HTTP $http_status)" >&2
      COVER_FILE=""
    else
      echo "✅ Kapak resmi indirildi: $COVER_FILE"
    fi
  else
    echo "ℹ️  Payload'ta kapak resmi URL'si bulunamadı"
  fi
fi

# --- Bölümleri indir ---
# Bölümleri işlemek için fonksiyon
process_chapters() {
  if [ "${DEBUG:-false}" = "true" ]; then
    echo "Debug: Bölüm işleme başlatılıyor..." >&2
  fi
  
  # Önce bölüm dizisinin var olduğundan ve boş olmadığını doğrula
  if ! jq -e '.book.chapters | length > 0' "$PAYLOAD_FILE" >/dev/null; then
    echo "⚠️  Uyarı: Payload'ta bölüm bulunamadı" >&2
    # Hiçbir bölüm yoksa varsayılan bir bölüm oluştur
    echo "{\"title\":\"$BOOK_TITLE\",\"order\":1,\"content\":\"<p>İçerik mevcut değil</p>\"}" | jq -c .
  else
    # Bölümleri çıkar ve işle (daha iyi hata işleme ile)
    jq -c '(.book.chapters // []) | sort_by(.order // 0) | .[] | select(. != null)' "$PAYLOAD_FILE" 2>&1 || {
      echo "❌ Bölümler işlenirken hata:" >&2
      jq -c '.book.chapters[] | {order, title, has_content: (has("content") or has("url"))}' "$PAYLOAD_FILE" >&2
      exit 1
    }
  fi
}

# Bölümleri işle ve döngüye sok
while IFS= read -r chap; do
  if [ -z "$chap" ]; then
    echo "⚠️  Uyarı: Boş bölüm verisi" >&2
    continue
  fi
  
  if [ "${DEBUG:-false}" = "true" ]; then
    echo "Debug: Bölüm işleniyor: $(jq -r '{order, title, has_url: (has("url") and (.url != null))}' <<<"$chap")" >&2
  fi
  
  # order değerini güvenli bir şekilde çıkar (varsayılan 0)
  order=$(jq -r '.order // 0' <<<"$chap")
  title=$(jq -er '.title' <<<"$chap")
  content_url=$(jq -er '.url // empty' <<<"$chap")
  
  # Chapter URL'sini temizle (baştaki ve sondaki boşlukları kaldır)
  if [ -n "$content_url" ] && [ "$content_url" != "null" ]; then
    content_url=$(echo "$content_url" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  fi
  
  # Bölüm içeriğini indir (URL mevcutsa)
  if [ -n "$content_url" ]; then
    echo "📥 Bölüm içeriği indiriliyor: $content_url"
    
    # Bölüm içeriği için geçici dosya oluştur
    temp_file=$(mktemp)
    
    # Bölüm içeriğini indir ve durum kodunu kontrol et
    http_status=$(curl -s -o "$temp_file" -w "%{http_code}" "${AUTH_HEADER[@]}" "$content_url")
    if [ "$http_status" -eq 200 ]; then
      echo "✅ İçerik başarıyla indirildi" >&2
      # Ana içeriği xmllint ile çıkar (daha iyi HTML ayrıştırma)
      if command -v xmllint >/dev/null 2>&1; then
        # xmllint mevcutsa kullan (daha iyi HTML ayrıştırma)
        content=$(xmllint --html --xmlout --xpath "//body" "$temp_file" 2>/dev/null | 
          sed -e 's/^.*<body[^>]*>//' -e 's/<\/body>.*$//' |
          # Herhangi bir script ve style etiketini tamamen kaldır
          sed -e '/<script\b[^>]*>/,/<\/script>/d' -e '/<style\b[^>]*>/,/<\/style>/d' |
          # Boşlukları temizle
          sed 's/^[[:space:]]*//;s/[[:space:]]*$//' |
          # Boş satırları kaldır
          sed '/^[[:space:]]*$/d'
        )
      else
        # xmllint mevcut değilse sed'e geri dön
        content=$(cat "$temp_file" | 
          # Herhangi bir mevcut DOCTYPE ve HTML/HEAD etiketlerini kaldır
          sed -e 's/<!DOCTYPE[^>]*>//g' -e 's/<\/?html[^>]*>//g' -e 's/<\/?head[^>]*>//g' |
          # <body> etiketleri arasındaki içeriği çıkar veya tüm içeriği kullan
          sed -n '/<body[^>]*>/,/<\/body>/p' | sed -e 's/<body[^>]*>//' -e 's/<\/body>//' |
          # Kalan script ve style etiketlerini kaldır
          sed -e '/<script\b[^>]*>/,/<\/script>/d' -e '/<style\b[^>]*>/,/<\/style>/d' |
          # Boş satırları ve boşlukları temizle
          sed -e 's/^[[:space:]]*//;s/[[:space:]]*$//' -e '/^[[:space:]]*$/d' |
          # Uygun XHTML kaçışını sağla
          sed -e 's/&/\&amp;/g' -e 's/</\</g' -e 's/>/\>/g' -e 's/"/\&quot;/g' -e "s/'/\&#39;/g"
        )
      fi
      
      # Anlamlı içerik çıkarılamazsa varsayılan kullan
      if [ -z "$content" ]; then
        content="<p>Bu bölüm için içerik mevcut değil.</p>"
      fi
    else
      echo "❌ Bölüm içeriği indirilemedi $content_url (HTTP $http_status)" >&2
      content="<p>Bölüm içeriği yüklenemedi.</p>"
    fi
    
    # Geçici dosyayı temizle
    rm -f "$temp_file"
  else
    content="<p>Bu bölüm için içerik URL'si sağlanmadı.</p>"
  fi

  # Bölüm dosyasını oluştur (EPUB standartlarıyla uyumlu chXXX.xhtml formatı)
  chapter_num=$(printf "%03d" "$order")
  chapter_file="$CHAPTER_DIR/ch${chapter_num}.xhtml"

  echo "📄 Bölüm oluşturuluyor: $chapter_file"

  # Bölüm içeriğini uygun XHTML yapısıyla oluştur
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<!DOCTYPE html>'
    echo '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
    echo '<head>'
    echo '  <meta charset="utf-8"/>'
    echo "  <title>$(escape_for_yaml "$title")</title>"
    echo '  <style type="text/css">'
    echo '    body { font-family: serif; line-height: 1.5; margin: 1em; }'
    echo '    h1 { font-size: 1.5em; margin-bottom: 1em; }'
    echo '    p { margin: 0.5em 0; text-indent: 1.5em; }'
    echo '    .no-indent { text-indent: 0; }'
    echo '  </style>'
    echo '</head>'
    echo '<body>'
    
    # Bölüm başlığını içerikten kaldır (sadece ilk h1'i sil)
    echo "$content" | \
      sed -e '0,/<h1[^>]*>.*<\/h1>/d' \
          -e 's/<\/\?body[^>]*>//g' \
          -e 's/<\/\?html[^>]*>//g' \
          -e 's/&amp;/\&/g' \
          -e 's/</</g' \
          -e 's/>/>/g' \
          -e 's/&quot;/"/g' \
          -e "s/&#39;/'/g"
    
    echo '</body>'
    echo '</html>'
  } > "$chapter_file"

  # Bölümler listesine ekle
  echo "$chapter_file" >> "$WORKDIR/_chapters.txt"
done < <(process_chapters)

# Bölüm dosyalarını bir diziye yükle
if [ -f "$WORKDIR/_chapters.txt" ]; then
  mapfile -t CHAPTER_FILES < "$WORKDIR/_chapters.txt"
  rm "$WORKDIR/_chapters.txt"
else
  echo "⚠️  Hiçbir bölüm bulunamadı, yer tutucu oluşturuluyor"
  CHAPTER_FILES=()
fi

# --- Gerekirse ek dosyaları oluştur ---

# Colophon (imprint) oluştur (isteniyorsa)
if [[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]]; then
  echo "🔧 Imprint sayfası oluşturuluyor..."
  if ./scripts/colophon.sh "$PAYLOAD_FILE" "$WORKDIR/imprint.xhtml"; then
    if [[ -f "$WORKDIR/imprint.xhtml" ]]; then
      echo "✅ Imprint sayfası oluşturuldu: $WORKDIR/imprint.xhtml"
    else
      echo "⚠️  colophon.sh tamamlandı ancak $WORKDIR/imprint.xhtml bulunamadı" >&2
    fi
  else
    echo "⚠️  Imprint sayfası oluşturulamadı" >&2
  fi
fi

# TOC oluştur (isteniyorsa)
if [[ "${EFFECTIVE_INCLUDE_TOC,,}" == "true" ]]; then
  echo "🔧 İçindekiler tablosu oluşturuluyor..."
  if ./scripts/toc.sh "$PAYLOAD_FILE" "$WORKDIR/toc.xhtml"; then
    if [[ -f "$WORKDIR/toc.xhtml" ]]; then
      echo "✅ TOC oluşturuldu: $WORKDIR/toc.xhtml"
    else
      echo "⚠️  toc.sh tamamlandı ancak $WORKDIR/toc.xhtml bulunamadı" >&2
    fi
  else
    echo "⚠️  TOC oluşturulamadı" >&2
  fi
fi

# --- Stil dosyası ---
EPUB_CSS=""
STYLESHEET_URL=$(jq -er '.book.stylesheet_url // empty' "$PAYLOAD_FILE" 2>/dev/null || echo "")
if [ -n "$STYLESHEET_URL" ] && [ "$STYLESHEET_URL" != "null" ]; then
  # URL'deki baştaki ve sondaki boşlukları temizle
  STYLESHEET_URL=$(echo "$STYLESHEET_URL" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  if [ -n "$STYLESHEET_URL" ]; then
    EPUB_CSS="$WORKDIR/epub.css"
    # Stil dosyasını indir ve durum kodunu kontrol et
    http_status=$(curl -s -o "$EPUB_CSS" -w "%{http_code}" "$STYLESHEET_URL")
    if [ "$http_status" -ne 200 ]; then
      echo "⚠️  Stil dosyası indirilemedi $STYLESHEET_URL (HTTP $http_status)" >&2
      EPUB_CSS=""
    else
      echo "✅ Stil dosyası indirildi: $EPUB_CSS"
    fi
  fi
fi

# --- EPUB Oluştur ---
SAFE_SLUG="${BOOK_SLUG// /_}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
EPUB_FILENAME="${SAFE_SLUG}-${TIMESTAMP}.epub"

# Dosyaları açıkça sırala
EPUB_FILES=()

# 1. Kapak resmini ekle (mevcutsa ve etkinse)
if [[ "${EFFECTIVE_INCLUDE_COVER,,}" == "true" && -n "$COVER_FILE" && -f "$COVER_FILE" ]]; then
  EPUB_FILES+=("$COVER_FILE")
  echo "🖼️  EPUB'a kapak resmi ekleniyor"
fi

# 2. Imprint (colophon) ekle (mevcutsa ve etkinse)
if [[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]]; then
  IMPRINT_FILE="$WORKDIR/imprint.xhtml"
  if [[ -f "$IMPRINT_FILE" ]]; then
    EPUB_FILES+=("$IMPRINT_FILE")
    echo "📄 EPUB'a imprint ekleniyor"
  else
    echo "⚠️  Imprint istendi ancak dosya bulunamadı: $IMPRINT_FILE" >&2
  fi
fi

# 3. TOC ekle (mevcutsa ve etkinse)
if [[ "${EFFECTIVE_INCLUDE_TOC,,}" == "true" ]]; then
  TOC_FILE="$WORKDIR/toc.xhtml"
  if [[ -f "$TOC_FILE" ]]; then
    EPUB_FILES+=("$TOC_FILE")
    echo "📑 EPUB'a TOC ekleniyor"
  else
    echo "⚠️  TOC istendi ancak dosya bulunamadı: $TOC_FILE" >&2
  fi
fi

# 4. Bölüm dosyalarını ekle
chapter_count=0
for chap_file in "${CHAPTER_FILES[@]}"; do
  if [[ -f "$chap_file" ]]; then
    EPUB_FILES+=("$chap_file")
    ((chapter_count++))
  else
    echo "⚠️  Uyarı: Bölüm dosyası bulunamadı: $chap_file" >&2
  fi
done
echo "📄 EPUB'a $chapter_count bölüm ekleniyor"

# Debug: EPUB'a dahil edilecek dosyaları listele
if [ "${DEBUG:-false}" = "true" ]; then
  echo "📚 EPUB'a dahil edilecek dosyalar (${#EPUB_FILES[@]} toplam):"
  for i in "${!EPUB_FILES[@]}"; do
    printf "  %2d. %s\n" "$((i+1))" "${EPUB_FILES[$i]}"
  done
fi

# Pandoc argümanlarını ayarla
PANDOC_ARGS=()
# Otomatik başlık sayfasını devre dışı bırak (özel imprint'imizi kullanmak için)
PANDOC_ARGS+=(--epub-title-page=false)
# Metadata'yı ekle
PANDOC_ARGS+=(--metadata="title:$BOOK_TITLE")
PANDOC_ARGS+=(--metadata="author:$BOOK_AUTHOR")
PANDOC_ARGS+=(--metadata="language:$BOOK_LANG")
[ -n "$BOOK_PUBLISHER" ] && PANDOC_ARGS+=(--metadata="publisher:$BOOK_PUBLISHER")
[ -n "$BOOK_YEAR" ] && PANDOC_ARGS+=(--metadata="date:$BOOK_YEAR")
# Metadata dosyasını ek meta veri kaynağı olarak ekle
[[ "${EFFECTIVE_INCLUDE_METADATA,,}" == "true" ]] && PANDOC_ARGS+=(--metadata-file="$META_FILE")
# Kapak ve CSS'i ekle (belirtilmişse)
[ -n "$COVER_FILE" ] && PANDOC_ARGS+=(--epub-cover-image="$COVER_FILE")
[ -n "$EPUB_CSS" ] && PANDOC_ARGS+=(--css="$EPUB_CSS")
# Sıralı dosyaları ve çıktıyı ekle
PANDOC_ARGS+=("${EPUB_FILES[@]}" --output="$EPUB_FILENAME")

echo "🔧 Pandoc ${#PANDOC_ARGS[@]} argümanla çalıştırılıyor..."
if [ "${DEBUG:-false}" = "true" ]; then
  echo "Pandoc'a geçirilen dosyalar sırasıyla:"
  for i in "${!EPUB_FILES[@]}"; do
    echo "  [$((i+1))] ${EPUB_FILES[$i]}"
  done
fi

# Pandoc'u hata işleme ile çalıştır
if ! pandoc "${PANDOC_ARGS[@]}"; then
  echo "❌ Hata: EPUB pandoc ile oluşturulamadı" >&2
  exit 1
fi

mkdir -p output
cp "$EPUB_FILENAME" output/book.epub

echo "✅ EPUB oluşturuldu: output/book.epub"