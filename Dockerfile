# Multi-stage Dockerfile for ShiftManager
# Stage 1: Build dependencies and application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
# Copy workspace package.json files (only shared exists, client and server use root package.json)
COPY shared/package.json ./shared/

# Install only production dependencies
RUN npm ci --production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/migrations ./migrations

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/companies', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the application
CMD ["node", "dist/index.js"]

