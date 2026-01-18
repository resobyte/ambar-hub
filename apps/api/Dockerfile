# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy packages (shared dependencies)
COPY packages ./packages

# Copy api app
COPY apps/api ./apps/api

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the api
WORKDIR /app
RUN pnpm run build:api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm for production
RUN npm install -g pnpm

# Copy built app and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api

EXPOSE 3001

ENV NODE_ENV=production

CMD sh -c "ls -la /app/apps/api/dist && node /app/apps/api/dist/main.js"
