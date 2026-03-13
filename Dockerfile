FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./

# Configure npm to handle network issues: more retries, longer timeouts
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 15000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000 \
 && npm install

COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y dos2unix && rm -rf /var/lib/apt/lists/*

# Copy node_modules from builder instead of re-downloading from npm
COPY --from=builder /app/node_modules ./node_modules

# Copy built application files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

COPY table.sql ./dist/table.sql

RUN mkdir -p storage/uploads storage/temp_uploads storage/backups

COPY entrypoint.sh /entrypoint.sh
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 5001
ENV NODE_ENV=production
ENV PORT=5001

ENTRYPOINT ["/entrypoint.sh"]
