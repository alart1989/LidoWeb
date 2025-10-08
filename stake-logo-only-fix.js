
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve('./stake-site');
const MAIN_BASE = 'http://localhost:8000';
const MARK = 'STAKE LOGO ONLY FIX ACTIVE';


const LOGO_SEL = [
  'a:has([data-testid="lidoLogo"])',
  '.styles__LogoLidoStyle-sc-1gnkrmu-0 a',
  'a[aria-label="Main page"]',
  'a[aria-label*="logo" i]'
].join(', ');


function isStakeMenuAnchor($, a) {
  const $a = $(a);
  if ($a.is(LOGO_SEL)) return false;
  const txt = ($a.text() || '').trim().toLowerCase();
  if (txt !== 'stake') return false;
  
  const inHeader = $a.closest('header').length > 0;
  return inHeader;
}

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name === 'index.html') out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(src, { decodeEntities:false });

 
  $(LOGO_SEL).each((_, el) => {
    const $a = $(el);
    $a.attr('href', MAIN_BASE + '/');
    $a.removeAttr('data-mirror-disabled').removeAttr('aria-disabled').removeAttr('tabindex');
  });

 
  $('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    if (isStakeMenuAnchor($, el) && /^https?:\/\/localhost:8000\/?$/.test(href)) {
      $a.attr('href', '/');
      $a.removeAttr('data-mirror-disabled').removeAttr('aria-disabled').removeAttr('tabindex');
    }
  });

 
  if (!src.includes(MARK)) {
    const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  var MAIN_BASE='${MAIN_BASE}';
  var LOGO_SEL='${LOGO_SEL.replace(/'/g,"\\'")}';
  function isStakeMenuAnchor(a){
    if (!a) return false;
    try{
      if (a.matches(LOGO_SEL)) return false;
      var txt=(a.textContent||'').trim().toLowerCase();
      if (txt!=='stake') return false;
      return !!a.closest('header');
    }catch(_){return false;}
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.matches(LOGO_SEL)) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      location.href = MAIN_BASE + '/';
      return;
    }
    if (isStakeMenuAnchor(a)) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      location.href = '/';
      return;
    }
  }, true);
})();
</script>`;
    ($('body').length ? $('body') : $.root()).append(RUNTIME);
  }

  fs.writeFileSync(file + '.bakBeforeLogoOnlyFix', src, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ Patched:', path.relative(process.cwd(), file));
  changed++;
}

console.log('Готово. Обновлено файлов:', changed);
