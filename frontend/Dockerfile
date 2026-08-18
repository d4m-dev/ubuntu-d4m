# ============================================================
# 🎨 D4M FRONTEND — Dockerfile (multi-stage build)
# React + Vite build → phục vụ bằng Nginx, proxy /api tới backend
# ============================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Vite dùng relative /api (proxy Nginx) nên VITE_API_BASE_URL để trống
ENV VITE_API_BASE_URL=
ENV VITE_WS_BASE_URL=
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
