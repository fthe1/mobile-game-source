// Regenerate the offline resource list whenever content is changed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../www');
const assets = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (!['sw.js', 'asset-manifest.json'].includes(entry.name)) assets.push(path.relative(root, full).split(path.sep).join('/'));
  }
}
walk(root); assets.sort();
const hash = crypto.createHash('sha256');
for (const file of assets) hash.update(file).update(fs.readFileSync(path.join(root, file)));
const version=hash.digest('hex').slice(0,16);
fs.writeFileSync(path.join(root, 'asset-manifest.json'), JSON.stringify({version,assets},null,2)+'\n');
const sw=path.join(root,'sw.js');
fs.writeFileSync(sw,fs.readFileSync(sw,'utf8').replace(/const BUILD = '[^']+';/, `const BUILD = '${version}';`));
console.log(`Prepared ${assets.length} offline resources`);
