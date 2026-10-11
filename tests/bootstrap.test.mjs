import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=async path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
test('módulo registra configuração, API e entrada lateral',async()=>{const [main,sidebar,module]=await Promise.all([source('src/main.mjs'),source('src/sidebar.mjs'),source('module.json')]);assert.match(main,/registerSettings/);assert.match(main,/module\.api=\{open:openNewspaper\}/);assert.match(main,/renderSidebar/);assert.match(sidebar,/fa-newspaper/);assert.match(sidebar,/addEventListener\('click'/);assert.equal(JSON.parse(module).id,'quedaco-jornal-da-queda');});
test('interface expõe editor do mestre e compra',async()=>{const app=await source('src/app.mjs');assert.match(app,/game\.user\.isGM/);assert.match(app,/purchaseEdition/);assert.match(app,/Notas exclusivas da pessoa Mestre/);assert.match(app,/pageCount/);});
