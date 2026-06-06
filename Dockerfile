# ─────────────────────────────────────────────────────────────────
# Stage 1 – deps
# Install production dependencies in a clean layer so they are
# cached independently from the source code.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev


# ─────────────────────────────────────────────────────────────────
# Stage 2 – dev
# Full development image: includes devDependencies and source code
# mounted at runtime via a bind-mount in docker-compose.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev

# Security: run as non-root user
RUN addgroup -S aivacol && adduser -S aivacol -G aivacol

WORKDIR /app

# Install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy source – overridden at runtime by the bind-mount in dev
COPY --chown=aivacol:aivacol . .

USER aivacol

EXPOSE 3000

# Placeholder command; real entrypoint is controlled by docker-compose
CMD ["node", "--version"]


# ─────────────────────────────────────────────────────────────────
# Stage 3 – build
# Compile TypeScript to JavaScript for production.
# ─────────────────────────────────────────────────────────────────
FROM dev AS build

RUN npm run build


# ─────────────────────────────────────────────────────────────────
# Stage 4 – prod
# Lean production image: only compiled output + prod node_modules.
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS prod

RUN addgroup -S aivacol && adduser -S aivacol -G aivacol

WORKDIR /app

COPY --from=deps  --chown=aivacol:aivacol /app/node_modules ./node_modules
COPY --from=build --chown=aivacol:aivacol /app/dist         ./dist
COPY package*.json ./

USER aivacol

EXPOSE 3000

CMD ["node", "dist/main.js"]
