import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const source = path.join(root, 'client', 'dist');
const target = path.join(root, 'dist');
const indexFile = path.join(source, 'index.html');

if (!fs.existsSync(indexFile)) {
  throw new Error('client/dist/index.html was not found. Run the client build first.');
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

console.log(`Synced static build to ${path.relative(root, target)}`);
