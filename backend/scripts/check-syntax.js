const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src');

function collectJavaScriptFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectJavaScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

for (const file of collectJavaScriptFiles(srcDir)) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log('Checked backend JavaScript syntax.');
