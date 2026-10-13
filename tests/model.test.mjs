import test from 'node:test';
import assert from 'node:assert/strict';
import {EXAMPLE_EDITION,formatCurrency,normalizeEdition,publicEdition,visibleEditions} from '../src/model.mjs';

test('edição aceita uma a três páginas e normaliza blocos',()=>{assert.equal(normalizeEdition({pageCount:0}).pageCount,1);assert.equal(normalizeEdition({pageCount:9}).pageCount,3);assert.equal(normalizeEdition({blocks:[{page:8,section:'invalid',body:'x'}]}).blocks[0].page,3);});
test('jogadores nunca recebem metadados secretos',()=>{const issue=publicEdition(EXAMPLE_EDITION);assert.equal(issue.gmNotes,'');assert.ok(issue.blocks.every(block=>!Object.hasOwn(block,'secretTruth')&&!Object.hasOwn(block,'faction')));});
test('visibilidade separa rascunhos de edições públicas',()=>{const list=[normalizeEdition({id:'a',status:'draft'}),normalizeEdition({id:'b',status:'available'}),normalizeEdition({id:'c',status:'archived'})];assert.deepEqual(visibleEditions(list,false).map(x=>x.id),['b','c']);assert.equal(visibleEditions(list,true).length,3);});
test('moeda segue Trocado, Pila e Kurmac',()=>{assert.equal(formatCurrency(2),'T$ 2');assert.equal(formatCurrency(1234),'K$ 1 · P$ 23 · T$ 4');});
test('edição de exemplo tem duas páginas e conteúdo secreto',()=>{assert.equal(EXAMPLE_EDITION.pageCount,2);assert.equal(EXAMPLE_EDITION.headline,'A ESTRADA DO NORTE CAIU');assert.ok(EXAMPLE_EDITION.blocks.some(block=>block.secretTruth));});
test('modelos marcáveis preservam somente opções conhecidas',()=>{assert.deepEqual(normalizeEdition({features:['hot','wanted','inexistente']}).features,['hot','wanted']);});
