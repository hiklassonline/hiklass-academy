# Hostinger Deployment

Use the deployment builder instead of uploading the working project folder directly. It creates two clean packages:

- `hiklass-holiday-courses-node-hostinger-*.zip` for a Hostinger Node.js app
- `hiklass-holiday-courses-public_html-*.zip` for direct static upload to `public_html`

If you upload the Node app zip into `public_html` and do not configure Hostinger's Node.js app, the server can show `403 Forbidden` because the Node package does not have `index.html` at its root.

## Create a Fresh Package

From the project root, run:

```powershell
.\scripts\create-hostinger-deploy.ps1 -Clean
```

This command:

- removes old generated packages inside `deploy`
- runs `npm run lint`
- runs `npm run build`
- creates root `dist/` for Hostinger GitHub/static deployment
- creates `deploy\hiklass-holiday-courses-node-hostinger-YYYYMMDD-HHMMSS`
- creates `deploy\hiklass-holiday-courses-public_html-YYYYMMDD-HHMMSS`
- creates matching `.zip` files in `deploy`

Use `-Clean` when you want to remove the older broken deployment folders. Run the script without `-Clean` if you want to keep previous packages.

## Option A: Full App With Registration And Email

Upload the newest `hiklass-holiday-courses-node-hostinger-*.zip` to a Hostinger Node.js application root.

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

## Hostinger Node.js App Settings

Create or update the Node.js app for the subdomain with:

```text
Application root: the repository root or uploaded deployment folder
Application URL: https://hiklassacademy.com
Startup file: index.js
Start command: npm start
Node.js version: 20.19 or newer
```

For Hostinger GitHub deployments that show both static and Node fields, use:

```text
Build command: npm run build
Output directory: dist
Entry file: index.js
```

If `Entry file` is empty, Hostinger serves only the static React build. The website can load, but `/api/health`,
`/api/enrollments`, and `/api/email/status` will return the React page instead of the Node API, so enrollment storage and email
delivery cannot work.

After upload, run dependency install from Hostinger's Node.js panel if it does not happen automatically. The deployment `package.json` installs only runtime dependencies.

## Environment Variables

Set these in Hostinger's Node.js app environment settings. Replace the URL and secrets before starting the app.

```env
NODE_ENV=production
CLIENT_URL=https://hiklassacademy.com
API_BASE_URL=https://hiklassacademy.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@hiklassacademy.com
SMTP_PASS=your-hostinger-email-password
SMTP_FROM="HIKLASS Academy <info@hiklassacademy.com>"
SMTP_TIMEOUT_MS=30000
ADMIN_EMAIL=info@hiklassacademy.com
ADMIN_LOGIN_EMAIL=info@hiklassacademy.com
BUSINESS_NAME=HIKLASS Academy
JWT_SECRET=replace-with-a-long-random-jwt-secret
ADMIN_TOKEN=replace-with-a-long-random-admin-token
ADMIN_PASSWORD=replace-with-a-strong-admin-password
UPLOAD_DIR=uploads
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

## Option B: Static public_html Upload

If the Hostinger plan does not support Node.js apps, upload the newest `hiklass-holiday-courses-public_html-*.zip` to the subdomain document root or `public_html`.

This package contains `index.html` at the upload root and includes a `.htaccess` file for React page refreshes, so it should not produce the 403 directory listing error.

The website will load, but registration, admin APIs, saved orders, uploads, and email delivery will not work until the backend runs on Node.js.

## GitHub Static Deployment Settings

If Hostinger deploys this repository as a static site from GitHub, use:

```text
Install command: npm install
Build command: npm run build
Publish/output directory: dist
```

The root `dist/` folder is generated from `client/dist/` after each build so Hostinger can find `dist/index.html`.
