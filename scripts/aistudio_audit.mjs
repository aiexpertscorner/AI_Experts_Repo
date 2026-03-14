import fs from 'fs';
import path from 'path';

const audit = {
  project: 'Astro Project Audit',
  timestamp: new Date().toISOString(),
  structure: {},
  components: [],
  styles: {
    tailwindConfig: null,
    globalCss: null
  },
  dependencies: {}
};

function scanDir(dir, baseDir = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.join(baseDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        scanDir(fullPath, relPath);
      }
    } else {
      const ext = path.extname(file);
      if (['.astro', '.tsx', '.jsx', '.ts', '.js', '.css'].includes(ext)) {
        if (file === 'tailwind.config.mjs' || file === 'tailwind.config.js') {
          audit.styles.tailwindConfig = fs.readFileSync(fullPath, 'utf8');
        }
        if (file === 'globals.css' || file === 'index.css') {
          audit.styles.globalCss = fs.readFileSync(fullPath, 'utf8');
        }
        if (['.astro', '.tsx', '.jsx'].includes(ext)) {
          audit.components.push({
            name: file,
            path: relPath,
            content: fs.readFileSync(fullPath, 'utf8').substring(0, 1000)
          });
        }
      }
      if (file === 'package.json') {
        const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        audit.dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
      }
    }
  }
}

try {
  console.log('🚀 Starting Astro Project Audit...');
  scanDir(process.cwd());
  fs.writeFileSync('astro-audit.json', JSON.stringify(audit, null, 2));
  console.log('✅ Audit complete! Created astro-audit.json');
} catch (err) {
  console.error('❌ Audit failed:', err.message);
}