
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = 'MIRROR TOKEN DROPDOWN v3-STABLE';

const ICON_LIDO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7.078 11.148l-.135.206a5.788 5.788 0 00.814 7.32 6.043 6.043 0 004.24 1.72l-4.92-9.246z" fill="#00A3FF"></path><path opacity="0.6" d="M11.997 13.958l-4.92-2.81 4.92 9.246v-6.436zm4.925-2.81l.134.206a5.788 5.788 0 01-.813 7.32 6.043 6.043 0 01-4.24 1.72l-4.92-9.246z" fill="#00A3FF"></path><path opacity="0.2" d="M12.002 13.958l4.92-2.81-4.92 9.246v-6.436zm.001-6.278v4.847l4.238-2.422-4.238-2.425z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.68l-4.24 2.425 4.24 2.422V7.68z" fill="#00A3FF"></path><path d="M12.003 3.604l-4.24 6.502 4.24-2.431V3.604z" fill="#00A3FF"></path><path opacity="0.6" d="M12.003 7.674l4.241 2.432-4.24-6.506v4.074z" fill="#00A3FF"></path></svg>';
const ICON_ETH  = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path opacity="0.6" d="M11.999 3.75v6.098l5.248 2.303-5.248-8.401z"></path><path d="M11.999 3.75L6.75 12.151l5.249-2.303V3.75z"></path><path opacity="0.6" d="M11.999 16.103v4.143l5.251-7.135L12 16.103z"></path><path d="M11.999 20.246v-4.144L6.75 13.111l5.249 7.135z"></path><path opacity="0.2" d="M11.999 15.144l5.248-2.993-5.248-2.301v5.294z"></path><path opacity="0.6" d="M6.75 12.151l5.249 2.993V9.85l-5.249 2.3z"></path></svg>';

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  console.log('${MARK} ACTIVE');

  var ICON_LIDO = ${JSON.stringify(ICON_LIDO)};
  var ICON_ETH  = ${JSON.stringify(ICON_ETH)};


  var css = document.createElement('style');
  css.textContent = [
    'div[data-radix-portal] [role="listbox"], [role="listbox"][data-state="open"]{display:none!important;}',
    '.mirror-token-menu{position:absolute;z-index:2147483647;top:calc(100% + 8px);left:0;min-width:260px;background:#fff;color:#111;border:1px solid rgba(0,0,0,.12);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.16);padding:8px;display:none}',
    '.mirror-token-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px 12px;border:none;background:transparent;border-radius:10px;cursor:pointer;font:inherit}',
    '.mirror-token-item:hover{background:rgba(0,0,0,.05)}',
    '.mirror-token-item .ico{width:24px;height:24px;display:inline-flex;align-items:center}',
    '.sc-eyvILC *{transition:none!important;animation:none!important;}',
    '.sc-eyvILC .mirror-ico{display:none}',
    '.sc-eyvILC.token-stETH .ico-lido{display:inline-flex}',
    '.sc-eyvILC.token-ETH .ico-eth{display:inline-flex}',
    '.mirror-trigger{position:absolute;inset:0;cursor:pointer;background:transparent;border:0;padding:0;margin:0;appearance:none;z-index:2147483646}'
  ].join('');
  document.head.appendChild(css);

  function save(v){ try{ localStorage.setItem('mirror.selectedToken', v);}catch(_){} }
  function load(){ try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; } }
  function norm(short){ return short==='ETH' ? 'Ethereum (ETH)' : 'Lido (stETH)'; }
  function shortFromLabel(lbl){ return /Ethereum \\(ETH\\)/i.test(String(lbl||'')) ? 'ETH' : 'stETH'; }

  function setInputValue(inp, text){
    try{
      inp.value = text;
      inp.setAttribute('value', text);
      inp.dispatchEvent(new Event('input', {bubbles:true}));
      inp.dispatchEvent(new Event('change', {bubbles:true}));
    }catch(_){}
  }

  function applyToken(root, short){
    var lbl = norm(short);
    var tokenInput = root.querySelector('input[data-testid="drop-down"][readonly], input[name="token"][readonly]');
    if (tokenInput) setInputValue(tokenInput, lbl);

 
    document.querySelectorAll('.sc-esYiGF, .styles__InputStyle-sc-zr8x53-0 span, label span').forEach(function(el){
      var t = (el.textContent||'').trim();
      if (/^(stETH|wstETH|ETH) amount$/i.test(t)) el.textContent = short + ' amount';
    });

    var iconHost = root.querySelector('.sc-eyvILC');
    if (iconHost){
      iconHost.classList.toggle('token-stETH', short==='stETH');
      iconHost.classList.toggle('token-ETH', short==='ETH');
      // гарантируем наличие наших SVG
      if (!iconHost.querySelector('.mirror-ico-wrap')){
        var wrap=document.createElement('span');
        wrap.className='mirror-ico-wrap';
        wrap.innerHTML='<span class="mirror-ico ico-lido">'+ICON_LIDO+'</span><span class="mirror-ico ico-eth">'+ICON_ETH+'</span>';
        iconHost.appendChild(wrap);
      }
    }
    document.documentElement.setAttribute('data-selected-token', short);
    save(short);
  }

  function makeMenu(host, onPick){
    var m = host.querySelector('.mirror-token-menu');
    if (m) return m;
    if (getComputedStyle(host).position==='static') host.style.position='relative';
    m = document.createElement('div');
    m.className='mirror-token-menu';
    [['stETH','Lido (stETH)', ICON_LIDO], ['ETH','Ethereum (ETH)', ICON_ETH]].forEach(function(row){
      var b = document.createElement('button');
      b.type='button'; b.className='mirror-token-item';
      b.innerHTML='<span class="ico">'+row[2]+'</span><span>'+row[1]+'</span>';
      b.addEventListener('pointerdown', function(e){
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        onPick(row[0]); m.style.display='none';
      });
      m.appendChild(b);
    });
    host.appendChild(m);
    return m;
  }

  function openMenuOnce(menu){
    
    menu.style.display = 'block';
    const closer = function(ev){
      if (ev.target.closest('.mirror-token-menu')) return;
      menu.style.display = 'none';
      document.removeEventListener('pointerdown', closer, true);
    };
    document.addEventListener('pointerdown', closer, true);
  }

  function initOne(tokenInput){
    if (!tokenInput) return;
    var root = tokenInput.closest('.sc-fBWQRz') || tokenInput.parentElement;
    if (!root || root.__mirrorV3) return;

    
    tokenInput.setAttribute('tabindex','-1');
    tokenInput.style.pointerEvents='none';

    var label = root.closest('label') || root;
    var iconHost = root.querySelector('.sc-eyvILC');
    if (iconHost){
     
      Array.from(iconHost.querySelectorAll('svg')).forEach(s => s.remove());
    }

    var menu = makeMenu(label, function(short){ applyToken(root, short); });

   
    var trigger = label.querySelector('.mirror-trigger');
    if (!trigger){
      trigger = document.createElement('button');
      trigger.type='button'; trigger.className='mirror-trigger';
      label.appendChild(trigger);
    }

    
    trigger.addEventListener('pointerdown', function(e){
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      openMenuOnce(menu);
    }, true);


    var start = load() || shortFromLabel(tokenInput.value || tokenInput.getAttribute('value'));
    applyToken(root, start);

    root.__mirrorV3 = true;
  }

  function initAll(){
    document.querySelectorAll('input[data-testid="drop-down"][readonly], input[name="token"][readonly]')
      .forEach(initOne);
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll, {once:true});
  else initAll();
})();
</script>
`;

function patch(file){
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARK)) return false;

 
  const i = html.lastIndexOf('</body>');
  const out = (i >= 0) ? html.slice(0, i) + RUNTIME + '\n</body>' + html.slice(i+7)
                       : html + '\n' + RUNTIME + '\n';

  fs.writeFileSync(file + '.bakBeforeDropdownV3', html, 'utf8');
  fs.writeFileSync(file, out, 'utf8');
  console.log('✓ patched:', path.relative(process.cwd(), file));
  return true;
}

let n=0; for (const f of PAGES) n += patch(f) ? 1 : 0;
console.log('Готово. Обновлено файлов:', n);
