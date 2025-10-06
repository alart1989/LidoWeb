
const fs = require('fs');
const path = require('path');

const TARGETS = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/unwrap/index.html',               
  'stake-site/index.html',                     
  'stake-site/rewards/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = 'LOCAL HARD GUARD v2 ACTIVE';
const MAIN_BASE = 'http://localhost:8000/';     

const GUARD_BLOCK = `
<script>
/* ${MARK} */
(function(){
  var ORIGIN_STAKE = 'https://stake.lido.fi';
  var MAIN_RX = /^https?:\\/\\/(?:www\\.)?lido\\.fi/i;
  function folderize(p){ if(!p) return '/'; if(p!=='/' && !/\\/$/.test(p)) return p + '/'; return p; }
  function map(url){
    try{
      var s = String(url||'');
      if (MAIN_RX.test(s)) return '${MAIN_BASE}';
      var u = s.startsWith('http') ? new URL(s) : new URL(s, location.origin);
      if (u.origin === ORIGIN_STAKE){
        var p = folderize(u.pathname||'/');
        if (p === '/withdrawals/') p = '/withdrawals/request/';
        if (location.pathname.startsWith('/wrap/') && p === '/wrap/') p = '/wrap/wrap/';
        return p;
      }
    }catch(_){}
    return null;
  }

  // Переписать существующие ссылки
  document.querySelectorAll('a[href]').forEach(function(a){
    var next = map(a.getAttribute('href')||'');
    if (next) a.setAttribute('href', next);
  });

  // Перехват кликов (capture)
  ['click','pointerdown','mousedown','mouseup','auxclick','touchstart','touchend'].forEach(function(t){
    document.addEventListener(t, function(e){
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var next = map(a.getAttribute('href')||'');
      if (next){
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        location.href = next;
      }
    }, true);
  });

  // Следим за динамически добавленными ссылками
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if (m.type==='attributes' && m.attributeName==='href' && m.target.tagName==='A'){
        var next = map(m.target.getAttribute('href')||'');
        if (next) m.target.setAttribute('href', next);
      }
      if (m.type==='childList'){
        m.addedNodes.forEach(function(n){
          if (n && n.nodeType===1 && n.querySelectorAll){
            n.querySelectorAll('a[href]').forEach(function(a){
              var next = map(a.getAttribute('href')||'');
              if (next) a.setAttribute('href', next);
            });
          }
        });
      }
    });
  }).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['href']});

  // Перехватываем window.open
  try{
    var _open = window.open;
    window.open = function(url,name,spec){
      var next = map(String(url||''));
      if (next){ location.href = next; return null; }
      return _open ? _open.apply(window, arguments) : null;
    };
  }catch(_){}

  // Перехватываем location.assign / replace
  try{
    var _assign = window.location.assign.bind(window.location);
    var _replace = window.location.replace.bind(window.location);
    window.location.assign = function(url){
      var next = map(String(url||'')); if (next){ location.href = next; } else { _assign(url); }
    };
    window.location.replace = function(url){
      var next = map(String(url||'')); if (next){ location.href = next; } else { _replace(url); }
    };
  }catch(_){}
  console.log('${MARK}');
})();
</script>
`;

function patch(file){
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARK)) return false;

  
  const idx = html.lastIndexOf('</body>');
  const out = (idx >= 0)
    ? html.slice(0, idx) + GUARD_BLOCK + '\n</body>' + html.slice(idx + 7)
    : html + '\n' + GUARD_BLOCK + '\n';

  fs.writeFileSync(file + '.bakBeforeHardGuard', html, 'utf8');
  fs.writeFileSync(file, out, 'utf8');
  console.log('✓ Поставил HARD GUARD в', path.relative(process.cwd(), file));
  return true;
}

let count = 0;
for (const f of TARGETS) count += patch(f) ? 1 : 0;
console.log('Готово. Пропатчено файлов:', count);

