
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve('./stake-site');

function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name === 'index.html') out.push(p);
  }
  return out;
}

function closePanel($el) {
  $el.attr('data-state', 'closed');
  $el.attr('aria-hidden', 'true');
  const style = ($el.attr('style') || '')
    .replace(/display\s*:\s*[^;]+;?/gi, '')
    .replace(/height\s*:\s*[^;]+;?/gi, '')
    .replace(/max-height\s*:\s*[^;]+;?/gi, '')
    .replace(/overflow\s*:\s*[^;]+;?/gi, '')
    .replace(/opacity\s*:\s*[^;]+;?/gi, '');
  if (style) $el.attr('style', style); else $el.removeAttr('style');

  $el.attr('style',
    ($el.attr('style')||'') +
    ( ($el.attr('style')||'').endsWith(';') ? '' : ';') +
    'display:none !important; height:0px !important; max-height:0px !important; overflow:hidden !important; opacity:0 !important;'
  );
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, { decodeEntities:false });


  $('summary, [role="button"][aria-controls], [id^="react-collapsed-toggle-"], [data-accordion-trigger]').each((_, el) => {
    const $t = $(el);
    $t.attr('aria-expanded', 'false');
    $t.attr('data-state', 'closed');
    $t.removeAttr('aria-disabled').removeAttr('tabindex').removeAttr('data-mirror-disabled');
    const id = $t.attr('aria-controls');
    if (id) {
      const $p = $('#'+CSS.escape(id));
      if ($p.length) closePanel($p);
    }
  });

  $('[id^="react-collapsed-panel-"], details, [role="region"], [data-accordion-content], [data-faq-panel], [data-mirror-faq-panel]').each((_, el) => {
    const $p = $(el);
    if ($p.is('details')) $p.removeAttr('open');
    closePanel($p);
  });

  fs.writeFileSync(file + '.bakClose', html, 'utf8');
  fs.writeFileSync(file, $.html(), 'utf8');
  console.log('✓ Закрыт FAQ в', path.relative(process.cwd(), file));
  changed++;
}

console.log('Готово. Файлов обновлено:', changed);
