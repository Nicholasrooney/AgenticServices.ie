// Regenerates js/products.js from data/products.json (run: node tools/build-products.js)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'js/products.js'),
  '/* AUTO-GENERATED from data/products.json by tools/build-products.js. Do not edit by hand. */\n' +
  'window.COOKIEBOY_PRODUCTS = ' + JSON.stringify(data, null, 2) + ';\n');
console.log('js/products.js written:', data.products.length, 'products');
