#!/bin/sh
set -e

echo "⏳ Waiting for database to be ready..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => { client.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "   Database not ready yet, retrying in 2 seconds..."
  sleep 2
done

echo "✅ Database is ready."

echo "📁 Ensuring storage directories exist..."
mkdir -p storage/uploads storage/temp_uploads storage/backups
echo "✅ Storage directories ready."

echo "🔄 Running database migrations..."
./node_modules/.bin/drizzle-kit push --force

echo "🚀 Starting application on port $PORT..."
exec node dist/index.cjs
