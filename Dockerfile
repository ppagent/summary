FROM node:20-alpine AS deps
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm --registry=https://registry.npmmirror.com
ENV FFMPEG_BINARIES_URL="https://cdn.npmmirror.com/binaries/ffmpeg-static"
RUN pnpm install --registry=https://registry.npmmirror.com

FROM node:20-alpine AS builder
ARG APP_ENV
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /usr/app
ARG APP_ENV
COPY --from=builder /app/build ./build
COPY package.json ./
COPY ./config ./config
COPY ./public ./public
RUN rm -rf /usr/app/public/temp
RUN npm install -g pnpm --registry=https://registry.npmmirror.com
ENV FFMPEG_BINARIES_URL="https://cdn.npmmirror.com/binaries/ffmpeg-static"
RUN pnpm install --prod --registry=https://registry.npmmirror.com
RUN chown -R node ./
USER node
ENV NODE_ENV="production"
EXPOSE 5050
CMD ["npm", "start"]
