import test from 'node:test';
import assert from 'node:assert/strict';
import {MODULE_ID} from '../src/model.mjs';
import {initializeStore,loadEditions,refreshPublicEditions,registerSettings,saveEditions} from '../src/store.mjs';

test('persistência não publica concessões individuais e recarga respeita Observer',async()=>{
  const privateIssue={id:'segredo',kind:'field-report',title:'Relatório secreto',delivery:'grant',visibility:{mode:'users',userIds:['p1']},playerSummary:'Resumo liberado'};
  const publicIssue={id:'edital',kind:'bulletin',title:'Aviso público',delivery:'show',visibility:{mode:'players'},playerSummary:'Informação pública'};
  let editions=[privateIssue,publicIssue],published;
  const folder={id:'f',name:'QUEDAÇO — Jornal da Queda',type:'JournalEntry'};
  const archive={folder:'f',getFlag:(_module,key)=>key==='privateStore'?true:editions,setFlag:async(_module,_key,value)=>{editions=value;}};
  const gm={id:'gm',isGM:true};
  const game={user:gm,journal:[archive],folders:[folder],settings:{register:(_module,_key,definition)=>assert.deepEqual(definition.default.editions,[]),set:async(_module,_key,value)=>{published=value;},get:()=>published}};
  registerSettings(game);await initializeStore(game);
  assert.deepEqual(published.editions.map(issue=>issue.id),['edital']);
  assert.doesNotMatch(JSON.stringify(published),/segredo|Relatório secreto|p1/);
  await saveEditions([...editions,{id:'rascunho',status:'available'}],game);
  assert.equal(editions.length,3);assert.equal(published.editions.length,1);
  const safeJournal={getFlag:(module,key)=>module!==MODULE_ID?undefined:key==='editionId'?'segredo':key==='publication'?{...privateIssue,playerBlocks:[]}:undefined,testUserPermission:user=>user.id==='p1'};
  const playerGame={...game,user:{id:'p1'},journal:[safeJournal]};
  await initializeStore(playerGame);
  assert.deepEqual(loadEditions(playerGame).map(issue=>issue.id),['edital','segredo']);
  assert.equal(loadEditions(playerGame).find(issue=>issue.id==='segredo').summary,'Resumo liberado');
  assert.deepEqual(loadEditions({...playerGame,user:{id:'p2'}}).map(issue=>issue.id),['edital']);
  refreshPublicEditions({editions:[]},playerGame);
  assert.deepEqual(loadEditions(playerGame).map(issue=>issue.id),['segredo']);
  await assert.rejects(saveEditions([],playerGame),/Somente/);
});
