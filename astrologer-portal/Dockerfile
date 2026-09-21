# Stage 1 — build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=https://api.grahvarta.com
RUN VITE_API_URL=$VITE_API_URL npm run build

# Stage 2 — serve with nginx
# Files go under /astrologer-portal/ so the URL path /astrologer-portal/... maps
# directly to the file system. Vite builds with base:'/astrologer-portal/' so all
# asset references are already /astrologer-portal/...
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/astrologer-portal

RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;\n\
    location / {\n\
        try_files $uri $uri/ /astrologer-portal/index.html;\n\
    }\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 30d;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
