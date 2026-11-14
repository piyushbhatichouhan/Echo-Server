FROM node:22-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

RUN npm install --omit=dev

# Copy application sources
COPY . ./

USER node

EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/_health || exit 1

CMD ["node", "server.js"]