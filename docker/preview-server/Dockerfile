FROM node:20-alpine

# busybox tar умеет -xzf, но ставим gnu tar+gzip явно — детерминированная
# распаковка bsdtar/gnutar-архивов с любой dev-машины (Win/macOS/Linux).
RUN apk add --no-cache tar

WORKDIR /app
COPY server.mjs ./

ENV PORT=8080 \
    DATA_DIR=/data

VOLUME ["/data"]

# Один порт на весь сервер — приложения раздаются под своими base-путями
# (path-based, например /ewc/), не по порту на приложение.
EXPOSE 8080

CMD ["node", "server.mjs"]
