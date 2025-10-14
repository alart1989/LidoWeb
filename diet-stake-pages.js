// diet-stake-pages.js — вырезаем тяжелый next.js рантайм и мусор
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
  'LOCAL HARD GUARD',                // твой гардер
  'MIRROR TOKEN DROPDOWN',           // наше меню валют
  'MIRROR FAST SELECT CSS',          // быстрый CSS
  'STAKE FAQ CLOSE STATIC',          // фикс FAQ, если есть
  'DISABLE THEME TOGGLE',            // выключалка темы (если ставила)
];

function shouldKeepScript(txt='', attrs={}) {
  const t = String(txt || '');
  if (KEEP_MARKERS.some(m => t.includes(m))) return true;
  // всё остальное — наружу
  return false;
}

function dietOne(file) {
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities:false });

  let removedScripts = 0, removedLinks = 0, removedPortals = 0, removedLottie = 0, lazyImgs = 0;

  // 1) Удаляем все <script>, кроме наших помеченных
  $('script').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const txt = $el.html() || '';

    // next.js и любые внешние — удалить
    const isNext = src.includes('/_next/') || txt.includes('__NEXT_DATA__') || $el.attr('id') === '__NEXT_DATA__';
    const isKeep = shouldKeepScript(txt, el.attribs);
    if (isNext || (!isKeep && (src || txt.trim()))) {
      $el.remove();
      removedScripts++;
    }
  });

  // 2) Удаляем прелоады скриптов/модулей
  $('link[rel="preload"][as="script"], link[rel="modulepreload"], link[as="script"]').each((_, el) => {
    $(el).remove(); removedLinks++;
  });

  // 3) Сносим Radix-порталы (их «вторые» меню/оверлеи)
  $('div[data-radix-portal]').each((_, el) => { $(el).remove(); removedPortals++; });

  // 4) Убираем lottie/видео (самые прожорливые анимации)
  $('lottie-player, [data-lottie], video').each((_, el) => { $(el).remove(); removedLottie++; });

  // 5) Всем картинкам — ленивую загрузку (чтоб не раздувать память сразу)
  $('img').each((_, el) => {
    const $el = $(el);
    if (!$el.attr('loading')) { $el.attr('loading','lazy'); lazyImgs++; }
    $el.attr('decoding','async');
  });

  // 6) Ставим метку что «страница диетированы»
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
