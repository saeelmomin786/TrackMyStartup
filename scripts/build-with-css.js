#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Building project with ISP-compatible CSS...');

try {
  // Check if required files exist
  const requiredFiles = [
    'tailwind.config.js',
    'postcss.config.js',
    'index.css'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Required file missing: ${file}`);
      process.exit(1);
    }
  }

  console.log('✅ All required files found');

  // Build the project
  console.log('📦 Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Check if CSS was generated
  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (fs.existsSync(assetsPath)) {
    const cssFiles = fs.readdirSync(assetsPath).filter(file => file.endsWith('.css'));
    if (cssFiles.length === 0) {
      console.warn('⚠️  No CSS files found in dist/assets folder');
    } else {
      console.log(`✅ Found ${cssFiles.length} CSS file(s) in dist/assets folder`);
      cssFiles.forEach(file => {
        const filePath = path.join(assetsPath, file);
        const stats = fs.statSync(filePath);
        console.log(`   📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    }
  } else {
    console.warn('⚠️  dist/assets folder not found');
  }

  console.log('🎉 Build completed successfully!');
  console.log('💡 Your project should now work on all ISPs including BSNL');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
