// repair-unwrap-inline.js — чистит wrap/unwrap/index.html: удаляет битые инъекции и вставляет лёгкие версии
const fs = require('fs');
const path = require('path');

const FILE = path.resolve('stake-site/unwrap/index.html'); // <- цель
if (!fs.existsSync(FILE)) {
  console.error('Файл не найден:', FILE);
  process.exit(1);
}

let html = fs.readFileSync(FILE, 'utf8');
const original = html;

// 0) Санитизация невидимых символов / кавычек / BOM
html = html.replace(/^\uFEFF/, '');
html = html.replace(/\u00A0/g, ' ');
html = html.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
// вычищаем странные управляющие в <script>
html = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, js) => {
  const cleaned = js.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  return `<script>${cleaned}</script>`;
});

// 1) Сносим старые тяжёлые/битые вставки по маркерам
const KILL = [
  /<script[^>]*>[\s\S]*?(LOCAL HARD GUARD|UNIFIED FIX|ALLOWLIST|FAQ FIX|RC FAQ|MIRROR TOKEN DROPDOWN ICONS|MIRROR TOKEN DROPDOWN|MIRROR FAQ)[\s\S]*?<\/script>/gi,
  /<style[^>]*>[\s\S]*?MIRROR[\s\S]*?<\/style>/gi,
];
for (const rx of KILL) html = html.replace(rx, '');

// 2) Добавляем лёгкий гард + мини-FAQ
const MAIN_BASE  = 'http://localhost:8000/';
const GUARD = `
<script>
/* MIRROR LEAN GUARD v1 (unwrap) */
(function(){
  var ORIGIN_STAKE = 'https://stake.lido.fi';
  var MAIN_RX = /^https?:\\/\\/(?:www\\.)?lido\\.fi/i;
  function folder(p){ return (!p||p==='/')?'/':(p.endsWith('/')?p:p+'/'); }
  function map(href){
    try{
      var s = String(href||'');
      if (MAIN_RX.test(s)) return '${MAIN_BASE}';
      var u = s.startsWith('http') ? new URL(s) : new URL(s, location.origin);
      if (u.origin === ORIGIN_STAKE){
        var p = folder(u.pathname||'/');
        if (p === '/withdrawals/') p = '/withdrawals/request/';
        if (location.pathname.startsWith('/wrap/') && p === '/wrap/') p = '/wrap/wrap/';
        return p;
      }
    }catch(_){}
    return null;
  }
  ['click','pointerdown','mousedown','mouseup','auxclick','touchstart','touchend'].forEach(function(t){
    document.addEventListener(t, function(e){
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var next = map(a.getAttribute('href')||'');
      if (next){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); location.href = next; }
    }, true);
  });
  console.log('LEAN GUARD (unwrap) ACTIVE');
})();
</script>`;

const FAQ_MINI = `
<script>
/* MIRROR FAQ MINI v1 (unwrap) */
(function(){
  function panel(btn){ var id=btn.getAttribute('aria-controls'); if(id) return document.getElementById(id); var n=btn.nextElementSibling; return (n&&n.tagName==='DIV')?n:null; }
  function setOpen(btn,open){
    var p=panel(btn);
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.setAttribute('data-state',open?'open':'closed');
    if(p){ p.setAttribute('aria-hidden',open?'false':'true'); p.style.display=open?'block':'none'; }
  }
  function closeAll(){ document.querySelectorAll('[id^="react-collapsed-toggle-"], [data-testid="faq-item"] [role="button"]').forEach(function(b){ setOpen(b,false); }); }
  function attach(){
    closeAll();
    document.addEventListener('click',function(e){
      var b=e.target.closest && e.target.closest('[id^="react-collapsed-toggle-"], [data-testid="faq-item"] [role="button"]');
      if(!b) return;
      e.preventDefault();
      var open=b.getAttribute('aria-expanded')==='true';
      setOpen(b,!open);
    },true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',attach,{once:true}); else attach();
})();
</script>`;

// 3) Вставляем перед </body>
const i = html.lastIndexOf('</body>');
if (i >= 0) html = html.slice(0,i) + '\n' + GUARD + '\n' + FAQ_MINI + '\n</body>' + html.slice(i+7);
else html += GUARD + FAQ_MINI;

// 4) Сохраняем
if (html !== original) {
  fs.writeFileSync(FILE + '.bakRepairUnwrap', original, 'utf8');
  fs.writeFileSync(FILE, html, 'utf8');
  console.log('✓ wrap/unwrap/index.html repaired and reinjected');
} else {
  console.log('= no change (file already clean)');
}

