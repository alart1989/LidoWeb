// token-icons-v2.js — подгонка подписи и иконки под оригинал (поверх рабочего дропдауна)
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = 'MIRROR TOKEN ICONS v2';

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  // SVG
  var ICON_LIDO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.078 11.148l-.135.206a5.788 5.788 0 00.814 7.32 6.043 6.043 0 004.24 1.72l-4.92-9.246z" fill="#00A3FF"></path><path opacity="0.6" d="M11.997 13.958l-4.92-2.81 4.92 9.246v-6.436zm4.925-2.81l.134.206a5.788 5.788 0 01-.813 7.32 6.043 6.043 0 01-4.24 1.72l4.92-9.246z" fill="#00A3FF"></path><path opacity="0.2" d="M12.002 13.958l4.92-2.81-4.92 9.246v-6.436zm.001-6.278v4.847l4.238-2.422-4.238-2.425z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.68l-4.24 2.425 4.24 2.422V7.68z" fill="#00A3FF"></path><path d="M12.003 3.604l-4.24 6.502 4.24-2.431V3.604z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.674l4.241 2.432-4.24-6.506в4.074z" fill="#00A3FF"></path></svg>';
  var ICON_ETH  = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path opacity="0.6" d="M11.999 3.75v6.098l5.248 2.303-5.248-8.401z"></path><path d="M11.999 3.75L6.75 12.151l5.249-2.303V3.75z"></path><path opacity="0.6" d="M11.999 16.103v4.143l5.251-7.135L12 16.103z"></path><path d="M11.999 20.246v-4.144L6.75 13.111l5.249 7.135z"></path><path opacity="0.2" d="M11.999 15.144l5.248-2.993-5.248-2.301v5.294z"></path><path opacity="0.6" d="M6.75 12.151l5.249 2.993V9.85l-5.249 2.3z"></path></svg>';

  function getSaved(){
    try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; }
  }
  function shortFromLabel(lbl){
    if (/wstETH/i.test(lbl)) return 'wstETH';
    if (/stETH/i.test(lbl))  return 'stETH';
    if (/Ethereum \\(ETH\\)/i.test(lbl)) return 'ETH';
    return null;
  }
  function normalizedLabel(short){
    if (short === 'wstETH') return 'Lido (wstETH)';
    if (short === 'stETH')  return 'Lido (stETH)';
    if (short === 'ETH')    return 'Ethereum (ETH)';
    return 'Lido (stETH)';
  }

  function findControls(){
    return document.querySelectorAll(
      'label.sc-bbSZdi.styles__SelectIconStyle-sc-1c25chm-0, '+
      'label:has(input[data-testid="drop-down"][readonly]), '+
      '[data-testid="drop-down"]'
    );
  }
  function findInput(ctrl){
    return ctrl.querySelector('input[data-testid="drop-down"][readonly], input[name="token"][readonly]') || ctrl.querySelector('input[readonly]');
  }
  function findIconHost(ctrl){
    return ctrl.querySelector('.sc-eyvILC') || ctrl.querySelector('svg')?.parentElement || null;
  }

  function applyToControl(ctrl, short){
    var label = normalizedLabel(short);
    var inp = findInput(ctrl);
    if (inp){ try{ inp.value = label; inp.setAttribute('value', label); }catch(_){ } }
    // иконка
    var host = findIconHost(ctrl);
    if (host){ host.innerHTML = (short === 'ETH') ? ICON_ETH : ICON_LIDO; }
    // короткие подписи
    document.querySelectorAll('[data-currency-label]').forEach(function(x){ x.textContent = short; });
    // “... amount” рядом
    var scope = ctrl.closest('.sc-gFAWRd') || document;
    Array.from(scope.querySelectorAll('.sc-esYiGF, .styles__InputStyle-sc-zr8x53-0 span, label span')).forEach(function(el){
      var t=(el.textContent||'').trim();
      if (/^(stETH|wstETH|ETH) amount$/i.test(t)) el.textContent = short+' amount';
    });
    // для css если нужно
    document.documentElement.setAttribute('data-selected-token', short);
  }

  function refreshAll(){
    var saved = getSaved(); // предпочтительно берём сохранённый выбор
    findControls().forEach(function(ctrl){
      var inp = findInput(ctrl);
      var currentShort = saved || shortFromLabel(inp ? (inp.value || inp.getAttribute('value') || '') : '');
      applyToControl(ctrl, currentShort || 'stETH');
    });
  }

  // при загрузке
  refreshAll();
  // после любого клика (в т.ч. выбора в нашем меню)
  document.addEventListener('click', function(){ setTimeout(refreshAll, 0); });
  // и на динамические изменения
  new MutationObserver(function(){ setTimeout(refreshAll, 0); })
    .observe(document.documentElement, {subtree:true, childList:true});
})();
</script>
`;

function inject(file){
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARK)) return false;
  const $ = cheerio.load(html, { decodeEntities:false });
  ($('body').length ? $('body') : $.root()).append(RUNTIME);
  fs.writeFileSync(file + '.bakBeforeTokenIconsV2', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ icons fixed:', path.relative(process.cwd(), file));
  return true;
}

let n=0; PAGES.forEach(f => { if (inject(f)) n++; });
console.log('Готово. Файлов обновлено:', n);

