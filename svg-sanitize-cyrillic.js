
const fs = require('fs');
const path = require('path');

const ROOTS = ['mine-site', 'stake-site'];

const map = new Map(Object.entries({
  'м':'m','М':'M',
  'з':'z','З':'Z',
  'л':'l','Л':'L',
  'н':'h','Н':'H',
  'в':'v','В':'V',
  'с':'c','С':'C',
  'а':'a','А':'A',
  'т':'t','Т':'T',
  'р':'p','Р':'P', 
  'о':'o','О':'O' 
}));

function fixD(d){
  return d.replace(/./g, ch => map.get(ch) || ch);
}

function processFile(file){
  const src = fs.readFileSync(file, 'utf8');
  let out = src;
 
  out = out.replace(/d="([^"]*)"/g, (_, val) => `d="${fixD(val)}"`);
  out = out.replace(/d='([^']*)'/g, (_, val) => `d='${fixD(val)}'`);
  if (out !== src) {
    fs.writeFileSync(file + '.bakBeforeSvgSan', src, 'utf8');
    fs.writeFileSync(file, out, 'utf8');
    console.log('✓ fixed', file);
    return 1;
  }
  return 0;
}

function walk(dir){
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && /\.html?$/.test(e.name)) processFile(p);
  }
}

ROOTS.forEach(r => { if (fs.existsSync(r)) walk(r); });
console.log('Done.');
