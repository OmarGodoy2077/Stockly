# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with npm ci
RUN npm ci --only=production

# Copy source code
COPY . .

# TypeScript compilation and Vite build
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

