import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEdition,publicEdition} from '../src/model.mjs';
import {civilianActors,wantedActors} from '../src/creation.mjs';
import {wantedPortraitHTML} from '../src/wanted.mjs';
import {publicJournalHTML} from '../src/journal.mjs';

const subject={kind:'wanted',wantedActorId:'actor-secret-id',wantedName:'Nália <Pedibarro>',wantedPortrait:'portraits/nalia.webp',wantedReward:'50 Pilas',wantedReason:'Levar uma caixa & fugir',wantedLastSeen:'Portão do Norte',gmNotes:'Segredo da investigação'};

test('cartaz guarda pessoa, retrato e informações sem depender da ficha',()=>{
  const issue=normalizeEdition(subject);
  for(const key of ['wantedActorId','wantedName','wantedPortrait','wantedReward','wantedReason','wantedLastSeen'])assert.equal(issue[key],subject[key]);
  assert.equal(normalizeEdition({}).wantedName,'');
});

test('versão pública tem o retrato escolhido mas não o Actor vinculado nem bastidores',()=>{
  const safe=publicEdition(subject);
  assert.equal(safe.wantedPortrait,subject.wantedPortrait);assert.equal(safe.wantedName,subject.wantedName);assert.equal(safe.wantedActorId,undefined);
  assert.doesNotMatch(JSON.stringify(safe),/actor-secret-id|Segredo da investigação/);
  assert.equal(publicEdition({...subject,kind:'newspaper'}).wantedPortrait,undefined);
});

test('cartaz e Journal entregue exibem alvo escapado, retrato e recompensa',()=>{
  const html=wantedPortraitHTML(subject);assert.match(html,/portraits\/nalia.webp/);assert.match(html,/Nália &lt;Pedibarro&gt;/);assert.match(html,/50 Pilas/);assert.match(html,/Portão do Norte/);
  const journal=publicJournalHTML(subject);assert.match(journal,/portraits\/nalia.webp/);assert.match(journal,/Recompensa/);assert.doesNotMatch(journal,/Segredo da investigação/);
  assert.match(wantedPortraitHTML({kind:'wanted',wantedName:'Nome sem ficha'}),/Nome sem ficha/);assert.match(wantedPortraitHTML({kind:'wanted'}),/Retrato a acrescentar/);
});

test('personagem de jogador pode ser procurado sem aparecer como vendedor',()=>{
  const gameRef={actors:[{id:'pc',name:'Aventureira',type:'character',hasPlayerOwner:true},{id:'civil',name:'Escriba',type:'character'},{id:'threat',name:'Ameaça',type:'npc'}]};
  assert.deepEqual(civilianActors(gameRef).map(actor=>actor.id),['civil']);assert.deepEqual(wantedActors(gameRef).map(actor=>actor.id),['pc','civil']);
});

test('seleção e navegação mantêm o alvo sem alterar escritor ou vendedor',async()=>{
  globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
  globalThis.game={user:{isGM:true},actors:[{id:'target',name:'Alvo',type:'character',img:'target.webp'}],journal:[]};
  const {NewspaperApp}=await import('../src/app.mjs');const app=new NewspaperApp();
  app.draft=normalizeEdition({kind:'wanted',writer:'Escriba',vendor:'Vendedor'});app.element={querySelector:()=>null};app.rerender=async()=>{};
  await app.handleClick({target:{closest:()=>({dataset:{action:'choose-wanted',id:'target'}})},preventDefault(){}});
  assert.equal(app.draft.wantedPortrait,'target.webp');assert.equal(app.draft.writer,'Escriba');assert.equal(app.draft.vendor,'Vendedor');
  app.wizardStep=2;assert.match(app.renderEditor(),/Quem está sendo procurado/);
  await app.handleClick({target:{closest:()=>({dataset:{action:'wizard-step',step:'4'}})},preventDefault(){}});
  assert.match(app.renderEditor(),/Retrato de Alvo/);
  await app.handleClick({target:{closest:()=>({dataset:{action:'clear-wanted'}})},preventDefault(){}});
  assert.equal(app.draft.wantedPortrait,'');assert.equal(app.draft.writer,'Escriba');
});
