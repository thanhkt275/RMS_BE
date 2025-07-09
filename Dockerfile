# ---- Builder Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ && \
    ln -sf python3 /usr/bin/python

COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      npm install -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

COPY prisma/schema.prisma ./prisma/
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npx prisma generate && \
    npm run build && \
    npm prune --production && \
    npm cache clean --force

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER appuser

EXPOSE 3000
CMD ["node", "dist/main"]
