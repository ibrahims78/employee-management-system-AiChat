# Docker Configuration
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
# Install production dependencies including tsx for migrations/scripts if needed
COPY package*.json ./
RUN npm install --omit=dev && npm install -g tsx
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
# Create storage directories
RUN mkdir -p storage/uploads storage/temp_uploads
EXPOSE 5001
ENV NODE_ENV=production
CMD ["node", "dist/index.cjs"]
