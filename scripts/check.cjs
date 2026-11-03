const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'www');
let count = 0;
for (const name of fs.readdirSync(web)) {
  if (name.endsWith('.js')) {new vm.Script(fs.readFileSync(path.join(web,name),'utf8'),{filename:name}); count++;}
  if (name.endsWith('.json') || name.endsWith('.webmanifest')) JSON.parse(fs.readFileSync(path.join(web,name),'utf8'));
}
const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!/^(https?:|data:)/.test(match[1]) && !fs.existsSync(path.join(web,match[1]))) throw new Error('Missing entry resource: '+match[1]);
}
const js=fs.readFileSync(path.join(web,'app.min.js'),'utf8');
const media=new Set([...js.matchAll(/["'](audio\/[^"']+\.mp3)["']/g)].map(m=>m[1]));
for(const file of media) if(!fs.existsSync(path.join(web,file))) throw new Error('Missing audio: '+file);
console.log(`PASS: ${count} JavaScript files parse; JSON, entry resources and ${media.size} referenced audio files exist.`);
