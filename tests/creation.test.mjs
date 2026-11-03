import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {civilianActors,publicationTemplate,composePublication,defaultRegionImage} from '../src/creation.mjs';
import {PUBLICATION_KINDS} from '../src/publication-policy.mjs';
import {calendarAPI,calendarDays,registerCalendarPurchase,narrativeDate} from '../src/calendar-bridge.mjs';

test('galeria só admite habitantes, sem ameaças, monstros ou jogadores',()=>{
  const actors=[{id:'civil',name:'Nália',type:'character',flags:{quedaco:{npc:{regionId:'norvak'}}}},{id:'ameaca',name:'Gigante',type:'npc'},{id:'pc',name:'Heroína',type:'character',hasPlayerOwner:true},{id:'m',name:'Monstro',type:'character',flags:{quedaco:{monster:{}}}}];
  assert.deepEqual(civilianActors({actors}).map(actor=>actor.id),['civil']);
});
for(const kind of Object.keys(PUBLICATION_KINDS))test(`modelo preenchido privado de ${kind}`,()=>{
  const model=publicationTemplate(kind,{regionId:'norvak',region:'Norvak'});
  assert.equal(model.kind,kind);assert.equal(model.delivery,'private');assert.equal(model.visibility.mode,'gm');assert.ok(model.blocks.every(block=>block.title&&block.body));assert.ok(model.image.endsWith('norvak.svg'));
});
test('montador organiza o pedido sem publicar nem copiar texto para a versão dos jogadores',()=>{
  const issue=composePublication('Manchete: A ponte caiu\n\nA travessia está fechada.',{kind:'field-report'});
  assert.equal(issue.headline,'A ponte caiu');assert.match(issue.summary,/travessia/);assert.equal(issue.playerBlocks.length,0);assert.equal(issue.delivery,'private');assert.throws(()=>composePublication(''),/Conte/);
});
test('cada capa padrão resolve para um arquivo existente',async()=>{
  const {REGIONS}=await import('../src/geography.mjs');
  for(const id of [...REGIONS.map(region=>region.id),'desconhecida']){
    const path=defaultRegionImage(id).replace('modules/quedaco-jornal-da-queda/','');
    assert.match(await readFile(new URL(`../${path}`,import.meta.url),'utf8'),/<svg/);
  }
});
test('seletor de dias consulta a API real sem alterar tempo de campanha',()=>{
  const current={year:2,cycle:1,day:1,cycleName:'Fogo',absoluteDay:480};
  const api={family:'quedaco',contractVersion:1,capabilities:{calendar:true},getCurrentDate:()=>current,dateToWorldTime:date=>(480+date.day-1)*86400,worldTimeToDate:time=>({...current,day:time/86400-479,absoluteDay:time/86400})};
  const game={modules:new Map([['quedaco-calendario',{active:true,api}]])};
  assert.equal(calendarAPI(game),api);assert.equal(calendarDays(game).length,15);assert.equal(calendarDays(game)[14].day,15);assert.match(narrativeDate(current),/Fogo/);assert.equal(calendarAPI({}),null);
});
test('compra vincula Journal ao dia comprado e só aos destinatários',async()=>{
  let args;
  const api={family:'quedaco',contractVersion:1,capabilities:{calendar:true},getCurrentDate:()=>({absoluteDay:10}),linkJournalToDay:async(...value)=>{args=value;return 'JournalEntryPage.event';}};
  const game={modules:new Map([['quedaco-calendario',{active:true,api}]])};
  const receipt={date:{absoluteDay:35,day:6,cycleName:'Vida',year:0},timelineId:'ramo',userIds:['p1']};
  const result=await registerCalendarPurchase(game,{uuid:'JournalEntry.jornal',name:'Gazeta'},receipt);
  assert.equal(result.registered,true);assert.equal(args[0],'JournalEntry.jornal');assert.equal(args[1].absoluteDay,35);assert.equal(args[1].timelineId,'ramo');assert.deepEqual(args[1].sharedWith,['p1']);assert.equal(args[1].visibility,'shared');
  assert.equal((await registerCalendarPurchase({}, {},{date:null})).registered,false);
});

test('todas as etapas do criador e formatos renderizam com dados falsos',async()=>{
  globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};globalThis.game={user:{isGM:true},actors:[],users:[]};
  const {NewspaperApp}=await import('../src/app.mjs');const app=new NewspaperApp();
  for(const kind of Object.keys(PUBLICATION_KINDS)){
    app.draft=publicationTemplate(kind);app.selected=()=>null;
    for(let step=0;step<6;step++){app.wizardStep=step;const html=app.renderEditor();assert.match(html,/qd-wizard-nav/);assert.match(html,/Salvar rascunho/);}
    assert.match(app.renderPage(app.draft,1),/article/);
  }
});

test('avançar etapas preserva campos fora da tela, bastidores e escolhas dos jogadores',async()=>{
  globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};globalThis.game={user:{isGM:true},actors:[],users:[]};
  const {NewspaperApp}=await import('../src/app.mjs');const app=new NewspaperApp();
  app.draft=publicationTemplate('newspaper',{region:'Norvak',regionId:'norvak',writerId:'w',vendorId:'v'});
  app.draft.blocks[0].secretTruth='Segredo';app.draft.blocks[0].faction='Facção';app.draft.playerBlocks=[app.draft.blocks[0]];
  const Original=globalThis.FormData;
  globalThis.FormData=class{constructor(form){this.values=form.values;}entries(){return this.values[Symbol.iterator]();}has(name){return this.values.some(([key])=>key===name);}get(name){return this.values.find(([key])=>key===name)?.[1]??null;}getAll(name){return this.values.filter(([key])=>key===name).map(([,value])=>value);}};
  try{
    let result=app.editionFromForm({dataset:{step:'1'},values:[['title','Outro título'],['place','']]});
    assert.equal(result.regionId,'norvak');assert.equal(result.vendorId,'v');assert.equal(result.blocks[0].secretTruth,'Segredo');assert.equal(result.playerBlocks.length,1);
    result=app.editionFromForm({dataset:{step:'3'},values:[['block.0.id',app.draft.blocks[0].id],['block.0.title','Editado'],['block.0.body','Texto seguro'],['block.0.page','1'],['playerBlock','0']]});
    assert.equal(result.blocks[0].faction,'Facção');assert.equal(result.blocks[0].secretTruth,'Segredo');assert.equal(result.playerBlocks[0].body,'Texto seguro');assert.equal(result.playerBlocks[0].secretTruth,undefined);
  }finally{globalThis.FormData=Original;}
});
