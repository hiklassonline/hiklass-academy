# Deployment

This project can be deployed to any host that supports Node.js (a VPS, Hostinger, Render, Railway, etc.), or to a static-only host for the frontend alone.

Use the deployment builder instead of uploading the working project folder directly. It creates two clean packages:

- `hiklass-holiday-courses-node-*.zip` for any Node.js host
- `hiklass-holiday-courses-static-*.zip` for a static/Apache-compatible document root

## Create a Fresh Package

From the project root, run:

```powershell
.\scripts\create-deploy-package.ps1 -Clean
```

This command:

- removes old generated packages inside `deploy`
- runs `npm run lint`
- runs `npm run build`
- creates root `dist/` for static/GitHub-based deployment
- creates `deploy\hiklass-holiday-courses-node-YYYYMMDD-HHMMSS`
- creates `deploy\hiklass-holiday-courses-static-YYYYMMDD-HHMMSS`
- creates matching `.zip` files in `deploy`

Use `-Clean` when you want to remove older generated packages. Run the script without `-Clean` if you want to keep previous packages.

## Option A: Full App With Registration And Email

Upload the newest `hiklass-holiday-courses-node-*.zip` to your Node.js host's application root.

The Node package should contain:

```text
client/dist/
client/src/assets/
server/index.js
server/uploads/.gitkeep
server/uploads/admin-avatars/.gitkeep
storage/.gitkeep
.env.example
package.json
README_DEPLOYMENT.md
STATIC_ONLY_FALLBACK.md
```

Do not upload the development project folder, `node_modules`, log files, real `.env` files, or existing JSON data from `storage`.

## Node.js App Settings

Create or update the Node.js app for your domain/subdomain with:

```text
Application root: the repository root or uploaded deployment folder
Application URL: https://hiklassacademy.com
Startup file: index.js
Start command: npm start
Node.js version: 20.19 or newer
```

For hosts that show both static and Node fields (e.g. GitHub-based deploys), use:

```text
Build command: npm run build
Output directory: dist
Entry file: index.js
```

If `Entry file` is left empty, the host may only serve the static React build. The website can still load, but `/api/health`,
`/api/enrollments`, and `/api/email/status` will return the React page instead of the Node API, so enrollment storage and email
delivery cannot work.

After upload, run dependency install from your host's panel if it does not happen automatically. The deployment `package.json` installs only runtime dependencies.

Many managed Node.js hosts (Hostinger included) inject the runtime `PORT` automatically through a proxy. Do not hardcode a `PORT` environment variable unless your host requires it — forcing the wrong port can make the app unreachable.

## Environment Variables

Set these in your host's Node.js app environment settings. Replace the URL and secrets before starting the app.

```env
NODE_ENV=production
CLIENT_URL=https://hiklassacademy.com
API_BASE_URL=https://hiklassacademy.com
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@hiklassacademy.com
SMTP_PASS=replace-with-your-mailbox-password
SMTP_FROM="HIKLASS Academy <info@hiklassacademy.com>"
SMTP_TIMEOUT_MS=30000
ADMIN_EMAIL=info@hiklassacademy.com
ADMIN_LOGIN_EMAIL=info@hiklassacademy.com
BUSINESS_NAME=HIKLASS Academy
JWT_SECRET=replace-with-a-long-random-jwt-secret
ADMIN_TOKEN=replace-with-a-long-random-admin-token
ADMIN_PASSWORD=replace-with-a-strong-admin-password
UPLOAD_DIR=uploads
# Optional: store persisted JSON data outside the deployed app folder so
# redeploys don't wipe orders/enrollments/students. Absolute path recommended.
DATA_DIR=/path/to/persistent/hiklass-data
SMARTSUPP_KEY=replace-with-your-smartsupp-key
WHATSAPP_PRIMARY=237651251941
```

Do not upload a real `.env` file containing passwords.

## Test After Deployment

Open these URLs:

```text
https://hiklassacademy.com/api/health
https://hiklassacademy.com/api/email/status
```

Then submit a test registration from the website. If `/api/email/status` reports SMTP trouble, the Node app is running and the remaining issue is the mail settings or outbound SMTP access.

The live frontend should be built with:

```env
VITE_API_URL=https://hiklassacademy.com/api
```

## Option B: Static Document Root Upload

If your plan does not support Node.js apps, upload the newest `hiklass-holiday-courses-static-*.zip` to the domain/subdomain document root.

This package contains `index.html` at the upload root and includes a `.htaccess` file for React page refreshes on Apache-based hosts, so it should not produce a directory listing error.

The website will load, but registration, admin APIs, saved orders, uploads, and email delivery will not work until the backend runs on Node.js somewhere.

## Static/GitHub Deployment Settings

If your host deploys this repository as a static site from GitHub, use:

```text
Install command: npm install
Build command: npm run build
Publish/output directory: dist
```

The root `dist/` folder is generated from `client/dist/` after each build so the host can find `dist/index.html`.
