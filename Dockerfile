# syntax=docker/dockerfile:1
# Build the Vite SPA, then serve the static bundle from nginx.

FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# Vite inlines VITE_* env at build time, so they must be present here.
ARG VITE_ISSUER_URL=""
ARG VITE_RPC_URL=""
ARG VITE_EVENT_ID=""
ARG VITE_EVENT_NAME=""
ENV VITE_ISSUER_URL=$VITE_ISSUER_URL \
    VITE_RPC_URL=$VITE_RPC_URL \
    VITE_EVENT_ID=$VITE_EVENT_ID \
    VITE_EVENT_NAME=$VITE_EVENT_NAME

# .npmrc holds the GitHub Packages token for the private @kagehq/* deps.
# Mounted as a BuildKit secret so the token never lands in an image layer.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:80/ || exit 1
