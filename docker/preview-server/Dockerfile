FROM node:20-alpine

# busybox tar умеет -xzf, но ставим gnu tar+gzip явно — детерминированная
# распаковка bsdtar/gnutar-архивов с любой dev-машины (Win/macOS/Linux).
RUN apk add --no-cache tar

WORKDIR /app
COPY server.mjs ./

ENV PORT=8080 \
    PREVIEW_PORT_BASE=8100 \
    DATA_DIR=/data

VOLUME ["/data"]

# main API/landing + диапазон под раздачу приложений (по порту на app).
# Диапазон при необходимости расширь здесь и в docker-compose.yml.
EXPOSE 8080 8100-8120

CMD ["node", "server.mjs"]
