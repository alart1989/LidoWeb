
const fs=require('fs'),path=require('path'),cheerio=require('cheerio');

const BASE=path.resolve('./mine-site/index.html');
const SNIP=path.resolve('./mine-site/burger-snippet.html');

if(!fs.existsSync(BASE)) { console.error('Нет файла', BASE); process.exit(1); }
if(!fs.existsSync(SNIP)) { console.error('Нет файла', SNIP); process.exit(1); }

const base=fs.readFileSync(BASE,'utf8');
let   snip=fs.readFileSync(SNIP,'utf8').trim();


if(!/id=['"]mirror-burger-panel['"]/.test(snip)){
  snip = `<div id="mirror-burger-panel">${snip}</div>`;
}
const $=cheerio.load(base,{decodeEntities:false});


$('#mirror-burger-panel').remove();
$('#mirror-burger-backdrop').remove();


$('body').append(`
<div id="mirror-burger-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99997;display:none;"></div>
${snip}
`);


const panel = $('#mirror-burger-panel');
panel.attr('style', (panel.attr('style')||'')
  .replace(/display\s*:[^;]+;?/gi,'')
  .replace(/visibility\s*:[^;]+;?/gi,'')
);
panel.css({
  position:'fixed', top:'0', right:'0', height:'100vh',
  width:'78vw', 'max-width':'420px', 'z-index':99998,
  display:'none', overflow:'auto'
});

$('[data-testid="burger-button"], .header-content_burgerButton__R1HVQ').each((_,el)=>{
  const $el=$(el);
  $el.removeClass('sf-hidden');
  $el.attr('type','button');
  if($el.is('a')) $el.removeAttr('href');
  const style = ($el.attr('style')||'').replace(/display\s*:[^;]+;?/gi,'').replace(/visibility\s*:[^;]+;?/gi,'');
  if(style) $el.attr('style',style); else $el.removeAttr('style');
});


if(!$('style#mirror-burger-wire').length){
  $('head').append(`
<style id="mirror-burger-wire">
@media (min-width:1024px){ [data-testid="burger-button"], .header-content_burgerButton__R1HVQ { display:none !important; } }
@media (max-width:1023px){ [data-testid="burger-button"], .header-content_burgerButton__R1HVQ { display:inline-flex !important; } }
#mirror-burger-backdrop.open { display:block !important; }
#mirror-burger-panel.open    { display:block !important; }
</style>`);
}
if(!$('script:contains("MAIN BURGER PANEL WIRE v3")').length){
  $('body').append(`
<script>
/* MAIN BURGER PANEL WIRE v3 ACTIVE */
(function(){
  var MOBILE=window.matchMedia('(max-width:1023px)');
  var btnSel='[data-testid="burger-button"], .header-content_burgerButton__R1HVQ';
  var panel=document.getElementById('mirror-burger-panel');
  var backdrop=document.getElementById('mirror-burger-backdrop');

  function open(){ if(!panel) return; panel.classList.add('open'); backdrop.classList.add('open'); }
  function close(){ if(!panel) return; panel.classList.remove('open'); backdrop.classList.remove('open'); }

  function bind(){
    var btn=document.querySelector(btnSel);
    if(!btn||!panel) return;
    if(btn.tagName==='A') btn.removeAttribute('href');
    btn.setAttribute('type','button');
    btn.addEventListener('click', function(e){
      if(!MOBILE.matches) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      open();
    }, true);
    backdrop.addEventListener('click', function(){ close(); }, true);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') close(); }, true);
  }
  bind();
})();
</script>`);
}


fs.writeFileSync(BASE+'.bakBeforeBurgerPanelMerge', base, 'utf8');
fs.writeFileSync(BASE, $.html(), 'utf8');
console.log('✓ Панель бургера вставлена из burger-snippet.html');
