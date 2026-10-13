import {EXAMPLE_EDITION,MODULE_ID,normalizeCollection,normalizeEdition,publicEdition} from './model.mjs';

let cache=[];
let privateStore=null;
const ARCHIVE_FOLDER='QUEDAÇO — Jornal da Queda';

async function ensureArchiveFolder(gameRef){
  let folder=Array.from(gameRef.folders??[]).find(entry=>entry.type==='JournalEntry'&&entry.name===ARCHIVE_FOLDER);
  if(!folder)folder=await Folder.create({name:ARCHIVE_FOLDER,type:'JournalEntry',sorting:'a'});
  return folder;
}

export function registerSettings(gameRef=game){
  gameRef.settings.register(MODULE_ID,'publicEditions',{name:'Edições públicas do Jornal da Queda',scope:'world',config:false,type:Object,default:{schemaVersion:1,editions:[publicEdition(EXAMPLE_EDITION)]}});
}
export async function initializeStore(gameRef=game){
  if(gameRef.user?.isGM){
    const folder=await ensureArchiveFolder(gameRef);
    privateStore=Array.from(gameRef.journal??[]).find(entry=>entry.getFlag?.(MODULE_ID,'privateStore'))??null;
    if(!privateStore)privateStore=await JournalEntry.create({name:'QUEDAÇO — Arquivo da Mestra',folder:folder.id,ownership:{default:0},flags:{[MODULE_ID]:{privateStore:true,editions:[EXAMPLE_EDITION]}}});
    else if(privateStore.folder?.id!==folder.id&&privateStore.folder!==folder.id)await privateStore.update({folder:folder.id});
    cache=normalizeCollection({editions:privateStore.getFlag(MODULE_ID,'editions')??[EXAMPLE_EDITION]}).editions;
    await gameRef.settings.set(MODULE_ID,'publicEditions',{schemaVersion:1,editions:cache.filter(issue=>['available','archived'].includes(issue.status)).map(publicEdition)});
  }else cache=normalizeCollection(gameRef.settings.get(MODULE_ID,'publicEditions')).editions;
  return cache;
}
export function refreshPublicEditions(value,gameRef=game){if(!gameRef.user?.isGM)cache=normalizeCollection(value).editions;return cache;}
export function loadEditions(){return cache;}
export async function saveEditions(editions,gameRef=game){
  if(!gameRef.user?.isGM)throw Error('Somente a pessoa Mestre pode alterar as edições.');
  const value=normalizeCollection({editions});cache=value.editions;
  if(!privateStore)await initializeStore(gameRef);
  await privateStore.setFlag(MODULE_ID,'editions',cache);
  await gameRef.settings.set(MODULE_ID,'publicEditions',{schemaVersion:1,editions:cache.filter(issue=>['available','archived'].includes(issue.status)).map(publicEdition)});
  return cache;
}
export async function upsertEdition(edition,gameRef=game){
  const value=normalizeEdition(edition),editions=loadEditions(),index=editions.findIndex(item=>item.id===value.id);
  if(index<0)editions.unshift(value);else editions[index]=value;
  return saveEditions(editions,gameRef);
}
export async function removeEdition(id,gameRef=game){return saveEditions(loadEditions().filter(item=>item.id!==id),gameRef);}
