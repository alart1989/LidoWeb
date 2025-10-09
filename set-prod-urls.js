
const fs = require('fs'), path = require('path');

const MAIN = 'https://lido-web-main.vercel.app';   
const STAKE = 'https://lido-web-stake.vercel.app';

const FILES = [];
function walk(dir){
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && e.name === 'index.html') FILES.push(p);
  }
}
walk('mine-site');
walk('stake-site');

let changed = 0;
for (const f of FILES) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = s
    .replace(/http:\/\/localhost:8000\/?/g, MAIN + '/')
    .replace(/http:\/\/localhost:8001\/?/g, STAKE + '/');
  if (s !== before) {
    fs.writeFileSync(f + '.bakBeforeProdUrls', before, 'utf8');
    fs.writeFileSync(f, s, 'utf8');
    console.log('✓ urls:', f);
    changed++;
  }
}
console.log('Готово. Файлов изменено:', changed);
