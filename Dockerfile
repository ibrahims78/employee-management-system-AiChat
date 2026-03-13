FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
# تثبيت أدوات النظام الضرورية
RUN apt-get update && apt-get install -y dos2unix && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# تثبيت حزم الإنتاج مع تثبيت drizzle-kit بشكل صريح لتنفيذ الـ migrations
RUN npm install --production && npm install drizzle-kit

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

RUN mkdir -p storage/uploads storage/temp_uploads storage/backups

COPY entrypoint.sh /entrypoint.sh
# تحويل الملف إلى تنسيق LF وضمان صلاحيات التنفيذ
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 5001
ENV NODE_ENV=production
ENV PORT=5001

ENTRYPOINT ["/entrypoint.sh"]
