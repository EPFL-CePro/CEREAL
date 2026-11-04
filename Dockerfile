FROM node:24.22.1 AS builder
WORKDIR /app

RUN corepack enable

# The install runs on Debian but the app runs on Alpine: Prisma must also download the musl schema engine used by the migrations
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x,linux-musl-openssl-3.0.x

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm generate
RUN pnpm build

FROM node:24.22.1-alpine AS runner
WORKDIR /app

RUN apk add --no-cache unzip samba-client

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# Needed by `prisma migrate deploy`
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]