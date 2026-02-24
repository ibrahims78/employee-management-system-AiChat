import fs from 'fs';
import path from 'path';

const sourceDir = '.';
const targetDir = 'extracted_app/Employee-Master';
const exclude = ['.git', 'node_modules', 'extracted_app', 'attached_assets', '.cache', '.npm', '.config'];

function syncDir(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      syncDir(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        console.warn(`Failed to copy ${srcPath}: ${err.message}`);
      }
    }
  }
}

try {
  syncDir(sourceDir, targetDir);
  console.log('Sync completed successfully');
} catch (err) {
  console.error('Sync failed:', err);
}
