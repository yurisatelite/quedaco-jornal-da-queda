import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
globalThis.game={user:{isGM:true},actors:[]};
const {NewspaperApp}=await import('../src/app.mjs');

test('controles nativos de fechar, minimizar e opções não provocam nova renderização',async()=>{
  const app=new NewspaperApp();
  app.rerender=()=>assert.fail('O cabeçalho nativo não deve renderizar o Jornal.');
  for(const action of ['close','minimize','toggleControls']){
    const target={dataset:{action}};
    await app.handleClick({target:{closest:selector=>selector==='.qd-shell [data-action]'?null:target},preventDefault:()=>assert.fail('O clique nativo deve seguir para o Foundry.')});
  }
});

test('fechar pelo conteúdo fecha uma vez sem renderizar novamente',async()=>{
  const app=new NewspaperApp();let closed=0;
  app.close=async()=>{closed++;};
  app.rerender=()=>assert.fail('Fechar não deve abrir novamente a janela.');
  await app.handleClick({target:{closest:()=>({dataset:{action:'close-app'}})},preventDefault(){}});
  assert.equal(closed,1);
});

test('seleção de edição preserva a ação e limpa o rascunho',async()=>{
  const app=new NewspaperApp();let renders=0;
  app.mode='edit';app.draft={id:'rascunho'};app.rerender=async()=>{renders++;};
  await app.handleClick({target:{closest:()=>({dataset:{action:'select',id:'outra-edicao'}})},preventDefault(){}});
  assert.equal(app.selectedId,'outra-edicao');assert.equal(app.mode,'read');assert.equal(app.draft,null);assert.equal(renders,1);
});
