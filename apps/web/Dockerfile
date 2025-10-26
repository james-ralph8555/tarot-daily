# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.base.json .
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json

RUN npm install

COPY . .
RUN npm install --workspace @daily-tarot/web
RUN npm run build --workspace @daily-tarot/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@daily-tarot/web", "--", "--hostname", "0.0.0.0", "--port", "3000"]
