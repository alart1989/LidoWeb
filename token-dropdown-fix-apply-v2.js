// token-dropdown-fix-apply-v2.js — надёжное открытие + правильное обновление значения
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = '/* MIRROR TOKEN DROPDOWN FIX v2 */';

const RUNTIME = `
<script>
${MARK}
(function(){
  console.log('MIRROR TOKEN DROPDOWN FIX v2 ACTIVE');

  function setInputValue(inp, text){
    try {
      // и prop, и атрибут, плюс события — чтобы UI точно обновился
      inp.value = text;
      inp.setAttribute('value', text);
      inp.dispatchEvent(new Event('input', {bubbles:true}));
      inp.dispatchEvent(new Event('change', {bubbles:true}));
    } catch(_) {}
  }

  function norm(short){ return short==='ETH' ? 'Ethereum (ETH)' : 'Lido (stETH)'; }
  function shortFromLabel(lbl){ return /Ethereum \\(ETH\\)/i.test(String(lbl||'')) ? 'ETH' : 'stETH'; }
  function save(v){ try{ localStorage.setItem('mirror.selectedToken', v);}catch(_){} }
  function load(){ try{ return localStorage.getItem('mirror.selectedToken'); }catch(_){ return null; } }

  function applyToken(root, short){
    const labelTxt = norm(short);

    // сам инпут слева (с названием токена)
    const tokenInput = root.querySelector('input[data-testid="drop-down"][readonly], input[name="token"][readonly]');
    if (tokenInput) setInputValue(tokenInput, labelTxt);

    // подписи вида "stETH amount" → "ETH amount"
    document.querySelectorAll('.sc-esYiGF, .styles__InputStyle-sc-zr8x53-0 span, label span').forEach(function(el){
      const t = (el.textContent || '').trim();
      if (/^(stETH|wstETH|ETH) amount$/i.test(t)) el.textContent = short + ' amount';
    });

    // класс на хосте иконок (чтобы показать нужный svg)
    const iconHost = root.querySelector('.sc-eyvILC');
    if (iconHost){
      iconHost.classList.toggle('token-stETH', short==='stETH');
      iconHost.classList.toggle('token-ETH', short==='ETH');
    }

    document.documentElement.setAttribute('data-selected-token', short);
    save(short);
  }

  function initOne(tokenInput){
    if (!tokenInput || tokenInput.__mirrorFixV2) return;

    // ищем контейнер селекта и нашу менюшку, которую вставлял предыдущий скрипт
    const root = tokenInput.closest('.sc-fBWQRz') || tokenInput.parentElement;
    const label = root ? (root.closest('label') || root) : document.body;
    const menu  = label.querySelector('.mirror-token-menu');

    // делаем надёжный прозрачный триггер (если нет)
    let trigger = label.querySelector('.mirror-trigger');
    if (!trigger){
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'mirror-trigger';
      trigger.style.position='absolute';
      trigger.style.inset='0';
      trigger.style.background='transparent';
      trigger.style.border='0';
      trigger.style.padding='0';
      trigger.style.margin='0';
      trigger.style.cursor='pointer';
      label.appendChild(trigger);
    }

    // блокируем исходный input от кликов
    tokenInput.setAttribute('tabindex','-1');
    tokenInput.style.pointerEvents='none';

    // текущее значение
    const startShort = load() || shortFromLabel(tokenInput.value || tokenInput.getAttribute('value'));
    applyToken(label, startShort);

    // надёжное открытие: сначала mousedown → предотвратить «внешнее закрытие», затем показать меню
    trigger.addEventListener('mousedown', function(e){
      e.preventDefault(); e.stopPropagation();
      if (menu){
        menu.style.display = (menu.style.display==='block') ? 'none' : 'block';
      }
    }, true);

    // выбор пункта (делегирование внутри меню)
    if (menu){
      menu.addEventListener('mousedown', function(e){
        const btn = e.target.closest('.mirror-token-item');
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        const text = (btn.textContent || '').trim();
        const short = /Ethereum \\(ETH\\)/i.test(text) ? 'ETH' : 'stETH';
        applyToken(label, short);
        menu.style.display = 'none';
      });
    }

    // клик вне — закрыть меню
    document.addEventListener('mousedown', function(ev){
      if (!menu) return;
      if (ev.target.closest('.mirror-token-menu') || ev.target.closest('.mirror-trigger')) return;
      menu.style.display = 'none';
    });

    tokenInput.__mirrorFixV2 = true;
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

  // вставим перед </body>
  const i = html.lastIndexOf('</body>');
  const out = (i >= 0) ? html.slice(0, i) + RUNTIME + '\\n</body>' + html.slice(i+7) : (html + '\\n' + RUNTIME + '\\n');

  fs.writeFileSync(file + '.bakBeforeTokenFixV2', html, 'utf8');
  fs.writeFileSync(file, out, 'utf8');
  console.log('✓ patched:', path.relative(process.cwd(), file));
  return true;
}

let n=0; for (const f of PAGES) n += patch(f) ? 1 : 0;
console.log('Готово. Обновлено файлов:', n);
