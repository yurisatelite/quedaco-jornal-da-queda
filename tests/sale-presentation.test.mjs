import test from 'node:test';
import assert from 'node:assert/strict';
import {registerPurchaseSocket} from '../src/socket.mjs';
import {refreshPublicEditions} from '../src/store.mjs';

test('apresentação usa retrato autorizado, modal e moeda correta sem dados enviados no socket',async()=>{
  let listener,prompt;
  globalThis.ui={notifications:{error:message=>assert.fail(message),warn:()=>{}}};
  globalThis.foundry={applications:{api:{DialogV2:{prompt:async options=>{prompt=options;return null;}}}}};
  const gameRef={user:{id:'p1',isGM:false},actors:[{id:'hero',name:'Heroína',type:'character',isOwner:true}],socket:{on:(_channel,callback)=>{listener=callback;}}};
  registerPurchaseSocket(gameRef);
  for(const [price,coin] of [[1,'is-silver'],[10,'is-gold']]){
    const issue={id:`j${price}`,kind:'newspaper',delivery:'purchase',visibility:{mode:'players'},status:'available',availability:5,price,vendor:'Nália',vendorPortrait:'icons/svg/mystery-man.svg',headline:'Notícias locais'};
    refreshPublicEditions({editions:[issue]},gameRef);
    await listener({type:'offer',editionId:issue.id,edition:{vendor:'INJETADO'}});
    assert.equal(prompt.modal,true);assert.match(prompt.content,/qd-sale-portrait/);assert.match(prompt.content,new RegExp(coin));assert.match(prompt.ok.label,/Comprar exemplar/);assert.doesNotMatch(prompt.content,/INJETADO/);
  }
});
