import {MODULE_ID,SAMPLE_EDITIONS,normalizeCollection,normalizeEdition,globalPublicationIndex} from './model.mjs';

import {accessiblePublications} from './journal.mjs';

let cache=[];
let privateStore=null;
const ARCHIVE_FOLDER='QUEDAÇO — Jornal da Queda';

async function ensureArchiveFolder(gameRef){
  let folder=Array.from(gameRef.folders??[]).find(entry=>entry.type==='JournalEntry'&&entry.name===ARCHIVE_FOLDER);
  if(!folder)folder=await Folder.create({name:ARCHIVE_FOLDER,type:'JournalEntry',sorting:'a'});
  return folder;
}

export function registerSettings(gameRef=game){
  gameRef.settings.register(MODULE_ID,'publicEditions',{name:'Edições públicas do Jornal da Queda',scope:'world',config:false,type:Object,default:{schemaVersion:1,editions:[]}});
}
export async function initializeStore(gameRef=game){
  if(gameRef.user?.isGM){
    const folder=await ensureArchiveFolder(gameRef);
    privateStore=Array.from(gameRef.journal??[]).find(entry=>entry.getFlag?.(MODULE_ID,'privateStore'))??null;
    if(!privateStore)privateStore=await JournalEntry.create({name:'QUEDAÇO — Arquivo da Mestra',folder:folder.id,ownership:{default:0},flags:{[MODULE_ID]:{privateStore:true,editions:SAMPLE_EDITIONS}}});
    else if(privateStore.folder?.id!==folder.id&&privateStore.folder!==folder.id)await privateStore.update({folder:folder.id});
    cache=normalizeCollection({editions:privateStore.getFlag(MODULE_ID,'editions')??SAMPLE_EDITIONS}).editions;
    await gameRef.settings.set(MODULE_ID,'publicEditions',{schemaVersion:1,editions:globalPublicationIndex(cache)});
  }else cache=normalizeCollection(gameRef.settings.get(MODULE_ID,'publicEditions')).editions;
  return cache;
}
export function refreshPublicEditions(value,gameRef=game){if(!gameRef.user?.isGM)cache=normalizeCollection(value).editions;return cache;}
export function loadEditions(gameRef=globalThis.game){
  if(gameRef?.user?.isGM)return cache;
  const visible=globalPublicationIndex(cache);
  const merged=new Map(visible.map(issue=>[issue.id,issue]));
  for(const issue of accessiblePublications(gameRef))merged.set(issue.id,issue);
  return [...merged.values()];
}
export async function saveEditions(editions,gameRef=game){
  if(!gameRef.user?.isGM)throw Error('Somente a pessoa Mestre pode alterar as edições.');
  if(!privateStore)await initializeStore(gameRef);
  const value=normalizeCollection({editions});
  await privateStore.setFlag(MODULE_ID,'editions',value.editions);
  await gameRef.settings.set(MODULE_ID,'publicEditions',{schemaVersion:1,editions:globalPublicationIndex(value.editions)});
  cache=value.editions;
  return cache;
}
export async function upsertEdition(edition,gameRef=game){
  const value=normalizeEdition(edition),editions=[...loadEditions(gameRef)],index=editions.findIndex(item=>item.id===value.id);
  if(index<0)editions.unshift(value);else editions[index]=value;
  return saveEditions(editions,gameRef);
}
export async function removeEdition(id,gameRef=game){return saveEditions(loadEditions(gameRef).filter(item=>item.id!==id),gameRef);}
