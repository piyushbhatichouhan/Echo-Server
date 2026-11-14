/**
 * Generates an optimized, multi-stage, hardened Dockerfile based on detected language and target port.
 */
function generateDockerfileForLanguage(language, { port = 3000, buildCommand = "", startCommand = "" } = {}) {
  const safePort = Number(port) || 3000;

  switch (language) {
    case "go":
      return `FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata
COPY go.* ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server .

FROM alpine:3.19
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /app/server /app/server
EXPOSE ${safePort}
ENV PORT=${safePort}
CMD ["/app/server"]
`;

    case "rust":
      return `FROM rust:1.77-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev gcc make
COPY Cargo.* ./
COPY . .
RUN cargo build --release

FROM alpine:3.19
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /app/target/release/ /tmp/release/
RUN find /tmp/release -maxdepth 1 -type f -executable -exec cp {} /app/app_bin \\;
EXPOSE ${safePort}
ENV PORT=${safePort}
CMD ["/app/app_bin"]
`;

    case "bun":
      return `FROM oven/bun:1-alpine
WORKDIR /app
COPY package*.json bun.lock* ./
RUN bun install --production || bun install
COPY . .
EXPOSE ${safePort}
ENV PORT=${safePort} NODE_ENV=production
CMD ${startCommand ? JSON.stringify(startCommand.split(" ")) : '["bun", "run", "start"]'}
`;

    case "php":
      return `FROM php:8.2-apache
RUN a2enmod rewrite
WORKDIR /var/www/html
COPY . /var/www/html/
EXPOSE 80
ENV PORT=80
`;

    case "ruby":
      return `FROM ruby:3.2-slim
WORKDIR /app
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev
COPY Gemfile* ./
RUN bundle install
COPY . .
EXPOSE ${safePort}
ENV PORT=${safePort} RAILS_ENV=production
CMD ["bundle", "exec", "rackup", "--host", "0.0.0.0", "-p", "${safePort}"]
`;

    case "java":
      return `FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${safePort}
ENV PORT=${safePort}
CMD ["java", "-jar", "app.jar"]
`;

    case "python":
      return `FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PORT=${safePort}
COPY requirements*.txt pyproject.toml* ./
RUN pip install --no-cache-dir -r requirements.txt || true
COPY . .
EXPOSE ${safePort}
CMD ${startCommand ? JSON.stringify(startCommand.split(" ")) : '["python", "app.py"]'}
`;

    case "static":
      return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
ENV PORT=80
`;

    case "node":
    default:
      return `FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=${safePort}
COPY package*.json ./
RUN npm install --production || npm install
COPY . .
${buildCommand ? `RUN ${buildCommand}` : ""}
EXPOSE ${safePort}
CMD ${startCommand ? JSON.stringify(startCommand.split(" ")) : '["npm", "start"]'}
`;
  }
}

module.exports = {
  generateDockerfileForLanguage,
};

