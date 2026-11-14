FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY frontend/package*.json ./

RUN npm ci

COPY frontend .

ARG VITE_API_URL
ARG VITE_SERVER_IP
ARG VITE_BASE_DOMAIN

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SERVER_IP=$VITE_SERVER_IP
ENV VITE_BASE_DOMAIN=$VITE_BASE_DOMAIN

RUN npm run build


FROM nginx:alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]