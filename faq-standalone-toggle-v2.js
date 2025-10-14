
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/index.html',
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARKS_OLD = [
  'STAKE FAQ CLOSE STATIC',
  'RC FAQ FIX',
  'FAQ FIX v'
];
const MARK = 'MIRROR STANDALONE FAQ v2';

const RUNTIME = `
<script>
/* ${MARK} */
(function(){
  // Мини CSS для плавности (не обязателен)
  (function addCSS(){
    var s = document.createElement('style');
    s.textContent = [
      '.mirror-faq-panel{overflow:hidden;transition:max-height .25s ease, opacity .2s ease}',
      '.mirror-faq-panel[aria-hidden="true"]{max-height:0;opacity:0}',
      '.mirror-faq-panel[aria-hidden="false"]{max-height:600px;opacity:1}'
    ].join('');
    document.head.appendChild(s);
  })();

  function getPanel(btn){
    var id = btn.getAttribute('aria-controls');
    if (id) return document.getElementById(id);
    // запасной вариант — следующий сосед
    var n = btn.nextElementSibling;
    return (n && n.tagName === 'DIV') ? n : null;
  }

  function setOpen(btn, open){
    var panel = getPanel(btn);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('data-state', open ? 'open' : 'closed');
    if (panel){
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      // навесим наш класс, чтобы CSS сработал даже если были инлайны
      panel.classList.add('mirror-faq-panel');
      // частично чистим инлайновые стили «react-collapsed»
      panel.style.display = open ? 'block' : 'none';
      panel.style.height = '';
      panel.style.maxHeight = '';
      panel.style.opacity = '';
      panel.style.overflow = '';
    }
  }

  function closeAll(){
    document.querySelectorAll('[id^="react-collapsed-toggle-"], [data-testid="faq-item"] [role="button"]').forEach(function(btn){
      setOpen(btn, false);
    });
  }

  function attach(){
    // 1) закрываем всё по умолчанию
    closeAll();

    // 2) навешиваем обработчик на весь FAQ-контейнер (делегирование)
    document.addEventListener('click', function(e){
      var btn = e.target.closest('[id^="react-collapsed-toggle-"], [data-testid="faq-item"] [role="button"]');
      if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      setOpen(btn, !isOpen);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once:true });
  } else {
    attach();
  }
  console.log('${MARK} ACTIVE');
})();
</script>
`;

function apply(file){
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities:false });

  // убрать наши старые FAQ-фиксы, если были
  $('script').each((_, el) => {
    const txt = $(el).html() || '';
    if (MARKS_OLD.some(m => txt.includes(m))) $(el).remove();
  });
  if ($.html().includes(MARK)) return false;

  const $body = $('body');
  ($body.length ? $body : $.root()).append(RUNTIME);

  fs.writeFileSync(file + '.bakBeforeStandaloneFAQv2', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ FAQ injected:', path.relative(process.cwd(), file));
  return true;
}

let n=0; PAGES.forEach(f => { if (apply(f)) n++; });
console.log('Готово. Обновлено файлов:', n);
