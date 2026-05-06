FROM node:21-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/utils/package.json ./packages/utils/
COPY packages/minio/package.json ./packages/minio/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages ./packages
COPY prisma ./prisma
COPY tsconfig.json ./

RUN pnpm --filter @csv-import/minio build

RUN pnpm dlx prisma generate

WORKDIR /app/apps/api

CMD ["pnpm", "start:dev"]