
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/index.html',
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const KEEP_MARKERS = [
  'LOCAL HARD GUARD',                
  'MIRROR TOKEN DROPDOWN',           
  'MIRROR FAST SELECT CSS',          
  'STAKE FAQ CLOSE STATIC',          
  'DISABLE THEME TOGGLE',            
];

function shouldKeepScript(txt='', attrs={}) {
  const t = String(txt || '');
  if (KEEP_MARKERS.some(m => t.includes(m))) return true;
 
  return false;
}

function dietOne(file) {
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities:false });

  let removedScripts = 0, removedLinks = 0, removedPortals = 0, removedLottie = 0, lazyImgs = 0;

  
  $('script').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const txt = $el.html() || '';

   
    const isNext = src.includes('/_next/') || txt.includes('__NEXT_DATA__') || $el.attr('id') === '__NEXT_DATA__';
    const isKeep = shouldKeepScript(txt, el.attribs);
    if (isNext || (!isKeep && (src || txt.trim()))) {
      $el.remove();
      removedScripts++;
    }
  });

  
  $('link[rel="preload"][as="script"], link[rel="modulepreload"], link[as="script"]').each((_, el) => {
    $(el).remove(); removedLinks++;
  });

 
  $('div[data-radix-portal]').each((_, el) => { $(el).remove(); removedPortals++; });

  
  $('lottie-player, [data-lottie], video').each((_, el) => { $(el).remove(); removedLottie++; });

  
  $('img').each((_, el) => {
    const $el = $(el);
    if (!$el.attr('loading')) { $el.attr('loading','lazy'); lazyImgs++; }
    $el.attr('decoding','async');
  });

  
  const mark = '<!-- MIRROR DIET v1: next.js scripts/portals stripped -->';
  if ($('head').length) $('head').append(mark); else $.root().append(mark);

  const out = $.html();
  if (out !== html) {
    fs.writeFileSync(file + '.bakBeforeDiet', html, 'utf8');
    fs.writeFileSync(file, out, 'utf8');
    console.log(`✓ diet: ${path.relative(process.cwd(), file)}  - scripts:${removedScripts}, links:${removedLinks}, portals:${removedPortals}, lottie/video:${removedLottie}, lazyImgs:+${lazyImgs}`);
    return true;
  }
  return false;
}

let changed = 0;
PAGES.forEach(f => { if (dietOne(f)) changed++; });
console.log('Готово. Диетировано файлов:', changed);
