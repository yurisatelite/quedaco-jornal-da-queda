import {MODULE_ID,SECTION_LABELS,normalizeEdition,publicEdition} from './model.mjs';
import {e,multiline} from './escape.mjs';

const FOLDER_NAME='QUEDAÇO — Jornais dos Jogadores';
export function publicJournalHTML(edition){
  const issue=publicEdition(edition),blocks=issue.blocks.map(block=>`<section><h2>${e(SECTION_LABELS[block.section])}</h2>${block.title?`<h3>${e(block.title)}</h3>`:''}<p>${multiline(block.body)}</p></section>`).join('');
  return `<article><h1>${e(issue.headline||issue.title)}</h1>${issue.subtitle?`<h2>${e(issue.subtitle)}</h2>`:''}${issue.image?`<p><img src="${e(issue.image)}" alt="" style="max-width:100%;height:auto"></p>`:''}<p><strong>${e(issue.region)}</strong>${issue.place?` · ${e(issue.place)}`:''}</p><p>${multiline(issue.summary)}</p><hr>${blocks}<hr><p><em>A verdade chega amassada, mas chega.</em></p></article>`;
}

export async function ensurePurchasedJournal(gameRef,edition,userIds=[]){
  const issue=normalizeEdition(edition),observer=globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER??2;
  let folder=Array.from(gameRef.folders??[]).find(entry=>entry.type==='JournalEntry'&&entry.name===FOLDER_NAME);
  if(!folder)folder=await Folder.create({name:FOLDER_NAME,type:'JournalEntry'});
  let journal=Array.from(gameRef.journal??[]).find(entry=>entry.getFlag?.(MODULE_ID,'editionId')===issue.id),ownership={default:0};
  for(const id of userIds.filter(Boolean))ownership[id]=observer;
  if(!journal){
    journal=await JournalEntry.create({name:`QUEDAÇO — ${issue.headline||issue.title}`,folder:folder.id,ownership,flags:{[MODULE_ID]:{editionId:issue.id}},pages:[{name:issue.title,type:'text',text:{content:publicJournalHTML(issue),format:1}}]});
  }else{
    ownership={...(journal.ownership??{}),...ownership};await journal.update({name:`QUEDAÇO — ${issue.headline||issue.title}`,folder:folder.id,ownership});
    const page=journal.pages?.contents?.[0];if(page)await page.update({name:issue.title,'text.content':publicJournalHTML(issue)});
  }
  return journal;
}

export function purchasingUsers(gameRef,actor,requestingUserId){
  return Array.from(gameRef.users??[]).filter(user=>user.id===requestingUserId||actor.testUserPermission?.(user,'OWNER')).map(user=>user.id);
}
