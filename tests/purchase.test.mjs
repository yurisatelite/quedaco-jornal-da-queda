import test from 'node:test';
import assert from 'node:assert/strict';
import {wallet,walletTotal,purchaseEdition} from '../src/purchase.mjs';
import {EXAMPLE_EDITION} from '../src/model.mjs';

test('carteira converte a economia do Skyfall sem perder trocados',()=>{assert.deepEqual(wallet(1234),{k:1,p:23,t:4});assert.equal(walletTotal({k:1,p:23,t:4}),1234);});
test('compra desconta e cria um loot vinculado à edição',async()=>{const actor={type:'character',isOwner:true,system:{currency:{t:5,p:0,k:0}},async update(change){this.system.currency=change['system.currency'];},async createEmbeddedDocuments(type,sources){this.created={type,sources};return sources;}};const result=await purchaseEdition(actor,EXAMPLE_EDITION);assert.equal(result.remaining,3);assert.equal(actor.created.type,'Item');assert.equal(actor.created.sources[0].type,'loot');assert.equal(actor.created.sources[0].flags['quedaco-jornal-da-queda'].editionId,EXAMPLE_EDITION.id);});
test('falha ao criar o item devolve o dinheiro',async()=>{const actor={type:'character',isOwner:true,system:{currency:{t:5}},async update(change){this.system.currency=change['system.currency'];},async createEmbeddedDocuments(){throw Error('falhou');}};await assert.rejects(purchaseEdition(actor,EXAMPLE_EDITION),/falhou/);assert.deepEqual(actor.system.currency,{k:0,p:0,t:5});});
