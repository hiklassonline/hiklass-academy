# HIKLASS Academy Holiday Courses

Full-stack React/Vite and Node/Express project for HIKLASS Academy holiday course enrollment. Students can browse courses and packages, apply discounts, choose a payment method, submit an order, receive email confirmation, and continue on WhatsApp. Admin users can manage enrollments, courses, packages, students, payments, reports, settings, profile avatar uploads, and email logs.

## Project Structure

```text
hiklass-holiday-courses/
  client/                 React + Vite frontend
    public/.htaccess      Hostinger SPA fallback copied into dist
    src/                  Pages, components, services, data, and assets
  server/                 Express API, email, admin routes, uploads
  storage/                Local JSON data used by the backend
  scripts/                Hostinger deployment package builder
```

## Local Installation

```bash
npm install
```

The root `postinstall` installs both `server` and `client` dependencies.
On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`:

```powershell
npm.cmd install
```

## Frontend Setup

```bash
npm run dev --prefix client
npm run build --prefix client
npm run preview --prefix client
```

Frontend env files:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SMARTSUPP_KEY=your_smartsupp_key
```

`client/.env.production` currently contains the requested Hostinger example:

```env
VITE_API_URL=https://hiklassacademy.com/api
VITE_SMARTSUPP_KEY=your_smartsupp_key
```

If the Node backend serves the frontend from the same subdomain, set `VITE_API_URL` to the API root ending in `/api`.

## Backend Setup

Create `server/.env` from `server/.env.example` and fill real values locally or in Hostinger's Node.js environment panel.

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@hiklassacademy.com
SMTP_PASS=your_password_here
SMTP_FROM="HIKLASS Academy <info@hiklassacademy.com>"
SMTP_TIMEOUT_MS=30000
ADMIN_EMAIL=info@hiklassacademy.com
ADMIN_LOGIN_EMAIL=info@hiklassacademy.com
BUSINESS_NAME=HIKLASS Academy
JWT_SECRET=change_this_secret
ADMIN_TOKEN=change_this_admin_dashboard_token
ADMIN_PASSWORD=change_this_admin_password
UPLOAD_DIR=uploads
SMARTSUPP_KEY=your_smartsupp_key
```

Run the backend:

```bash
npm run dev --prefix server
npm start --prefix server
```

Health checks:

```text
http://localhost:5000/api/health
http://localhost:5000/api/email/status
```

Enrollment submissions use:

```text
POST http://localhost:5000/api/enrollments
POST https://hiklassacademy.com/api/enrollments
```

## Root Commands

```bash
npm run dev
npm run build
npm start
npm run lint
```

## Routes

Public frontend routes are handled by the Vite SPA:

```text
/
/courses
/about
/contact
/enroll
```

Admin routes redirect unauthenticated users to `/admin/login`:

```text
/admin/login
/admin/dashboard
/admin/courses
/admin/packages
/admin/enrollments
/admin/students
/admin/payments
/admin/reports
/admin/settings
```

## Security Notes

Never put SMTP passwords, admin passwords, JWT secrets, or private credentials in React code or `VITE_*` variables. Keep real secrets in `server/.env` locally or Hostinger environment variables in production. `.env` files and logs are ignored; examples contain placeholders only.

The frontend Smartsupp widget loads only when `VITE_SMARTSUPP_KEY` is set, and it is disabled on admin pages.

## Hostinger Subdomain Deployment

Example subdomain:

```text
hiklassacademy.com
```

Build the frontend:

```bash
npm run build
```

The frontend output is `client/dist`, and the root build also syncs it to `dist` for Hostinger GitHub/static deployments. The SPA fallback lives in `client/public/.htaccess`, so Vite copies it into the build during the build. Upload the contents of `client/dist` or root `dist` to the Hostinger subdomain document root, such as `public_html/academy` or the subdomain folder.

For Hostinger GitHub/static deployment, use:

```text
Install command: npm install
Build command: npm run build
Publish/output directory: dist
```

If Hostinger supports Node.js apps, deploy the backend with:

```text
Application root: repository root
Startup file: index.js
Start command: npm start
PORT: set by Hostinger or your env
```

If the Hostinger plan is shared hosting without Node.js, only the static frontend can be hosted there. Enrollment submission, admin APIs, saved orders, uploads, discount validation, and email delivery need a Hostinger Node.js app, VPS, or external Node backend.

Use the deployment builder for clean zip packages:

```powershell
.\scripts\create-hostinger-deploy.ps1 -Clean
```

The deployment builder runs lint and build first, excludes `node_modules`, logs, local `.env` files, existing storage JSON data, and generated working files, then creates a Node app package and a static `public_html` fallback package under `deploy/`.

See `HOSTINGER_DEPLOYMENT.md` for the full Hostinger checklist.

## SMTP Email Setup

Use Hostinger SMTP values:

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@hiklassacademy.com
SMTP_PASS=your_hostinger_email_password
SMTP_FROM="HIKLASS Academy <info@hiklassacademy.com>"
```

After deployment, open `/api/email/status`. If it reports an outbound SMTP timeout, the app is running but the host/network is blocking SMTP or the SMTP settings need adjustment.

## Troubleshooting

- Frontend cannot submit: confirm `VITE_API_URL` points to the deployed API root, for example `https://hiklassacademy.com/api`, and CORS `CLIENT_URL` matches the frontend origin.
- Admin redirects to login: sign in at `/admin/login` with `ADMIN_LOGIN_EMAIL` and `ADMIN_PASSWORD`.
- Email fails but order saves: verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS`.
- React route refresh returns 404: confirm `.htaccess` was uploaded with `client/dist`.
- Avatar does not display: confirm `server/uploads` is writable and `/uploads` static serving is enabled.
- Production says frontend build missing: run `npm run build` before `npm start`.

## Verification

```bash
npm install
npm run lint
npm run build
npm start
```

Windows PowerShell equivalent:

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run build
npm.cmd start
```
