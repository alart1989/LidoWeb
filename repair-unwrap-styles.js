// repair-unwrap-styles.js — чинит стили unwrap, перенося "голову" из wrap
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const WRAP = path.resolve('stake-site/wrap/wrap/index.html');
const UNWRAP = path.resolve('stake-site/wrap/unwrap/index.html');

function read(file){
  if(!fs.existsSync(file)) throw new Error('Нет файла: ' + file);
  return fs.readFileSync(file,'utf8');
}

function transplantHead(donorHtml, targetHtml){
  const $d = cheerio.load(donorHtml, { decodeEntities:false });
  const $t = cheerio.load(targetHtml, { decodeEntities:false });

  // 1) Переносим <head> целиком: meta+link+style+title
  const donorHead = $d('head');
  if (donorHead.length) {
    // Сохраним наш лёгкий guard/FAQ, если они были в target <body>
    const targetBody = $t('body').html();

    // Заменим head
    const newHeadHtml = donorHead.html() || '';
    if ($t('head').length) $t('head').html(newHeadHtml);
    else $t.root().prepend('<head>'+ newHeadHtml +'</head>');

    // 2) Убедимся, что <meta charset> и viewport есть
    if ($t('meta[charset]').length === 0) {
      $t('head').prepend('<meta charset="utf-8">');
    }
    if ($t('meta[name="viewport"]').length === 0) {
      $t('head').append('<meta name="viewport" content="width=device-width, initial-scale=1">');
    }

    // 3) Вернём целиком body, который уже был (контент unwrap)
    if (typeof targetBody === 'string') {
      $t('body').html(targetBody);
    }
  }

  // 4) Нормализуем <base>: для страниц под /wrap/unwrap/ база должна быть корень, чтобы относительные пути не "уезжали"
  const base = $t('base[href]');
  if (base.length) {
    base.attr('href', '/');
  } else {
    $t('head').prepend('<base href="/">');
  }

  // 5) Снимем возможные конфликтные деплой-вставки (только наши метки MIRROR, не трогаем нативные стили)
  $t('style').each((_,el)=>{
    const txt = $t(el).html() || '';
    if (/MIRROR (KILL NATIVE|TOKEN|FAQ|LEAK|BUNDLE|FAST SELECT)/i.test(txt)) {
      // оставим, если нужно — но сейчас лучше не трогать рабочие.
      // НИЧЕГО не удаляем тут.
    }
  });

  return $t.html();
}

try{
  const wrapHtml = read(WRAP);
  const unwrapHtml = read(UNWRAP);

  const out = transplantHead(wrapHtml, unwrapHtml);

  // бэкап и запись
  fs.writeFileSync(UNWRAP+'.bakBeforeHeadTransplant', unwrapHtml, 'utf8');
  fs.writeFileSync(UNWRAP, out, 'utf8');
  console.log('✓ Перенёс head из wrap → unwrap и нормализовал <base href="/">');
} catch (e) {
  console.error('Ошибка:', e.message);
  process.exit(1);
}
