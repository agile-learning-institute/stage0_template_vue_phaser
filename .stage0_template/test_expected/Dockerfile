# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./

# .npmrc for GitHub Packages - GITHUB_TOKEN required (build fails if missing)
ARG GITHUB_TOKEN
RUN echo "@agile-learning-institute:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc

# Pin spa_utils version for reproducible builds
ARG SPA_UTILS_VERSION=0.1.0
RUN sed -i "s|\"@agile-learning-institute/mentorhub_spa_utils\": \"[^\"]*\"|\"@agile-learning-institute/mentorhub_spa_utils\": \"${SPA_UTILS_VERSION}\"|g" package.json

RUN npm install

COPY . .
RUN npm run build

RUN DATE=$(date "+%Y-%m-%d:%H:%M:%S") && echo "$DATE" > ./dist/patch.txt

# Deploy stage
FROM nginx:stable-alpine

LABEL org.opencontainers.image.source="https://github.com/agile-learning-institute/mentorhub_sample_spa"

ENV API_HOST=mentorhub_sample_api
ENV API_PORT=8389

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# envsubst for runtime nginx config (API_HOST/API_PORT in proxy_pass)
RUN apk add --no-cache gettext

EXPOSE 80

# Note: \${API_HOST} \${API_PORT} must be escaped so the shell passes them literally to envsubst
CMD sh -c "envsubst '\${API_HOST} \${API_PORT}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf && exec nginx -g 'daemon off;' -c /tmp/nginx.conf"