
const fs = require('fs'), path = require('path');

const FILES = [
  'stake-site/wrap/wrap/index.html',
  'stake-site/wrap/unwrap/index.html',
  'stake-site/withdrawals/request/index.html',
  'stake-site/withdrawals/claim/index.html',
].map(p => path.resolve(p));

for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let html = fs.readFileSync(f, 'utf8');
  const before = html;


  html = html.replace(
    /Array\.from\(iconHost\.querySelectorAll\('svg'\)\)\.forEach\(s=>s\.remove\(\)\);/g,
    `Array.from(iconHost.querySelectorAll('svg')).forEach(function(s){
       if (!s.closest('.mirror-ico-wrap')) s.remove();
     });`
  );

 
  if (!/mirror-ico-wrap/.test(html)) {
    
    html = html.replace(
      /var iconHost = root\.querySelector\('\.sc-eyvILC'\);\s*if \(iconHost\)\{\s*/g,
      `var iconHost = root.querySelector('.sc-eyvILC'); if (iconHost){
         if (!iconHost.querySelector('.mirror-ico-wrap')) {
           var wrap=document.createElement('span');
           wrap.className='mirror-ico-wrap';
           wrap.innerHTML='<span class="mirror-ico ico-lido">'+ICON_LIDO+'</span><span class="mirror-ico ico-eth">'+ICON_ETH+'</span>';
           iconHost.appendChild(wrap);
         }`
    );
  }

  if (html !== before) {
    fs.writeFileSync(f + '.bakBeforeFixIcons', before, 'utf8');
    fs.writeFileSync(f, html, 'utf8');
    console.log('✓ patched icons logic in', path.relative(process.cwd(), f));
  } else {
    console.log('⩽ no change in', path.relative(process.cwd(), f));
  }
}
console.log('Done.');
