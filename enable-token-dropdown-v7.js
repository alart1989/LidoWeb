// enable-token-dropdown-v7.js — чистый выбор валюты (toggle по кнопке, без оверлеев)
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = 'MIRROR TOKEN DROPDOWN v7';

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  console.log('${MARK} ACTIVE');

  // Очистка: удалим всё, что могли добавить старыми версиями
  document.querySelectorAll('.mirror-token-overlay,.mirror-token-value,.mirror-token-menu').forEach(n=>n.remove());
  Array.from(document.querySelectorAll('style')).forEach(st=>{
    try{ if(/MIRROR TOKEN DROPDOWN|mirror-token-(overlay|menu|value)/i.test(st.textContent||'')) st.remove(); }catch(_){}
  });

  var OPTIONS = [
    {label:'Lido (stETH)',  short:'stETH'},
    {label:'Lido (wstETH)', short:'wstETH'}
  ];

  // Контейнер селекта валюты (кнопка/иконка + input[data-testid="drop-down"])
  var CTRL_SEL = [
    'label.sc-bbSZdi.styles__SelectIconStyle-sc-1c25chm-0',
    'label:has(input[data-testid="drop-down"][readonly])',
    '[data-testid="drop-down"]' // если это контейнер
  ].join(',');

  function persistSet(v){ try{ localStorage.setItem('mirror.selectedToken', v); }catch(_){} }
  function persistGet(){ try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; } }

  function ensureRel(el){
    if (!el) return;
    var cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
  }

  function buildMenu(host){
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
        e.preventDefault();
        e.stopPropagation();
        applySelection(host, opt);
        closeAllMenus();
      });
      menu.appendChild(b);
    });

    host.appendChild(menu);
    return menu;
  }

  function toggleMenu(host){
    var m = buildMenu(host);
    if (!m) return;
    var openNow = m.style.display === 'block';
    closeAllMenus();
    m.style.display = openNow ? 'none' : 'block';
  }

  function closeAllMenus(){
    document.querySelectorAll('.mirror-token-menu').forEach(function(m){ m.style.display='none'; });
  }

  // Применение выбора
  function applySelection(host, opt){
    // 1) инпут-отображение валюты (readonly drop-down)
    var input = host.querySelector('input[data-testid="drop-down"][readonly], input[name="token"][readonly]') || host.querySelector('input[readonly]');
    if (input){
      try{
        input.value = opt.label;
        input.setAttribute('value', opt.label);
      }catch(_){}
    }

    // 2) короткие подписи на странице
    document.querySelectorAll('[data-currency-label]').forEach(function(x){ x.textContent = opt.short; });

    // 3) подпись у поля ввода суммы рядом (stETH amount / wstETH amount)
    // берём ближайший общий контейнер (в твоём HTML это <span class="sc-gFAWRd ...">)
    var scope = host.closest('.sc-gFAWRd') || document;
    Array.from(scope.querySelectorAll('.sc-esYiGF, .styles__InputStyle-sc-zr8x53-0 span, label span'))
      .forEach(function(el){
        var t = (el.textContent||'').trim();
        if (/^(stETH|wstETH) amount$/i.test(t)){
          el.textContent = opt.short + ' amount';
        }
      });

    // 4) на всякий случай — атрибут на html (если захочешь стилизовать)
    document.documentElement.setAttribute('data-selected-token', opt.short);

    // 5) сохранить
    persistSet(opt.short);
  }

  // UI-стили меню (минимум)
  var css = document.createElement('style');
  css.textContent = \`
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
    if (!host || host.__mirrorTokenV7) return;
    host.__mirrorTokenV7 = true;
    ensureRel(host);

    // По умолчанию — восстановить сохранённый выбор (если есть)
    var saved = persistGet();
    if (saved){
      var opt = OPTIONS.find(o=>o.short===saved);
      if (opt) applySelection(host, opt);
    }

    // Клик по КНОПКЕ селекта (контейнеру) — toggle меню
    host.addEventListener('click', function(e){
      if (e.target.closest('.mirror-token-menu')) return; // пункты меню сами обработаются
      e.preventDefault();
      e.stopPropagation();
      toggleMenu(host);
    });
  }

  // Навесим на все текущие контролы
  document.querySelectorAll(CTRL_SEL).forEach(initOne);

  // Динамически добавленные элементы
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

  // Закрытие по клику вне / ESC
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
  fs.writeFileSync(file + '.bakBeforeTokenDropdownV7', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ injected:', path.relative(process.cwd(), file));
  return true;
}

let n=0; PAGES.forEach(f => { if (inject(f)) n++; });
console.log('Готово. Файлов обновлено:', n);

