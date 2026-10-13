FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY data ./data
COPY docs ./docs

ENV HOST=0.0.0.0
ENV PORT=3100
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/api/health/live || exit 1

USER node
CMD ["node", "src/server.mjs"]
