#!/bin/sh
set -e

echo "⏳ Waiting for database..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => { client.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "   Not ready, retrying in 2s..."
  sleep 2
done
echo "✅ Database ready."

echo "📁 Ensuring storage directories exist..."
mkdir -p storage/uploads storage/temp_uploads storage/backups
echo "✅ Storage directories ready."

echo "🔄 Running database migrations..."
./node_modules/.bin/drizzle-kit push --force
echo "✅ Migrations done."

echo "🚀 Starting dev server on port $PORT..."
exec ./node_modules/.bin/tsx server/index.ts
