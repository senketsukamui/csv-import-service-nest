FROM node:22-alpine

RUN apk add --no-cache openssl
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/utils/package.json ./packages/utils/
COPY packages/minio/package.json ./packages/minio/

RUN pnpm install --frozen-lockfile

COPY apps/worker ./apps/worker
COPY packages ./packages
COPY prisma ./prisma
COPY tsconfig.json ./

RUN pnpm --filter @csv-import/minio build
RUN npx prisma generate --schema=/app/prisma/schema.prisma

WORKDIR /app/apps/worker
RUN pnpm build

CMD ["pnpm", "start:prod"]
