
const fs = require('fs'), path = require('path');

function walk(dir, cb){
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

const roots = ['stake-site','mine-site'].filter(fs.existsSync);
let restored = 0;

for (const root of roots) {
  walk(root, (p) => {
    const m = p.match(/^(.*)\.bakBefore[A-Za-z0-9_-]+$/);
    if (!m) return;
    const target = m[1];
    if (fs.existsSync(target)) {
      fs.copyFileSync(p, target);
      restored++;
      console.log('↩︎ restored', target, 'from', path.basename(p));
    }
  });
}

console.log('Done. Restored files:', restored);

