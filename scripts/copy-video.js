const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const results = path.join(root, 'test-results');
const targetDir = path.join(root, 'recording');
const target = path.join(targetDir, 'automation-walkthrough.webm');

function walk(dir, found) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.name.endsWith('.webm')) found.push(full);
  }
}

const videos = [];
walk(results, videos);
if (videos.length === 0) {
  console.error('No webm file was found under test-results.');
  process.exit(1);
}
videos.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(videos[0], target);
console.log(`Saved ${target}`);
