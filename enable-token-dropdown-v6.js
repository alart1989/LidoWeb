// enable-token-dropdown-v6.js — единый аккуратный дропдаун валют без "двойного" текста
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = 'MIRROR TOKEN DROPDOWN v6';

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  console.log('${MARK} ACTIVE');

  var OPTIONS = [
    {label:'Lido (stETH)',  short:'stETH'},
    {label:'Lido (wstETH)', short:'wstETH'}
  ];

  // Контрол: общий селектор для обоих экранов
  var CTRL = [
    'label.sc-bbSZdi.styles__SelectIconStyle-sc-1c25chm-0',
    'label.sc-bbSZdi:has(input[data-testid="drop-down"][readonly])',
    '[data-testid="drop-down"]'           // на некоторых снимках это контейнер
  ].join(',');

  function persistSet(v){ try{ localStorage.setItem('mirror.selectedToken', v); }catch(_){} }
  function persistGet(){ try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; } }

  function ensureRel(el){
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
  }

  // создаём ЕДИНСТВЕННЫЙ отображаемый текст
  function ensureDisplay(host){
    var disp = host.querySelector('.mirror-token-value');
    if (!disp){
      disp = document.createElement('span');
      disp.className = 'mirror-token-value';
      // вставим после блока с input, чтобы стрелочка справа осталась
      var field = host.querySelector('.sc-hknOHE') || host;
      field.parentElement.insertBefore(disp, field.nextSibling);
    }
    return disp;
  }

  function setDisplay(host, label){
    var short = /wst/i.test(label) ? 'wstETH' : 'stETH';
    var disp = ensureDisplay(host);
    disp.textContent = label;
    host.setAttribute('data-selected-token', short);
    document.documentElement.setAttribute('data-selected-token', short);
    document.querySelectorAll('[data-currency-label]').forEach(function(x){ x.textContent = short; });
  }

  function applySelection(host, input, opt){
    // Обновим невидимый input (для консистентности)
    if (input){
      try{ input.value = opt.label; input.setAttribute('value', opt.label); }catch(_){}
    }
    setDisplay(host, opt.label);
    // Подстраховка от перерисовок
    requestAnimationFrame(function(){
      if (input){ try{ input.value = opt.label; input.setAttribute('value', opt.label); }catch(_){} }
      setDisplay(host, opt.label);
    });
    persistSet(opt.short);
  }

  function buildMenu(host, input){
    var menu = host.querySelector('.mirror-token-menu');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.className = 'mirror-token-menu';
    menu.setAttribute('role','menu');
    OPTIONS.forEach(function(opt){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mirror-token-item';
      b.textContent = opt.label;
      b.setAttribute('data-token', opt.short);
      b.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        applySelection(host, input, opt);
        closeAllMenus();
      });
      menu.appendChild(b);
    });
    host.appendChild(menu);
    return menu;
  }

  function openMenu(host, input){
    closeAllMenus();
    var m = buildMenu(host, input);
    if (m) m.style.display = 'block';
  }
  function closeAllMenus(){
    document.querySelectorAll('.mirror-token-menu').forEach(function(m){ m.style.display='none'; });
  }

  // CSS: скрываем ТОЛЬКО текст инпута, добавляем наш дисплей
  var css = document.createElement('style');
  css.textContent = \`
  /* прячем текст у нативного поля, макет не ломаем */
  \${CTRL} input[readonly]{
    color: transparent !important;
    caret-color: transparent !important;
    text-shadow: none !important;
  }
  /* наш единственный видимый текст выбранной валюты */
  .mirror-token-value{
    position:absolute;
    left:12px; right:44px; top:50%; transform:translateY(-50%);
    pointer-events:none;
    font: inherit; color: inherit; line-height:1.2;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  /* выпадающее меню */
  .mirror-token-menu{
    position:absolute; z-index:2147483647;
    top:calc(100% + 8px); left:0; min-width:240px;
    background:#fff; color:#111; border:1px solid rgba(0,0,0,.12);
    border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.16);
    padding:6px; display:none;
  }
  .mirror-token-item{
    display:block; width:100%; text-align:left;
    padding:10px 12px; border:none; background:transparent;
    border-radius:8px; cursor:pointer; font:inherit; line-height:1.2;
  }
  .mirror-token-item:hover{ background:rgba(0,0,0,.05); }
  \`;
  document.head.appendChild(css);

  function initOne(host){
    if (!host || host.__mirrorTokenReady) return;
    host.__mirrorTokenReady = true;
    ensureRel(host);

    var input = host.querySelector('input[readonly]');
    ensureDisplay(host);

    // восстановим сохранённый выбор или возьмём стартовое значение
    var saved = persistGet();
    if (saved){
      var opt = OPTIONS.find(o=>o.short===saved) || OPTIONS[0];
      applySelection(host, input, opt);
    } else {
      var initial = (input && (input.value || input.getAttribute('value'))) || 'Lido (stETH)';
      setDisplay(host, initial);
    }

    // клик по контролу открывает меню (не мешаем кликам по самому меню)
    host.addEventListener('click', function(e){
      if (e.target.closest('.mirror-token-menu')) return;
      e.preventDefault(); e.stopPropagation();
      openMenu(host, input);
    });
  }

  // Инициализация на текущих
  document.querySelectorAll(CTRL).forEach(initOne);

  // Динамика
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if (m.type==='childList'){
        m.addedNodes.forEach(function(n){
          if (n.nodeType!==1) return;
          if (n.matches && n.matches(CTRL)) initOne(n);
          if (n.querySelectorAll) n.querySelectorAll(CTRL).forEach(initOne);
        });
      }
    });
  }).observe(document.documentElement, {subtree:true, childList:true});

  // Закрытие по клику вне и ESC
  document.addEventListener('click', function(e){
    if (!e.target.closest('.mirror-token-menu')) closeAllMenus();
  });
  document.addEventListener('keydown', function(e){
    if (e.key==='Escape') closeAllMenus();
  });
})();
</script>
`;

function inject(file){
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARK)) return false;
  const $ = cheerio.load(html, { decodeEntities:false });
  ($('body').length ? $('body') : $.root()).append(RUNTIME);
  fs.writeFileSync(file + '.bakBeforeTokenDropdownV6', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ injected:', path.relative(process.cwd(), file));
  return true;
}

let n=0; PAGES.forEach(f => { if (inject(f)) n++; });
console.log('Готово. Файлов обновлено:', n);

