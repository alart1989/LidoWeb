
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('./stake-site');

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name === 'index.html') out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let restored = 0;

for (const f of files) {
  const candidates = [`${f}.bakBeforeThemeLogoV2`, `${f}.bakBeforeThemeLogo`];
  const bak = candidates.find(p => fs.existsSync(p));
  if (bak) {
    const now = fs.readFileSync(f, 'utf8');
    const prev = fs.readFileSync(bak, 'utf8');
    if (now !== prev) {
      fs.writeFileSync(f + '.bak_after_badpatch', now, 'utf8'); // на всякий
      fs.writeFileSync(f, prev, 'utf8');
      console.log('↩︎ restored:', path.relative(process.cwd(), f), 'from', path.basename(bak));
      restored++;
    }
  }
}
console.log('Готово. Восстановлено файлов:', restored);

