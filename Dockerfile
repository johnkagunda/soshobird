# ──────────────────────────────────────────────
# Stage 1 — Build the Expo web app
# ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps needed for the build)
RUN npm ci --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Inject Supabase public keys as build-time env vars.
# On Render, set these as Environment Variables in the dashboard.
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

# Export the Expo web app to a static site in /app/dist
RUN npx expo export -p web

# ──────────────────────────────────────────────
# Stage 2 — Serve with a tiny static file server
# ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install `serve` — a zero-config static file server
RUN npm install -g serve

# Copy only the built output from the builder stage
COPY --from=builder /app/dist ./dist

# Render uses port 10000 by default; serve on that port
EXPOSE 10000

# --single enables SPA fallback (all routes → index.html)
CMD ["serve", "dist", "--listen", "10000", "--single"]
