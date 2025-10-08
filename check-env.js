// Check .env.local file
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking .env.local file...');

try {
  const envPath = path.join(__dirname, '.env.local');
  console.log('📁 File path:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('✅ .env.local file exists');
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('📄 File content:');
    console.log(content);
  } else {
    console.log('❌ .env.local file does not exist');
  }
} catch (error) {
  console.error('❌ Error reading .env.local:', error.message);
}












