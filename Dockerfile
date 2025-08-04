# ---- Builder Stage ----
FROM node:18-alpine AS builder

# Install security updates and necessary tools
RUN apk update && apk upgrade && apk add --no-cache dumb-init

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies with npm ci for faster, reliable builds
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy source code and configuration
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && apk add --no-cache dumb-init

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy dependency files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install only production dependencies
RUN npm ci --only=production \
    npm cache clean --force

# Copy built application and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Change ownership of app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]