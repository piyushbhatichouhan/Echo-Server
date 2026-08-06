FROM node:20-bookworm-slim

WORKDIR /app

# Install required system packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./

RUN npm ci --omit=dev

COPY backend .

EXPOSE 3000

CMD ["npm", "start"]