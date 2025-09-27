# Use the official Bun image
FROM oven/bun:1.1.34-alpine as base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S contekst -u 1001

# Change ownership of the app directory
RUN chown -R contekst:nodejs /app
USER contekst

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# Start the application
CMD ["bun", "start"]
