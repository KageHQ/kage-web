# Deploy — kage-web

Flow: push to `main` → GitHub Actions builds Docker image → pushes to
`ghcr.io/<owner>/kage-web` → triggers Dokploy redeploy webhook → Dokploy pulls
the new image. Static Vite SPA served by nginx on port 80.

## One-time setup

### 1. GitHub repo secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Value |
| --- | --- |
| `GHCR_PAT` | A PAT with `read:packages` scope that can read the private `@kagehq/*` packages. Used only to install deps during the Docker build. |
| `DOKPLOY_WEBHOOK_URL` | The Dokploy application's "Deploy webhook" URL (Dokploy app → Deployments → Webhook). |

`GITHUB_TOKEN` (auto-provided) pushes the image to GHCR — no extra secret needed.

### 2. GitHub repo variables (same page → Variables)

These are baked into the build by Vite (`import.meta.env.VITE_*`):

| Variable | Example |
| --- | --- |
| `VITE_ISSUER_URL` | `https://issuer.yourdomain.com` |
| `VITE_RPC_URL` | `https://api.devnet.solana.com` |
| `VITE_EVENT_ID` | `1001` |
| `VITE_EVENT_NAME` | `Aurora Fest, Night 1` |

### 3. Dokploy application

- Type: **Docker** (image source).
- Image: `ghcr.io/<owner>/kage-web:latest`.
- Registry credentials: add a GHCR registry in Dokploy (username + a
  `read:packages` PAT) so it can pull the private image.
- Container port: **80**. Attach a domain + Let's Encrypt cert.
- Copy the generated deploy-webhook URL into the `DOKPLOY_WEBHOOK_URL` secret above.

## Build / run locally

```sh
DOCKER_BUILDKIT=1 docker build \
  --secret id=npmrc,src=.npmrc \
  --build-arg VITE_ISSUER_URL=http://localhost:4000 \
  -t kage-web .
docker run --rm -p 8080:80 kage-web   # http://localhost:8080
```
