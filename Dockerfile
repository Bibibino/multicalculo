FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.build.json eslint.config.mjs .prettierrc.json ./
COPY prisma ./prisma
COPY docs ./docs
COPY apps ./apps
COPY packages ./packages

RUN pnpm install
RUN pnpm prisma:generate

EXPOSE 3000 3001 3002

CMD ["pnpm", "dev"]
