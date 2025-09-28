#!/usr/bin/env bash
set -euo pipefail

# Sadece ve sadece ana script'in çalışması için mutlak gerekli
# olan BOOK_ID'nin varlığını kontrol et.
: "${BOOK_ID:?book_id girdisi zorunludur. Lütfen GitHub Actions'da bir input olarak tanımlayın.}"

# BOOK_ID'yi sonraki adımların kullanabilmesi için dışa aktar.
# Bu satır sadece GitHub Actions gibi ortamlarda çalışır.
if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "BOOK_ID=$BOOK_ID" >> "$GITHUB_ENV"
fi

echo "✅ Girdi doğrulandı: BOOK_ID mevcut."