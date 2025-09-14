#!/bin/bash

# Export the database URL (make sure to replace with your actual database URL)
export POSTGRES_URL_NON_POOLING="postgres://postgres.nkbgwjulknejfkpxwjsj:YaQ7RzDKh0dpjhCf@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Run the script
npx tsx scripts/award-welcome-bonus.ts
