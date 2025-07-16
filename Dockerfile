# ---- Builder Stage ----
FROM node:18-alpine AS builder
WORKDIR /app

# Install ALL dependencies (including dev dependencies) for building
COPY package.json pnpm-lock.yaml* package-lock.json* ./
COPY .env.production .env.production

RUN npm ci 
ENV NODE_ENV=production


# Copy source files and configuration
COPY prisma ./prisma
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Generate Prisma client (for Alpine)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the app
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production
WORKDIR /app

ENV NODE_ENV=production


# Install only production dependencies
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm ci 

# Copy built app and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma


# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
# Copy .env file from builder stage

COPY --from=builder /app/.env.production .env

EXPOSE 5000


CMD ["node", "dist/main"]
