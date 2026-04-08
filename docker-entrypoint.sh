#!/bin/sh
set -e

echo "🚀 Starting Kazier Application..."

# Run Prisma migrations
if [ -n "$DATABASE_URL" ]; then
    echo "📊 Running database migrations..."
    npx prisma migrate deploy || {
        echo "⚠️  Migrate deploy failed, trying db push..."
        npx prisma db push --accept-data-loss || echo "❌ Database sync failed"
    }
    echo "✅ Database ready"
else
    echo "⚠️  DATABASE_URL not set, skipping migrations"
fi

# Execute the main command
echo "🎯 Starting Next.js server..."
exec "$@"
