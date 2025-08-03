# ---- Builder Stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# Copy lockfile and package.json only
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install all deps (for building)
RUN npm ci
ENV NODE_ENV=production

# Copy source code
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Generate Prisma client (if schema used at build)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the app
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Only install production deps
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm ci --omit=dev

# Copy built code and prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Do NOT copy .env into the image
# Expect it to be passed at runtime (via Compose or CI/CD)

EXPOSE 5000

CMD ["node", "dist/main"]
