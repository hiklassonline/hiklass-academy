param(
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$deployRoot = Join-Path $root 'deploy'
$clientDist = Join-Path $root 'client\dist'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$packageName = "hiklass-holiday-courses-node-$timestamp"
$packageDir = Join-Path $deployRoot $packageName
$zipPath = Join-Path $deployRoot "$packageName.zip"
$staticPackageName = "hiklass-holiday-courses-static-$timestamp"
$staticPackageDir = Join-Path $deployRoot $staticPackageName
$staticZipPath = Join-Path $deployRoot "$staticPackageName.zip"
$npmCommand = if ($IsWindows -or $env:OS -eq 'Windows_NT') { 'npm.cmd' } else { 'npm' }

function Copy-Directory($Source, $Destination) {
  if (!(Test-Path $Source)) {
    throw "Required path does not exist: $Source"
  }

  New-Item -ItemType Directory -Force $Destination | Out-Null
  Copy-Item -Path (Join-Path $Source '*') -Destination $Destination -Recurse -Force
}

function Write-Utf8File($Path, $Content) {
  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force $directory | Out-Null
  }
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

New-Item -ItemType Directory -Force $deployRoot | Out-Null

if ($Clean) {
  $resolvedDeployRoot = (Resolve-Path $deployRoot).Path
  if (!$resolvedDeployRoot.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean outside the project: $resolvedDeployRoot"
  }

  Get-ChildItem -Path $deployRoot -Force | Remove-Item -Recurse -Force
}

Push-Location $root
try {
  & $npmCommand run lint
  & $npmCommand run build
}
finally {
  Pop-Location
}

if (!(Test-Path (Join-Path $clientDist 'index.html'))) {
  throw 'Frontend build failed: client\dist\index.html was not created.'
}

New-Item -ItemType Directory -Force $packageDir | Out-Null
New-Item -ItemType Directory -Force (Join-Path $packageDir 'server') | Out-Null

Copy-Item -Path (Join-Path $root 'server\index.js') -Destination (Join-Path $packageDir 'server\index.js') -Force
Copy-Directory (Join-Path $root 'client\dist') (Join-Path $packageDir 'client\dist')
Copy-Directory (Join-Path $root 'client\src\assets') (Join-Path $packageDir 'client\src\assets')
Get-ChildItem -Path $packageDir -Recurse -Force -Include '*.log' | Remove-Item -Force

$rootEntrypoint = @"
import { startServer } from './server/index.js';

startServer();
"@
Write-Utf8File (Join-Path $packageDir 'index.js') $rootEntrypoint

New-Item -ItemType Directory -Force (Join-Path $packageDir 'server\uploads\admin-avatars') | Out-Null
Write-Utf8File (Join-Path $packageDir 'server\uploads\.gitkeep') ''
Write-Utf8File (Join-Path $packageDir 'server\uploads\admin-avatars\.gitkeep') ''
Write-Utf8File (Join-Path $packageDir 'storage\.gitkeep') ''

$serverPackage = Get-Content (Join-Path $root 'server\package.json') -Raw | ConvertFrom-Json
$dependenciesJson = $serverPackage.dependencies | ConvertTo-Json -Depth 10
$runtimePackage = @"
{
  "name": "hiklass-holiday-courses-runtime",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=20.19"
  },
  "dependencies": $dependenciesJson
}
"@
Write-Utf8File (Join-Path $packageDir 'package.json') $runtimePackage

Push-Location $packageDir
try {
  & $npmCommand install --package-lock-only --omit=dev --ignore-scripts
}
finally {
  Pop-Location
}

$envExample = @"
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
SMARTSUPP_KEY=replace-with-your-smartsupp-key
WHATSAPP_PRIMARY=237651251941
"@
Write-Utf8File (Join-Path $packageDir '.env.example') $envExample

$packageReadme = @"
# HIKLASS Node Deployment Package

Upload the contents of this folder to your Node.js hosting provider's application root.

Typical settings needed on the host:

- Application root: this uploaded folder
- Startup file: index.js
- Start command: npm start
- Node.js version: 20.19 or newer

Before starting the app, set the production environment variables from .env.example in your host's environment settings.

After deployment, test:

- /api/health
- /api/email/status

Do not upload a real .env file with passwords. Keep secrets in your host's environment variables.
"@
Write-Utf8File (Join-Path $packageDir 'README_DEPLOYMENT.md') $packageReadme

$staticFallback = @"
# Static-only fallback

If your host does not support Node.js apps, upload the contents of client/dist to the document root instead.

The website will load, but registration, admin APIs, saved orders, uploads, and email delivery require the Node.js app.
"@
Write-Utf8File (Join-Path $packageDir 'STATIC_ONLY_FALLBACK.md') $staticFallback

Compress-Archive -Path (Join-Path $packageDir '*') -DestinationPath $zipPath -Force

New-Item -ItemType Directory -Force $staticPackageDir | Out-Null
Copy-Directory (Join-Path $root 'client\dist') $staticPackageDir

$htaccess = @"
Options -Indexes

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
"@
Write-Utf8File (Join-Path $staticPackageDir '.htaccess') $htaccess

$staticReadme = @"
# HIKLASS Static Package

Upload the contents of this folder to the document root of any static/Apache-compatible host.

This package includes .htaccess with an index.html at the upload root, which avoids directory-listing errors on Apache-based hosts.

Important: this static package does not run the Node.js backend. Registration, admin APIs, saved orders, uploads, and email delivery require the Node app package.
"@
Write-Utf8File (Join-Path $staticPackageDir 'README_STATIC_UPLOAD.md') $staticReadme

Compress-Archive -Path (Join-Path $staticPackageDir '*') -DestinationPath $staticZipPath -Force

Write-Host "Created Node app deployment folder:"
Write-Host $packageDir
Write-Host "Created Node app zip:"
Write-Host $zipPath
Write-Host "Created static folder:"
Write-Host $staticPackageDir
Write-Host "Created static zip:"
Write-Host $staticZipPath
