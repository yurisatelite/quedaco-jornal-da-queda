import {EXAMPLE_EDITION,MODULE_ID,normalizeCollection,normalizeEdition} from './model.mjs';

export function registerSettings(gameRef=game){
  gameRef.settings.register(MODULE_ID,'editions',{name:'Edições do Jornal da Queda',scope:'world',config:false,type:Object,default:{schemaVersion:1,editions:[EXAMPLE_EDITION]}});
}
export function loadEditions(gameRef=game){return normalizeCollection(gameRef.settings.get(MODULE_ID,'editions')).editions;}
export async function saveEditions(editions,gameRef=game){
  if(!gameRef.user?.isGM)throw Error('Somente a pessoa Mestre pode alterar as edições.');
  const value=normalizeCollection({editions});await gameRef.settings.set(MODULE_ID,'editions',value);return value.editions;
}
export async function upsertEdition(edition,gameRef=game){
  const value=normalizeEdition(edition),editions=loadEditions(gameRef),index=editions.findIndex(item=>item.id===value.id);
  if(index<0)editions.unshift(value);else editions[index]=value;
  return saveEditions(editions,gameRef);
}
export async function removeEdition(id,gameRef=game){return saveEditions(loadEditions(gameRef).filter(item=>item.id!==id),gameRef);}
