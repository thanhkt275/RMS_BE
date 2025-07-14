# ---- Builder Stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# Install ALL dependencies (including dev dependencies) for building
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm ci --include=dev

# Copy source files and configuration
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY webpack-hmr.config.js ./

# Copy .env file created by GitHub Actions (this will override any local .env)
COPY .env ./

# Generate Prisma client (for Alpine)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the app
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Install only production dependencies
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm ci --only=production

# Copy built app and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy .env file from builder stage
COPY --from=builder /app/.env ./

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/main"]
