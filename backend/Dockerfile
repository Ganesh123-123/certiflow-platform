# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

# Copy compiled app + ALL node_modules (includes devDeps for ts-node/seed)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Copy seed script source (ts-node is available in node_modules)
COPY prisma/seed.ts ./prisma/seed.ts

RUN mkdir -p uploads/certificates

EXPOSE 3001

# Run migrations then start server
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
