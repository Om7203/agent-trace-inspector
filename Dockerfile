FROM node:22-alpine

WORKDIR /app
COPY src ./src
COPY public ./public
COPY data ./data
COPY docs ./docs

# The service has no runtime packages. Remove npm and its dependency tree from
# the final image to reduce both attack surface and scanner noise.
RUN rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx

ENV HOST=0.0.0.0
ENV PORT=3100
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/api/health/live || exit 1

USER node
CMD ["node", "src/server.mjs"]
