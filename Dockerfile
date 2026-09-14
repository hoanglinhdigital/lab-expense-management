# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1. deps: cai dependencies rieng de tan dung Docker layer cache
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

# ---------------------------------------------------------------------------
# 2. builder: sinh lai Prisma Client dung schema hien tai roi build Next.js
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

# `next build` chi parse DATABASE_URL (new URL(...)) khi collect page data cho
# route handler, khong thuc su ket noi DB - dung placeholder hop le la du.
# DATABASE_URL that duoc truyen vao luc `docker run -e DATABASE_URL=...`.
ARG DATABASE_URL="mysql://build:build@localhost:3306/build_placeholder"
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------------------------------------------------------------------------
# 3. runner: chi copy output standalone (Next.js output: "standalone")
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# `prisma db seed` spawn `tsx` nhu mot command rieng (khong qua require) nen
# can node_modules/.bin trong PATH, neu khong se loi "spawn tsx ENOENT".
ENV PATH="/app/node_modules/.bin:${PATH}"

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Bo sung full node_modules (co prisma CLI + tsx + dotenv - la devDependencies
# khong duoc Next.js output tracing dua vao standalone) va source can thiet de
# entrypoint co the tu chay `prisma migrate deploy` + `prisma db seed` truoc
# khi start server, phuc vu auto-seed data tren ECS lan dau khoi dong.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./src/lib

COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
