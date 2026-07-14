FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Vite inlines VITE_* vars at build time, not at container start — so this has to be
# a build arg, not a plain runtime environment variable. Pass it via
# `docker compose build --build-arg VITE_API_BASE_URL=...` or set it in docker-compose.yml.
ARG VITE_API_BASE_URL=http://localhost:4000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY public/offline.html /usr/share/nginx/html/offline.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
