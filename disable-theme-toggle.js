// disable-theme-toggle.js — делает переключатель темы неактивным на всех stake-страницах
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve('./stake-site');
const MARK = 'THEME TOGGLE DISABLED RUNTIME';

function walk(d, out=[]) {
  for (const e of fs.readdirSync(d, {withFileTypes:true})) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name === 'index.html') out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let changed = 0;

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  var SEL = '[aria-label*="theme" i], [data-testid*="theme" i], button[title*="theme" i], [aria-label*="dark" i], [aria-label*="light" i]';

  // (опционально) принудительно оставим светлую тему
  try {
    document.documentElement.setAttribute('data-lido-theme','light');
    document.documentElement.classList.remove('dark');
    // если сайт запоминает тему в storage — сбросим на light
    try {
      for (var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if (/theme/i.test(k)) localStorage.setItem(k,'light');
      }
    } catch(_) {}
  } catch(_) {}

  // сделаем все потенциальные переключатели неактивными визуально и семантически
  function disable(el){
    try{
      el.setAttribute('aria-disabled','true');
      el.setAttribute('tabindex','-1');
      el.style.pointerEvents = 'none';
      el.style.cursor = 'default';
      el.style.opacity = el.style.opacity || '0.6';
    }catch(_){}
  }
  document.querySelectorAll(SEL).forEach(disable);

  // страховка: глушим клики/Enter/Space, даже если появятся новые кнопки
  function block(e){
    var t = e.target.closest && e.target.closest(SEL);
    if (!t) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  }
  ['click','pointerdown','keydown','keyup','keypress'].forEach(function(evt){
    document.addEventListener(evt, function(e){
      if ((evt === 'keydown' || evt === 'keyup' || evt === 'keypress') &&
          !(e.key === 'Enter' || e.key === ' ')) return;
      block(e);
    }, true);
  });

  // если что-то динамически дорисуют — сразу «отключим»
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if (m.type==='childList'){
        m.addedNodes.forEach(function(n){
          if (n.nodeType===1){
            if (n.matches && n.matches(SEL)) disable(n);
            n.querySelectorAll && n.querySelectorAll(SEL).forEach(disable);
          }
        });
      }
    });
  }).observe(document.documentElement, {subtree:true, childList:true});

  console.log('${MARK}');
})();
</script>
`;

// оффлайн CSS (на случай если скрипт не выполнится)
const INLINE_CSS = `
<style id="theme-toggle-disabled-css">
[aria-label*="theme" i], [data-testid*="theme" i], button[title*="theme" i],
[aria-label*="dark" i], [aria-label*="light" i]{
  pointer-events: none !important;
  cursor: default !important;
  opacity: .6;
}
</style>
`;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities:false });

  // вставим оффлайн CSS
  $('head').append(INLINE_CSS);

  // если ещё не вставляли — добавим рантайм
  if (!html.includes(MARK)) $('body').append(RUNTIME);

  // семантически пометим найденные элементы как disabled
  const $toggles = $(
    '[aria-label*="theme" i], [data-testid*="theme" i], button[title*="theme" i],' +
    ' [aria-label*="dark" i], [aria-label*="light" i]'
  );
  $toggles.attr('aria-disabled','true').attr('tabindex','-1');

  fs.writeFileSync(file + '.bakBeforeThemeDisable', html, 'utf8'); // бэкап
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ Patched:', path.relative(process.cwd(), file));
  changed++;
}

console.log('Готово. Файлов обновлено:', changed);

