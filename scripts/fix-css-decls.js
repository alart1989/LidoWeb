

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const FILE = process.argv[2];
if (!FILE) {
  console.error('Usage: node scripts/fix-css-decls.js <path/to/index.html>');
  process.exit(1);
}
if (!fs.existsSync(FILE)) {
  console.error('Нет файла:', FILE);
  process.exit(1);
}

const htmlBefore = fs.readFileSync(FILE, 'utf8');
const $ = cheerio.load(htmlBefore, { decodeEntities: false });

$('style').each((_, el) => {
  let css = $(el).html() || '';

  css = css.replace(/\u00A0/g, ' ').replace(/\u200B/g, '');

  css = css.replace(/\bcolor-theme\s*:\s*[^;{}]*;/g, '');
  css = css.replace(/([;{])\s*[a-zA-Z_-][\w-]*\s*:\s*;/g, '$1');
  css = css.replace(/([;{])\s*--[\w-]+\s*:\s*;\s*/g, '$1');
  css = css.replace(/var\(\s*(--[\w-]+)\s*,\s*\)/g, 'var($1, initial)');
  css = css.replace(/calc\(\s*\)/g, '0');
  css = css.replace(/,\s*;/g, ';').replace(/;;+/g, ';');
  css = css.replace(/\{\s*\}/g, '{}').replace(/([^\}])\{\}/g, '$1').replace(/\{\s*;\s*\}/g, '{}');

  $(el).text(css);
});

const htmlAfter = $.html();
if (htmlAfter !== htmlBefore) {
  fs.writeFileSync(FILE + '.bakBeforeCssFix', htmlBefore, 'utf8');
  fs.writeFileSync(FILE, htmlAfter, 'utf8');
  console.log(`✓ ${FILE}: CSS очищен`);
} else {
  console.log(`= ${FILE}: правки не потребовались`);
}
