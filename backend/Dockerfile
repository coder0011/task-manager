# Multi-stage production build using lightweight Alpine Linux
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline || npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline || npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/schema.sql ./dist/database/schema.sql
COPY --from=builder /app/src/schema.sql ./dist/schema.sql

# Create uploads storage folders and assign ownership to non-root user
RUN mkdir -p uploads/attachments uploads/avatars && chown -R node:node /app

USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]
