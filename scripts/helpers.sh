#!/usr/bin/env bash

# Bu script doğrudan çalıştırılamaz, sadece 'source' ile dahil edilebilir.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "Bu bir yardımcı script'tir ve doğrudan çalıştırılamaz." >&2
    exit 1
fi

# Ortak hata fonksiyonu
# Kullanım: die "Bir hata oluştu."
die() {
  echo "❌ Hata: $1" >&2
  exit 1
}

# Payload'dan güvenli ve merkezi bir şekilde veri okuma fonksiyonu
# Kullanım: BOOK_TITLE=$(get_book_value '.book.title' "Başlıksız Kitap")
get_book_value() {
  local query="$1"
  local fallback="${2:-}"
  local payload_file="${PAYLOAD_FILE:-./book-content/payload.json}"

  if [[ ! -r "$payload_file" ]]; then
    die "Payload dosyası bulunamadı veya okunamıyor: $payload_file"
  fi

  jq -r "$query // \"$fallback\"" "$payload_file"
}