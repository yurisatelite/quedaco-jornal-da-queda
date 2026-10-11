import {MODULE_ID,formatCurrency,normalizeEdition} from './model.mjs';

export const walletTotal=({k=0,p=0,t=0}={})=>Number(k||0)*1000+Number(p||0)*10+Number(t||0);
export function wallet(total){const value=Math.max(0,Math.trunc(Number(total)||0));return {k:Math.floor(value/1000),p:Math.floor(value%1000/10),t:value%10};}
export function ownedCharacters(gameRef=game){return Array.from(gameRef.actors??[]).filter(actor=>actor.type==='character'&&actor.isOwner);}

export async function purchaseEdition(actor,edition){
  const issue=normalizeEdition(edition);if(issue.status!=='available')throw Error('Esta edição não está disponível para compra.');
  if(!actor?.isOwner||actor.type!=='character')throw Error('Escolha uma personagem que você possa controlar.');
  const current=walletTotal(actor.system?.currency),price=issue.price;if(current<price)throw Error(`Faltam ${formatCurrency(price-current)} para comprar esta edição.`);
  await actor.update({'system.currency':wallet(current-price)});
  const source={name:`QUEDAÇO — ${issue.headline||issue.title}`,type:'loot',img:'icons/sundries/documents/document-torn-diagram-tan.webp',system:{description:{value:`<p><strong>${issue.title}</strong> · ${issue.region||'Edição regional'}</p><p>${issue.summary}</p><p>Abra o Jornal da Queda pela barra lateral para ler a edição diagramada.</p>`},unidentified:{value:false,name:'',description:''},descriptors:[],quantity:1,price,capacity:0,type:''},flags:{[MODULE_ID]:{editionId:issue.id}}};
  try{const [item]=await actor.createEmbeddedDocuments('Item',[source]);return {item,remaining:current-price};}
  catch(error){await actor.update({'system.currency':wallet(current)});throw error;}
}
