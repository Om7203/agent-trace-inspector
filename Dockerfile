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

USER node
CMD ["node", "src/server.mjs"]
