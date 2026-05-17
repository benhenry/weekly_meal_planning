# --- stage 1: build the frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- stage 2: install backend production deps ---
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# --- stage 3: runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
ENV STATIC_DIR=/app/public

COPY backend/ ./backend/
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=frontend-build /app/frontend/dist ./public

RUN mkdir -p /data
EXPOSE 3001
VOLUME ["/data"]

CMD ["node", "backend/src/server.js"]
