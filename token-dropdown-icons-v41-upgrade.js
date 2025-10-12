// token-dropdown-icons-v41-upgrade.js — заменить v4 на v4.1 (без мерцаний)
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const OLD_MARK = 'MIRROR TOKEN DROPDOWN ICONS v4';
const NEW_MARK = 'MIRROR TOKEN DROPDOWN ICONS v4.1';

const RUNTIME = `
<script>
/* ${NEW_MARK} */
(function(){
  console.log('${NEW_MARK} ACTIVE');

  var ICON_LIDO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.078 11.148l-.135.206a5.788 5.788 0 00.814 7.32 6.043 6.043 0 004.24 1.72l-4.92-9.246z" fill="#00A3FF"></path><path opacity="0.6" d="M11.997 13.958l-4.92-2.81 4.92 9.246v-6.436zm4.925-2.81l.134.206a5.788 5.788 0 01-.813 7.32 6.043 6.043 0 01-4.24 1.72l-4.92-9.246z" fill="#00A3FF"></path><path opacity="0.2" d="M12.002 13.958l4.92-2.81-4.92 9.246v-6.436zm.001-6.278v4.847l4.238-2.422-4.238-2.425z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.68l-4.24 2.425 4.24 2.422V7.68z" fill="#00A3FF"></path><path d="M12.003 3.604l-4.24 6.502 4.24-2.431V3.604z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.674l4.241 2.432-4.24-6.506v4.074z" fill="#00A3FF"></path></svg>';
  var ICON_ETH  = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path opacity="0.6" d="M11.999 3.75v6.098l5.248 2.303-5.248-8.401z"></path><path d="M11.999 3.75L6.75 12.151l5.249-2.303V3.75z"></path><path opacity="0.6" d="M11.999 16.103v4.143l5.251-7.135L12 16.103z"></path><path d="M11.999 20.246v-4.144L6.75 13.111l5.249 7.135z"></path><path opacity="0.2" d="M11.999 15.144l5.248-2.993-5.248-2.301v5.294з"></path><path opacity="0.6" d="M6.75 12.151l5.249 2.993V9.85л-5.249 2.3з"></path></svg>';

  var OPTIONS = [
    { short: 'stETH',  label: 'Lido (stETH)',  icon: ICON_LIDO },
    { short: 'ETH',    label: 'Ethereum (ETH)', icon: ICON_ETH  }
  ];

  // CSS: без анимаций/переходов у SVG
  (function(){
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
      .sc-eyvILC svg{ transition:none !important; animation:none !important; }
    \`;
    document.head.appendChild(css);
  })();

  function findControls(){
    var inputs = document.querySelectorAll('input[data-testid="drop-down"][readonly], input[name="token"][readonly]');
    return Array.from(inputs).map(function(inp){
      var root = inp.closest('.sc-fBWQRz') || inp.parentElement;
      var iconHost = root ? (root.querySelector('.sc-eyvILC') || null) : null;
      var selectRoot = root ? (root.closest('label') || root) : null;
      return { inp, root, iconHost, selectRoot };
    }).filter(Boolean);
  }

  function normalizedFromShort(short){
    var opt = OPTIONS.find(o=>o.short===short);
    return opt ? opt.label : OPTIONS[0].label;
  }
  function shortFromLabel(lbl){
    var s = String(lbl||'').trim();
    if (/Ethereum \\(ETH\\)/i.test(s) || /\\bETH\\b/i.test(s)) return 'ETH';
    return 'stETH';
  }
  function persistSet(v){ try{ localStorage.setItem('mirror.selectedToken', v);}catch(_){ } }
  function persistGet(){ try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; } }

  function setIcon(host, short){
    if (!host) return;
    // если уже стоит эта иконка — не трогаем DOM (избегаем мерцаний)
    if (host.dataset && host.dataset.token === short) return;
    host.dataset.token = short;
    host.innerHTML = (short === 'ETH') ? ICON_ETH : ICON_LIDO;
  }

  function applySelection(ctrl, short){
    var label = normalizedFromShort(short);
    try { ctrl.inp.value = label; ctrl.inp.setAttribute('value', label); } catch(_){}
    setIcon(ctrl.iconHost, short);
    document.querySelectorAll('[data-currency-label]').forEach(function(x){ x.textContent = short; });
    var scope = ctrl.root || document;
    Array.from(scope.querySelectorAll('.sc-esYiGF, .styles__InputStyle-sc-zr8x53-0 span, label span')).forEach(function(el){
      var t=(el.textContent||'').trim();
      if (/^(stETH|wstETH|ETH) amount$/i.test(t)) el.textContent = short + ' amount';
    });
    document.documentElement.setAttribute('data-selected-token', short);
    persistSet(short);
  }

  function ensureMenu(ctrl){
    var host = ctrl.selectRoot;
    var menu = host.querySelector('.mirror-token-menu-icons');
    if (menu) return menu;
    var cs = getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';

    menu = document.createElement('div');
    menu.className = 'mirror-token-menu-icons'; menu.setAttribute('role','menu');
    OPTIONS.forEach(function(opt){
      var item = document.createElement('button');
      item.type='button';
      item.className='mirror-token-item-icons';
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
    document.querySelectorAll('.mirror-token-menu-icons').forEach(m=>m.style.display='none');
  }

  // --- init с дебаунсом ---
  var initedFor = new WeakSet();
  function initOnce(ctrl){
    if (!ctrl || initedFor.has(ctrl)) return;
    initedFor.add(ctrl);

    // начальный выбор
    var saved = persistGet();
    var short = saved || shortFromLabel(ctrl.inp.value || ctrl.inp.getAttribute('value'));
    applySelection(ctrl, short);

    ctrl.selectRoot.addEventListener('click', function(e){
      if (e.target.closest('.mirror-token-menu-icons')) return;
      e.preventDefault(); e.stopPropagation();
      toggleMenu(ctrl);
    }, {capture:true});
  }

  function initAll(){
    findControls().forEach(initOnce);
  }

  // первая инициализация
  initAll();

  // закрытие по клику вне / ESC
  document.addEventListener('click', function(e){
    if (!e.target.closest('.mirror-token-menu-icons')) closeAllMenus();
  }, true);
  document.addEventListener('keydown', function(e){ if (e.key==='Escape') closeAllMenus(); });

  // спокойный наблюдатель: дебаунс через rAF
  var scheduled = false;
  var mo = new MutationObserver(function(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){ scheduled = false; initAll(); });
  });
  mo.observe(document.documentElement, {subtree:true, childList:true});
})();
</script>
`;

function upgrade(file){
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities:false });

  // удалить старый v4 блок, если есть
  $('script').each((_,el)=>{
    const txt = $(el).html() || '';
    if (txt.includes(OLD_MARK)) $(el).remove();
  });

  // если v4.1 уже стоит — пропускаем
  if ($.html().includes(NEW_MARK)) return false;

  // вставить новый рантайм в конец <body>
  const $body = $('body'); ($body.length ? $body : $.root()).append(RUNTIME);

  fs.writeFileSync(file + '.bakBeforeIconsV41', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ upgraded:', path.relative(process.cwd(), file));
  return true;
}

let n=0; PAGES.forEach(f => { if (upgrade(f)) n++; });
console.log('Готово. Обновлено файлов:', n);

