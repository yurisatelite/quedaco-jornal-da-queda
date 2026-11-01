import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLICATION_KINDS,normalizeEdition,publicEdition,globalPublicationIndex,publicationAccess} from '../src/model.mjs';
import {accessiblePublications,deliverPublication,ensurePurchasedJournal} from '../src/journal.mjs';
import {purchaseEdition} from '../src/purchase.mjs';

const player={id:'p1',isGM:false},other={id:'p2',isGM:false},gm={id:'gm',isGM:true};
for(const kind of Object.keys(PUBLICATION_KINDS))test(`normalização e proteção do tipo ${kind}`,()=>{
  const issue=normalizeEdition({kind,status:'available',summary:'SEGREDO',gmNotes:'NOTAS',playerSummary:'Resumo autorizado',blocks:[{body:'RASCUNHO'}],playerBlocks:[{body:'Seguro',secretTruth:'OCULTO'}]});
  assert.equal(issue.kind,kind);assert.equal(issue.delivery,'private');assert.equal(issue.visibility.mode,'gm');
  assert.equal(publicationAccess(issue,player).list,false);
  const copy=publicEdition(issue);
  if(kind==='encounter-card'){assert.equal(copy,null);return;}
  assert.doesNotMatch(JSON.stringify(copy),/NOTAS|OCULTO/);
  if(kind!=='newspaper'){
    assert.equal(copy.summary,'Resumo autorizado');assert.equal(copy.blocks[0].body,'Seguro');
    assert.doesNotMatch(JSON.stringify(copy),/SEGREDO|RASCUNHO/);
  }
});

test('dados antigos normalizam sem mutação e status não concede permissão',()=>{
  const old={id:'antiga',status:'available',summary:'Texto',blocks:[]},before=structuredClone(old);
  const issue=normalizeEdition(old);
  assert.deepEqual(old,before);assert.equal(issue.kind,'newspaper');assert.equal(issue.delivery,'purchase');assert.equal(issue.visibility.mode,'gm');
  assert.equal(globalPublicationIndex([old]).length,0);
  assert.equal(normalizeEdition({status:'archived'}).delivery,'private');
});

test('valores inválidos e compras não autorizadas falham de forma privada',()=>{
  const issue=normalizeEdition({kind:'errado',delivery:'errada',visibility:{mode:'errada',userIds:'p1'}});
  assert.equal(issue.kind,'newspaper');assert.equal(issue.delivery,'private');assert.deepEqual(issue.visibility,{mode:'gm',userIds:[]});
  for(const kind of Object.keys(PUBLICATION_KINDS).filter(kind=>kind!=='newspaper'))assert.equal(normalizeEdition({kind,delivery:'purchase'}).delivery,'private');
});

test('índice global exclui títulos, IDs e destinatários de concessões privadas',()=>{
  const rows=[
    {id:'publica',kind:'bulletin',delivery:'show',visibility:{mode:'players'},status:'archived'},
    {id:'dossie-secreto',title:'TÍTULO OCULTO',kind:'field-report',delivery:'grant',visibility:{mode:'users',userIds:['p1']}},
    {id:'privada',status:'available'},
    {id:'encontro',kind:'encounter-card',delivery:'show',visibility:{mode:'players'}}
  ];
  const index=globalPublicationIndex(rows);assert.deepEqual(index.map(row=>row.id),['publica']);
  assert.doesNotMatch(JSON.stringify(index),/dossie-secreto|TÍTULO OCULTO|p1|encontro/);
});

test('links e campos desconhecidos não vazam para a cópia pública',()=>{
  const safe=publicEdition({kind:'field-report',links:[{kind:'actor',uuid:'Actor.oculto',label:'TÁTICAS'}],visibility:{mode:'users',userIds:['ID-PRIVADO']},secretExtra:'EXTRA'});
  assert.doesNotMatch(JSON.stringify(safe),/Actor.oculto|TÁTICAS|ID-PRIVADO|EXTRA/);
});

test('autorizações distinguem GM, jogador, concessão efetiva e venda',()=>{
  const issue=normalizeEdition({kind:'mission-brief',delivery:'grant',visibility:{mode:'users',userIds:['p1']}});
  assert.equal(publicationAccess(issue,gm).read,true);
  // Being named is not sufficient until an Observer Journal exists.
  assert.equal(publicationAccess(issue,player).read,false);
  assert.equal(publicationAccess(issue,player,{journalObserver:true}).read,true);
  assert.equal(publicationAccess(issue,other).list,false);
  const sold=normalizeEdition({kind:'newspaper',delivery:'purchase',visibility:{mode:'players'},status:'available',availability:1});
  assert.equal(publicationAccess(sold,player).buy,true);assert.equal(publicationAccess(sold,player).read,false);
  assert.equal(publicationAccess({...sold,status:'archived'},player).buy,false);
  assert.equal(publicationAccess({...sold,kind:'encounter-card'},player,{journalObserver:true}).read,false);
});

test('lista individual usa Observer e reflete revogação sem um índice global',()=>{
  let allowed=true;
  const snapshot=normalizeEdition({id:'missao',kind:'mission-brief',delivery:'grant',playerSummary:'Objetivo seguro'});
  const journal={testUserPermission:user=>allowed&&user.id==='p1',getFlag:(_module,key)=>key==='editionId'?'missao':snapshot};
  const game={user:player,journal:[journal]};
  assert.equal(accessiblePublications(game)[0].summary,'Objetivo seguro');
  assert.equal(accessiblePublications({...game,user:other}).length,0);
  allowed=false;assert.equal(accessiblePublications(game).length,0);
});

test('entrega a usuários cria apenas snapshot seguro e não modifica outro Journal',async()=>{
  let created;
  globalThis.JournalEntry={create:async source=>{created=source;return source;}};
  const game={user:gm,users:[gm,player,other],folders:[{id:'f',type:'JournalEntry',name:'QUEDAÇO — Jornais dos Jogadores'}],journal:[{update:()=>assert.fail('Não alterar outro Journal.')} ]};
  const issue={id:'privada',title:'Relatório',kind:'field-report',delivery:'grant',visibility:{mode:'users',userIds:['p1']},summary:'Segredo',playerSummary:'Texto seguro'};
  await deliverPublication(game,issue,{userIds:['p1']});
  assert.deepEqual(created.ownership,{default:0,p1:2});assert.doesNotMatch(JSON.stringify(created),/Segredo/);
  await assert.rejects(deliverPublication({...game,user:player},issue,{userIds:['p1']}),/Somente/);
  await assert.rejects(deliverPublication(game,{...issue,kind:'encounter-card'},{userIds:['p1']}),/não permite/);
});

test('somente jornal autorizado pode descontar dinheiro e criar loot',async()=>{
  const game={user:gm,users:new Map([['p1',player]])};
  const actor={type:'character',testUserPermission:()=>true,update:()=>assert.fail('Não descontar dinheiro.'),createEmbeddedDocuments:()=>assert.fail('Não criar Item.')};
  for(const kind of Object.keys(PUBLICATION_KINDS).filter(kind=>kind!=='newspaper'))await assert.rejects(purchaseEdition(actor,{kind,delivery:'purchase',status:'available'},{gameRef:game,buyerUserId:'p1'}),/venda/);
  await assert.rejects(purchaseEdition(actor,{kind:'newspaper',delivery:'purchase',status:'available',availability:1,visibility:{mode:'gm'}},{gameRef:game,buyerUserId:'p1'}),/venda/);
});

test('compras preservam a edição entregue e permissões de outro Journal',async()=>{
  const untouched={getFlag:(_m,key)=>key==='editionId'?'outra':null,update:()=>assert.fail('Não modificar outra publicação.')};
  let updates=[];
  const existing={ownership:{default:0,p1:2},getFlag:(_m,key)=>key==='editionId'?'jornal':key==='delivery'?'purchase':null,update:async change=>updates.push(change),pages:{contents:[{update:()=>assert.fail('Snapshot entregue é imutável.')}]}};
  const game={user:gm,journal:[untouched,existing],folders:[{id:'f',type:'JournalEntry',name:'QUEDAÇO — Jornais dos Jogadores'}]};
  await ensurePurchasedJournal(game,{id:'jornal',kind:'newspaper',delivery:'purchase'},['p1','p2']);
  assert.deepEqual(updates,[{'ownership.p2':2}]);
});

test('entrega global e por donos respeita audiências distintas',async()=>{
  const sources=[];globalThis.JournalEntry={create:async source=>{sources.push(source);return source;}};
  const game={user:gm,users:[gm,player,other],folders:[{id:'f',type:'JournalEntry',name:'QUEDAÇO — Jornais dos Jogadores'}]};
  await deliverPublication(game,{kind:'bulletin',delivery:'show',visibility:{mode:'players'},playerSummary:'Aviso seguro'});
  assert.deepEqual(sources[0].ownership,{default:2});
  await deliverPublication(game,{kind:'mission-brief',delivery:'grant',visibility:{mode:'owners'},playerSummary:'Missão segura'},{actor:{testUserPermission:user=>user.id==='p1'}});
  assert.deepEqual(sources[1].ownership,{default:0,p1:2});
  await assert.rejects(deliverPublication(game,{kind:'mission-brief',delivery:'grant',visibility:{mode:'owners'}}),/destinatários/);
});
