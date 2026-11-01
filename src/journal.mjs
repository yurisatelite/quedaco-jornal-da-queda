import {MODULE_ID,SECTION_LABELS,normalizeEdition,publicEdition} from './model.mjs';
import {e,multiline} from './escape.mjs';

const FOLDER_NAME='QUEDAÇO — Jornais dos Jogadores';
export function publicJournalHTML(edition){
  const issue=publicEdition(edition);if(!issue)throw Error('Cartões de encontro são exclusivos da pessoa Mestre.');
  const blocks=issue.blocks.map(block=>`<section><h2>${e(SECTION_LABELS[block.section])}</h2>${block.title?`<h3>${e(block.title)}</h3>`:''}<p>${multiline(block.body)}</p></section>`).join('');
  return `<article><h1>${e(issue.headline||issue.title)}</h1>${issue.subtitle?`<h2>${e(issue.subtitle)}</h2>`:''}${issue.image?`<p><img src="${e(issue.image)}" alt="" style="max-width:100%;height:auto"></p>`:''}<p><strong>${e(issue.region)}</strong>${issue.place?` · ${e(issue.place)}`:''}</p><p>${multiline(issue.summary)}</p><hr>${blocks}<hr><p><em>A verdade chega amassada, mas chega.</em></p></article>`;
}

export async function ensurePurchasedJournal(gameRef,edition,userIds=[]){
  if(!gameRef.user?.isGM)throw Error('Somente a pessoa Mestre pode entregar publicações.');
  const issue=normalizeEdition(edition),observer=globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER??2;
  if(issue.kind!=='newspaper'||issue.delivery!=='purchase')throw Error('Somente jornais podem ser comprados.');
  let folder=Array.from(gameRef.folders??[]).find(entry=>entry.type==='JournalEntry'&&entry.name===FOLDER_NAME);
  if(!folder)folder=await Folder.create({name:FOLDER_NAME,type:'JournalEntry'});
  let journal=Array.from(gameRef.journal??[]).find(entry=>entry.getFlag?.(MODULE_ID,'editionId')===issue.id&&entry.getFlag?.(MODULE_ID,'delivery')!=='show'&&entry.getFlag?.(MODULE_ID,'delivery')!=='grant'),ownership={default:0};
  for(const id of userIds.filter(Boolean))ownership[id]=observer;
  if(!journal){
    journal=await JournalEntry.create({name:`QUEDAÇO — ${issue.headline||issue.title}`,folder:folder.id,ownership,flags:{[MODULE_ID]:{editionId:issue.id,delivery:'purchase',publication:publicEdition(issue)}},pages:[{name:issue.title,type:'text',text:{content:publicJournalHTML(issue),format:1}}]});
  }else{
    // Preserve the snapshot already handed out. New buyers only add ownership.
    const changes={};for(const id of userIds.filter(Boolean))if((journal.ownership?.[id]??0)<observer)changes[`ownership.${id}`]=observer;
    if(Object.keys(changes).length)await journal.update(changes);
  }
  return journal;
}

export function accessiblePublications(gameRef=globalThis.game){
  const issues=[];
  for(const journal of gameRef?.journal??[]){
    if(!journal.testUserPermission?.(gameRef.user,'OBSERVER')||!journal.getFlag?.(MODULE_ID,'editionId'))continue;
    const snapshot=journal.getFlag(MODULE_ID,'publication');
    if(!snapshot||snapshot.kind==='encounter-card')continue;
    const safe=publicEdition(snapshot);if(safe)issues.push(safe);
  }
  return issues;
}

export async function deliverPublication(gameRef,edition,{userIds=[],actor=null}={}){
  if(!gameRef.user?.isGM)throw Error('Somente a pessoa Mestre pode entregar publicações.');
  const issue=normalizeEdition(edition);
  if(issue.kind==='encounter-card'||!['show','grant'].includes(issue.delivery))throw Error('Esta publicação não permite entrega.');
  const global=issue.delivery==='show'&&issue.visibility.mode==='players';
  if(!global&&issue.delivery!=='grant')throw Error('Escolha uma audiência para esta publicação.');
  const requested=issue.visibility.mode==='owners'?(actor?purchasingUsers(gameRef,actor,null):[]):userIds;
  const recipients=[...new Set(requested)].filter(id=>Array.from(gameRef.users??[]).some(user=>user.id===id&&!user.isGM));
  if(!global&&(!['users','owners'].includes(issue.visibility.mode)||!recipients.length))throw Error('Escolha os destinatários da publicação.');
  const folder=Array.from(gameRef.folders??[]).find(entry=>entry.type==='JournalEntry'&&entry.name===FOLDER_NAME)??await Folder.create({name:FOLDER_NAME,type:'JournalEntry'});
  const ownership={default:global?2:0};for(const id of recipients)ownership[id]=2;
  // Separate documents per audience: granting never widens a purchased Journal.
  return JournalEntry.create({name:`QUEDAÇO — ${issue.title}`,folder:folder.id,ownership,flags:{[MODULE_ID]:{editionId:issue.id,delivery:issue.delivery,publication:publicEdition(issue)}},pages:[{name:issue.title,type:'text',text:{content:publicJournalHTML(issue),format:1}}]});
}

export function purchasingUsers(gameRef,actor,requestingUserId){
  return Array.from(gameRef.users??[]).filter(user=>user.id===requestingUserId||actor.testUserPermission?.(user,'OWNER')).map(user=>user.id);
}
