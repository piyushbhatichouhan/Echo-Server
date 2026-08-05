FROM node:22-alpine

WORKDIR /app

COPY router/package*.json ./

RUN npm install --omit=dev

COPY router/ .

EXPOSE 8080

CMD ["npm", "start"]