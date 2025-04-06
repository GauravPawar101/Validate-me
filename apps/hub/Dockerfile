FROM oven/bun:latest

WORKDIR /app

# Copy the entire monorepo (or just what’s needed)
COPY ../../packages/db ./packages/db
COPY . .

# Install dependencies
RUN bun install

# Generate Prisma Client (adjust schema path if needed)
RUN bunx prisma generate --schema=./packages/db/schema.prisma

# Expose the port your WebSocket server uses
EXPOSE 8081

# Run your Bun app
CMD ["bun", "index.ts"]
