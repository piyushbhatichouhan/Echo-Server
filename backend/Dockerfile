FROM node:20-bookworm-slim

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci --omit=dev

COPY backend .

EXPOSE 3000

CMD ["npm", "start"]