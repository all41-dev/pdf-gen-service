# ---- Build stage: compile TypeScript ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
 
# Install all dependencies (including dev) first, so this layer is cached
COPY package*.json ./
RUN npm ci
 
# Copy TypeScript config(s) and source, then compile to dist/
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build
 
# ---- Runtime stage: what actually ships ----
FROM node:22-bookworm-slim
 
# XeLaTeX and common fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
      texlive-xetex \
      texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*
 
WORKDIR /app
ENV NODE_ENV=production
 
# Runtime dependencies only
COPY package*.json ./
RUN npm ci --omit=dev
 
# Compiled code from the build stage
COPY --from=build /app/dist ./dist
 
# Run as an unprivileged user
USER node
 
CMD ["node", "/app/dist/index.js"]