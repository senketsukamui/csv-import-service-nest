FROM node:21-alpine

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
RUN pnpm dlx prisma generate

WORKDIR /app/apps/worker

CMD ["pnpm", "start:dev"]
