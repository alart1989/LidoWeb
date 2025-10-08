
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve('./stake-site');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name === 'index.html') out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let touched = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const $base = $('base[href]');
  if ($base.length) {
    $base.attr('href', '/');                
    fs.writeFileSync(file + '.bakBeforeBase', html, 'utf8');
    fs.writeFileSync(file, $.html(), 'utf8');
    console.log('✓ base → / :', path.relative(process.cwd(), file));
    touched++;
  }
}
console.log('Готово. Изменено файлов:', touched);
