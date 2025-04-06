# Use Bun base image
FROM oven/bun:latest

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN bun install

# Generate Prisma Client from db package
RUN bunx prisma generate --schema=packages/db/schema.prisma

# Build all apps
RUN bun run build --filter=api && \
    bun run build --filter=hub && \
    bun run build --filter=validator && \
    bun run build --filter=frontend

# Expose ports (adjust as needed)
EXPOSE 3000 8080 8081

# By default, run API (override CMD in Railway or Fly for others)
CMD ["bun", "apps/api/index.ts"]
