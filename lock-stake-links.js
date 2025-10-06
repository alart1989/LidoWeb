
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');


const ROOT = path.resolve('./stake-site');          
const MAIN_BASE = 'http://localhost:8000/';        


const ALLOWED = new Set([
  '/',
  '/wrap/', '/unwrap/',
  '/wrap/wrap/', '/wrap/unwrap/',       
  '/rewards/',
  '/withdrawals/request/', '/withdrawals/claim/'
]);


const STAKE_ORIGINS = new Set(['https://stake.lido.fi','http://stake.lido.fi']);
const MAIN_ORIGINS  = new Set(['https://lido.fi','https://www.lido.fi','http://lido.fi','http://www.lido.fi']);


function folderize(p) {
  if (!p || p === '#') return '/';
  return (p !== '/' && !p.endsWith('/')) ? (p + '/') : p;
}


function normalizeStakePath(p, fileAbsPath) {
  let out = folderize(p);

  
  if (out === '/withdrawals/') out = '/withdrawals/request/';


  if (fileAbsPath.includes(path.sep + 'wrap' + path.sep)) {
    if (out === '/wrap/')   out = '/wrap/wrap/';
    if (out === '/unwrap/') out = '/wrap/unwrap/';
  }

  return out;
}


function classify(href) {
  if (!href) return { kind: 'empty' };
  const raw = href.trim();


  if (/^(mailto:|tel:|javascript:|#)/i.test(raw)) return { kind: 'other' };

 
  if (raw.startsWith('/')) return { kind: 'stake-path', path: folderize(raw) };


  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    
    const rel = '/' + raw.replace(/^\.\//, '').replace(/^\/+/, '');
    return { kind: 'stake-path', path: folderize(rel) };
  }


  try {
    const u = new URL(raw);
    if (STAKE_ORIGINS.has(u.origin)) return { kind: 'stake-path', path: folderize(u.pathname) };
    if (MAIN_ORIGINS.has(u.origin))  return { kind: 'main' };
    return { kind: 'external' };
  } catch {
    return { kind: 'other' };
  }
}


function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name === 'index.html') out.push(p);
  }
  return out;
}

if (!fs.existsSync(ROOT)) {
  console.error('❌ Не найдена папка', ROOT);
  process.exit(1);
}

const files = walk(ROOT);
let totalChangedFiles = 0;
let totalRewrittenAnchors = 0;

for (const file of files) {
  const orig = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(orig, { decodeEntities: false });

  let touchedInThisFile = 0;

  $('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const info = classify(href);

    if (info.kind === 'stake-path') {
     
      const p = normalizeStakePath(info.path, path.resolve(file));

      if (ALLOWED.has(p)) {
       
        $a.attr('href', p);
      } else {
       
        $a.attr('href', '#')
          .attr('aria-disabled', 'true')
          .attr('tabindex', '-1')
          .attr('data-mirror-disabled', '1');
      }
      touchedInThisFile++;
      return;
    }

    if (info.kind === 'main') {
   
      $a.attr('href', MAIN_BASE);
      touchedInThisFile++;
      return;
    }

    if (info.kind === 'external') {
     
      $a.attr('href', '#')
        .attr('aria-disabled', 'true')
        .attr('tabindex', '-1')
        .attr('data-mirror-disabled', '1');
      touchedInThisFile++;
      return;
    }

   
  });

  if (touchedInThisFile > 0) {
  
    fs.writeFileSync(file + '.bak', orig, 'utf8');
    fs.writeFileSync(file, $.html(), 'utf8');
    totalChangedFiles++;
    totalRewrittenAnchors += touchedInThisFile;
    console.log('✓ Обновлён:', path.relative(process.cwd(), file), `(${touchedInThisFile} ссылок)`);
  }
}

console.log(`Готово. Файлов обновлено: ${totalChangedFiles}. Переписано ссылок всего: ${totalRewrittenAnchors}.`);
