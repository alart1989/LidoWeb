// token-dropdown-icons-v4.js — дропдаун с иконками + синхронизация value/иконки/amount
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = 'MIRROR TOKEN DROPDOWN ICONS v4';

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  console.log('${MARK} ACTIVE');

  // SVG-иконки
  var ICON_LIDO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.078 11.148l-.135.206a5.788 5.788 0 00.814 7.32 6.043 6.043 0 004.24 1.72l-4.92-9.246z" fill="#00A3FF"></path><path opacity="0.6" d="M11.997 13.958l-4.92-2.81 4.92 9.246v-6.436zm4.925-2.81l.134.206a5.788 5.788 0 01-.813 7.32 6.043 6.043 0 01-4.24 1.72l-4.92-9.246z" fill="#00A3FF"></path><path opacity="0.2" d="M12.002 13.958l4.92-2.81-4.92 9.246v-6.436zm.001-6.278v4.847l4.238-2.422-4.238-2.425z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.68l-4.24 2.425 4.24 2.422V7.68z" fill="#00A3FF"></path><path d="M12.003 3.604l-4.24 6.502 4.24-2.431V3.604z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.674l4.241 2.432-4.24-6.506v4.074z" fill="#00A3FF"></path></svg>';
  var ICON_ETH  = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path opacity="0.6" d="M11.999 3.75v6.098l5.248 2.303-5.248-8.401z"></path><path d="M11.999 3.75L6.75 12.151l5.249-2.303V3.75z"></path><path opacity="0.6" d="M11.999 16.103v4.143l5.251-7.135L12 16.103z"></path><path d="M11.999 20.246v-4.144L6.75 13.111l5.249 7.135z"></path><path opacity="0.2" d="M11.999 15.144l5.248-2.993-5.248-2.301v5.294z"></path><path opacity="0.6" d="M6.75 12.151l5.249 2.993V9.85л-5.249 2.3z"></path></svg>';

  // Опции меню — как на твоём скрине
  var OPTIONS = [
    { short: 'stETH',  label: 'Lido (stETH)',  icon: ICON_LIDO },
    { short: 'ETH',    label: 'Ethereum (ETH)', icon: ICON_ETH  }
  ];

  // Контролы: контейнер, инпут и место для иконки
  function findAllControls(){
    // input — источник правды
    var inputs = document.querySelectorAll('input[data-testid="drop-down"][readonly], input[name="token"][readonly]');
    return Array.from(inputs).map(function(inp){
      var root = inp.closest('.sc-fBWQRz') || inp.parentElement;
      var iconHost = root ? (root.querySelector('.sc-eyvILC') || null) : null;
      var selectRoot = root ? (root.closest('label') || root) : null; // куда вешать клик
      return { inp: inp, root: root, iconHost: iconHost, selectRoot: selectRoot };
    }).filter(x => x.inp && x.selectRoot);
  }

  function persistSet(v){ try{ localStorage.setItem('mirror.selectedToken', v); }catch(_){ } }
  function persistGet(){ try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; } }

  function normalizedFromShort(short){
    var o = OPTIONS.find(x => x.short === short);
    return o ? o.label : OPTIONS[0].label;
  }

  function shortFromLabel(lbl){
    var s = String(lbl||'').trim();
    if (/Ethereum \\(ETH\\)/i.test(s) || /\\bETH\\b/i.test(s)) return 'ETH';
    return 'stETH'; // по умолчанию stETH
  }

  function setIcon(iconHost, short){
    if (!iconHost) return;
    iconHost.innerHTML = (short === 'ETH') ? ICON_ETH : ICON_LIDO;
  }

  function applySelection(ctrl, short){
    var label = normalizedFromShort(short);
    // value у инпута
    try {
      ctrl.inp.value = label;
      ctrl.inp.setAttribute('value', label);
    } catch(_){}
    // иконка
    setIcon(ctrl.iconHost, short);
    // подписи по странице
    document.querySelectorAll('[data-currency-label]').forEach(function(x){ x.textContent = short; });
    var scope = ctrl.root || document;
    Array.from(scope.querySelectorAll('.sc-esYiGF, .styles__InputStyle-sc-zr8x53-0 span, label span')).forEach(function(el){
      var t=(el.textContent||'').trim();
      if (/^(stETH|wstETH|ETH) amount$/i.test(t)) el.textContent = short + ' amount';
    });
    document.documentElement.setAttribute('data-selected-token', short);
    persistSet(short);
  }

  // Строим меню с иконками
  function ensureMenu(ctrl){
    var host = ctrl.selectRoot;
    var menu = host.querySelector('.mirror-token-menu-icons');
    if (menu) return menu;

    // позиционируем относительно контейнера
    var rel = getComputedStyle(host).position;
    if (rel === 'static') host.style.position = 'relative';

    menu = document.createElement('div');
    menu.className = 'mirror-token-menu-icons';
    menu.setAttribute('role','menu');

    OPTIONS.forEach(function(opt){
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'mirror-token-item-icons';
      item.innerHTML = '<span class="ico">'+opt.icon+'</span><span class="lbl">'+opt.label+'</span>';
      item.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        applySelection(ctrl, opt.short);
        closeAllMenus();
      });
      menu.appendChild(item);
    });

    host.appendChild(menu);
    return menu;
  }

  function toggleMenu(ctrl){
    var m = ensureMenu(ctrl);
    var open = m.style.display === 'block';
    closeAllMenus();
    m.style.display = open ? 'none' : 'block';
  }

  function closeAllMenus(){
    document.querySelectorAll('.mirror-token-menu-icons').forEach(function(m){ m.style.display='none'; });
  }

  // CSS
  var css = document.createElement('style');
  css.textContent = \`
    .mirror-token-menu-icons{
      position:absolute; z-index:999999;
      top:calc(100% + 8px); left:0; min-width:260px;
      background:#fff; color:#111; border:1px solid rgba(0,0,0,.12);
      border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.16);
      padding:8px; display:none;
    }
    .mirror-token-item-icons{
      display:flex; align-items:center; gap:12px;
      width:100%; text-align:left; padding:10px 12px;
      border:none; background:transparent; border-radius:10px;
      cursor:pointer; font:inherit;
    }
    .mirror-token-item-icons:hover{ background:rgba(0,0,0,.05); }
    .mirror-token-item-icons .ico{ width:24px; height:24px; display:inline-flex; align-items:center; }
    .mirror-token-item-icons .lbl{ white-space:nowrap; }
  \`;
  document.head.appendChild(css);

  // Инициализация
  function init(){
    var controls = findAllControls();
    if (!controls.length) return;

    // начальная синхронизация (из сохранённого выбора, если есть)
    var saved = persistGet();
    controls.forEach(function(ctrl){
      var short = saved || shortFromLabel(ctrl.inp.value || ctrl.inp.getAttribute('value'));
      applySelection(ctrl, short);
      // toggle по клику на селект
      ctrl.selectRoot.addEventListener('click', function(e){
        if (e.target.closest('.mirror-token-menu-icons')) return;
        e.preventDefault(); e.stopPropagation();
        toggleMenu(ctrl);
      }, {capture:true});
    });
  }

  init();

  // Закрытие меню по клику вне и ESC
  document.addEventListener('click', function(e){
    if (!e.target.closest('.mirror-token-menu-icons')) closeAllMenus();
  }, true);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeAllMenus();
  });

  // На динамику: если React перерисовал кусок — перевесимся
  var mo = new MutationObserver(function(){
    // небольшая задержка, чтобы DOM успел стабилизироваться
    setTimeout(init, 0);
  });
  mo.observe(document.documentElement, {subtree:true, childList:true});
})();
</script>
`;

function inject(file){
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARK)) return false;
  const $ = cheerio.load(html, { decodeEntities:false });
  ($('body').length ? $('body') : $.root()).append(RUNTIME);
  fs.writeFileSync(file + '.bakBeforeTokenDropdownIconsV4', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ dropdown+icons injected:', path.relative(process.cwd(), file));
  return true;
}

let n=0; PAGES.forEach(f => { if (inject(f)) n++; });
console.log('Готово. Файлов обновлено:', n);
