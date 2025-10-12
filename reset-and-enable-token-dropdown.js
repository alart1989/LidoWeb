// reset-and-enable-token-dropdown.js — чистим старые инъекции и ставим минимальный дропдаун (без RegExp)
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = 'MIRROR TOKEN CLEAN v1';

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  var OPTIONS = [
    {label:'Lido (stETH)',  short:'stETH'},
    {label:'Lido (wstETH)', short:'wstETH'}
  ];

  var CTRL_SEL = [
    'label.sc-bbSZdi.styles__SelectIconStyle-sc-1c25chm-0',
    'label:has(input[data-testid="drop-down"][readonly])',
    '[data-testid="drop-down"]'
  ].join(',');

  function persistSet(v){ try{ localStorage.setItem('mirror.selectedToken', v); }catch(_){} }
  function persistGet(){ try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; } }

  function ensureRel(el){
    if (!el) return;
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
  }

  function buildMenu(host, apply){
    var menu = host.querySelector('.mirror-minimal-token-menu');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.className = 'mirror-minimal-token-menu';
    menu.setAttribute('role','menu');
    OPTIONS.forEach(function(opt){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mirror-minimal-token-item';
      b.textContent = opt.label;
      b.setAttribute('data-token', opt.short);
      b.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        apply(opt);
        closeAllMenus();
      });
      menu.appendChild(b);
    });
    host.appendChild(menu);
    return menu;
  }

  function toggleMenu(host, apply){
    var m = buildMenu(host, apply);
    if (!m) return;
    var open = m.style.display === 'block';
    closeAllMenus();
    m.style.display = open ? 'none' : 'block';
  }

  function closeAllMenus(){
    document.querySelectorAll('.mirror-minimal-token-menu').forEach(function(m){ m.style.display='none'; });
  }

  function applySelection(host, opt){
    var input = host.querySelector('input[data-testid="drop-down"][readonly], input[name="token"][readonly]') || host.querySelector('input[readonly]');
    if (input){ try{ input.value = opt.label; input.setAttribute('value', opt.label); }catch(_){ } }

    document.querySelectorAll('[data-currency-label]').forEach(function(x){ x.textContent = opt.short; });

    var scope = host.closest('.sc-gFAWRd') || document;
    Array.from(scope.querySelectorAll('.sc-esYiGF, .styles__InputStyle-sc-zr8x53-0 span, label span')).forEach(function(el){
      var t = (el.textContent||'').trim();
      if (/^(stETH|wstETH) amount$/i.test(t)) el.textContent = opt.short + ' amount';
    });

    document.documentElement.setAttribute('data-selected-token', opt.short);
    persistSet(opt.short);
  }

  var css = document.createElement('style');
  css.textContent = \`
    .mirror-minimal-token-menu{
      position:absolute; z-index:999999;
      top:calc(100% + 8px); left:0; min-width:240px;
      background:#fff; color:#111; border:1px solid rgba(0,0,0,.12);
      border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.16);
      padding:6px; display:none;
    }
    .mirror-minimal-token-item{
      display:block; width:100%; text-align:left;
      padding:10px 12px; border:none; background:transparent;
      border-radius:8px; cursor:pointer; font:inherit; line-height:1.2;
    }
    .mirror-minimal-token-item:hover{ background:rgba(0,0,0,.05); }
  \`;
  document.head.appendChild(css);

  function initOne(host){
    if (!host || host.__mirrorTokenClean) return;
    host.__mirrorTokenClean = true;
    ensureRel(host);

    var saved = persistGet();
    if (saved){
      var opt = OPTIONS.find(o=>o.short===saved);
      if (opt) applySelection(host, opt);
    }

    host.addEventListener('click', function(e){
      if (e.target.closest('.mirror-minimal-token-menu')) return;
      e.preventDefault(); e.stopPropagation();
      toggleMenu(host, function(opt){ applySelection(host, opt); });
    });
  }

  document.querySelectorAll(CTRL_SEL).forEach(initOne);

  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if (m.type==='childList'){
        m.addedNodes.forEach(function(n){
          if (n.nodeType!==1) return;
          if (n.matches && n.matches(CTRL_SEL)) initOne(n);
          if (n.querySelectorAll) n.querySelectorAll(CTRL_SEL).forEach(initOne);
        });
      }
    });
  }).observe(document.documentElement, {subtree:true, childList:true});

  document.addEventListener('click', function(e){
    if (!e.target.closest('.mirror-minimal-token-menu')) closeAllMenus();
  });
  document.addEventListener('keydown', function(e){
    if (e.key==='Escape') closeAllMenus();
  });
})();
</script>
`;

function cleanDom($){
  // Удаляем наши старые элементы
  $('.mirror-token-overlay, .mirror-token-value, .mirror-token-menu, .mirror-minimal-token-menu').remove();
  // Удаляем <script>/<style> с нашими маркерами
  $('script,style').each((_, el)=>{
    const txt = $(el).html() || '';
    if (/MIRROR TOKEN DROPDOWN|MIRROR TOKEN CLEAN|mirror-token-(overlay|value|menu)/i.test(txt)) {
      $(el).remove();
    }
  });
}

function processFile(file){
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities:false });

  if ($.root().html().includes(MARK)) return false;

  // чистка
  cleanDom($);

  // инъекция рантайма
  const body = $('body');
  if (body.length) body.append(RUNTIME); else $.root().append(RUNTIME);

  fs.writeFileSync(file + '.bakBeforeTokenCleanDOM', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ cleaned+injected:', path.relative(process.cwd(), file));
  return true;
}

let n = 0;
PAGES.forEach(f => { if (processFile(f)) n++; });
console.log('Готово. Файлов обновлено:', n);
