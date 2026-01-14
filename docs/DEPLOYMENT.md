# Deployment & Operations Guide

## 1. Build Pipeline

The application uses **Vite** for building production-ready assets.

### Build Command
```bash
npm run build
```
This command performs:
1.  **Type Check:** `tsc -b` (TypeScript Compiler) verification.
2.  **Bundling:** `vite build` generates optimized HTML/CSS/JS in `dist/`.

### Output
- `dist/index.html`: Entry point.
- `dist/assets/`: Hashed static assets (long-term caching friendly).

## 2. Docker Containerization

We provide a standard Nginx-based container for serving the static assets.

### Dockerfile
*(Create this file in the root if deployment is required)*

```dockerfile
# Stage 1: Build
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 3. CI/CD Strategy (Recommended)

### Continuous Integration (GitHub Actions)
- **Trigger:** Pull Request to `main`.
- **Jobs:**
    - `lint`: Run `eslint .`
    - `type-check`: Run `tsc --noEmit`
    - `test`: Run unit tests (future)
    - `build`: Verify build completes successfully

### Continuous Deployment
- **Trigger:** Merge to `main`.
- **Target:** AWS CloudFront + S3 (or Vercel/Netlify for prototypes).
- **Process:**
    1.  Checkout code.
    2.  Install dependencies (`npm ci`).
    3.  Build project.
    4.  Sync `dist/` folder to storage bucket.
    5.  Invalidate CDN cache.

## 4. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Endpoint for the Governance API | `http://localhost:3000` (Mock) |
| `VITE_ENV` | Environment name | `development` |

*Note: Frontend environment variables must start with `VITE_`.*
