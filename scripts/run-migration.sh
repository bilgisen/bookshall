#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting database migration to UUID..."

# Step 1: Backup the database
echo "📦 Creating database backup..."
npx tsx scripts/backup-db.ts

# Step 2: Run the migration
echo "🔄 Running UUID migration..."
npx tsx scripts/convert-to-uuid.ts

echo "✅ Migration completed successfully!"
echo "💡 Don't forget to update your application code to use UUIDs for book and chapter IDs."
