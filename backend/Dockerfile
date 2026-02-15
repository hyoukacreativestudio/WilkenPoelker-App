# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (bcrypt, sharp, sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- Production stage ----
FROM node:20-alpine

LABEL maintainer="WilkenPoelker"
LABEL description="WilkenPoelker Backend API"

WORKDIR /app

# Security: add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install curl for health check
RUN apk add --no-cache curl

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src ./src

# Create directories for uploads and logs with correct ownership
RUN mkdir -p uploads logs data && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose API port
EXPOSE 5002

# Health check against the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5002/api/health || exit 1

CMD ["node", "src/app.js"]
