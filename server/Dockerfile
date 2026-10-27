# Multi-stage production Dockerfile for BookLeaf Express Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json prisma.config.* ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci --no-audit --no-fund

# Copy source code and specs
COPY . .

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install OpenSSL for Prisma engine compatibility
RUN apk add --no-cache openssl curl

# Copy runtime assets from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/openapi.yaml ./

# Non-root user for security
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
