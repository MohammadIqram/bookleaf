# Multi-stage production Dockerfile for BookLeaf Express Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci --no-audit --no-fund
RUN npx prisma generate

# Copy source code and config
COPY . .

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install OpenSSL and curl for Prisma engine compatibility and health checks
RUN apk add --no-cache openssl curl

# Copy runtime assets from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/openapi.yaml ./
COPY --from=builder /app/bookleaf_sample_data.json ./

# Non-root user for security
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

CMD ["node", "src/server.js"]
