import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const source = path.join(root, 'client', 'dist');
const target = path.join(root, 'dist');
const indexFile = path.join(source, 'index.html');
const htaccessSource = path.join(root, 'client', 'public', '.htaccess');
const htaccessFile = path.join(source, '.htaccess');

if (!fs.existsSync(indexFile)) {
  throw new Error('client/dist/index.html was not found. Run the client build first.');
}

if (!fs.existsSync(htaccessFile)) {
  if (!fs.existsSync(htaccessSource)) {
    throw new Error('client/public/.htaccess was not found. Hostinger static deployments need the SPA fallback file.');
  }

  fs.copyFileSync(htaccessSource, htaccessFile);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

console.log(`Synced static build to ${path.relative(root, target)}`);
