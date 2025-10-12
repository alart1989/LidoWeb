// fast-select-css.js — инлайн-стиль, чтобы убрать нативный listbox и анимации
const fs = require('fs');
const path = require('path');

const PAGES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

const MARK = '/* MIRROR FAST SELECT CSS v1 */';

const CSS = `
<style>${MARK}
div[data-radix-portal] [role="listbox"],
[role="listbox"][data-state="open"] { display:none !important; }

/* убираем любые анимации/transition внутри хоста иконки,
   чтобы не было мерцаний при подмене SVG */
.sc-eyvILC * { transition:none !important; animation:none !important; }
</style>
`;

for (const file of PAGES) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARK)) continue;

  // вставим перед </head>, если нет — в начало <body>
  const iHead = html.indexOf('</head>');
  if (iHead !== -1) {
    html = html.slice(0, iHead) + CSS + html.slice(iHead);
  } else {
    const iBody = html.indexOf('<body');
    if (iBody !== -1) {
      const afterBody = html.indexOf('>', iBody) + 1;
      html = html.slice(0, afterBody) + CSS + html.slice(afterBody);
    } else {
      html = CSS + html;
    }
  }
  fs.writeFileSync(file, html, 'utf8');
  console.log('✓ injected fast CSS:', path.relative(process.cwd(), file));
}
console.log('Done.');
