import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy index.html to 404.html in the dist folder
const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const notFoundPath = path.join(distPath, '404.html');

try {
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, notFoundPath);
    console.log('✅ Successfully copied index.html to 404.html');
  } else {
    console.error('❌ index.html not found in dist folder');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error copying file:', error.message);
  process.exit(1);
}
