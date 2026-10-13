import {MODULE_ID,formatCurrency,normalizeEdition} from './model.mjs';
import {ensurePurchasedJournal,purchasingUsers} from './journal.mjs';

export const walletTotal=({k=0,p=0,t=0}={})=>Number(k||0)*1000+Number(p||0)*10+Number(t||0);
export function wallet(total){const value=Math.max(0,Math.trunc(Number(total)||0));return {k:Math.floor(value/1000),p:Math.floor(value%1000/10),t:value%10};}
export function ownedCharacters(gameRef=game){return Array.from(gameRef.actors??[]).filter(actor=>actor.type==='character'&&actor.isOwner);}

export async function purchaseEdition(actor,edition,{gameRef=game,buyerUserId=gameRef.user?.id,journalGrant=ensurePurchasedJournal}={}){
  const issue=normalizeEdition(edition);if(issue.status!=='available')throw Error('Esta edição não está disponível para compra.');
  const buyer=gameRef.users?.get?.(buyerUserId)??gameRef.user,allowed=actor?.testUserPermission?actor.testUserPermission(buyer,'OWNER'):Boolean(actor?.isOwner&&buyerUserId===gameRef.user?.id);if(!actor||actor.type!=='character'||!allowed)throw Error('Escolha uma personagem que você possa controlar.');
  const current=walletTotal(actor.system?.currency),price=issue.price;if(current<price)throw Error(`Faltam ${formatCurrency(price-current)} para comprar esta edição.`);
  await actor.update({'system.currency':wallet(current-price)});
  const source={name:`QUEDAÇO — ${issue.headline||issue.title}`,type:'loot',img:'icons/sundries/documents/document-torn-diagram-tan.webp',system:{description:{value:`<p><strong>${issue.title}</strong> · ${issue.region||'Edição regional'}</p><p>${issue.summary}</p><p>O Journal desta edição foi liberado automaticamente.</p>`},unidentified:{value:false,name:'',description:''},descriptors:[],quantity:1,price,capacity:0,type:''},flags:{[MODULE_ID]:{editionId:issue.id}}};let item;
  try{[item]=await actor.createEmbeddedDocuments('Item',[source]);const journal=await journalGrant(gameRef,issue,purchasingUsers(gameRef,actor,buyerUserId));if(item?.update)await item.update({[`flags.${MODULE_ID}.journalUuid`]:journal.uuid});return {item,journal,remaining:current-price};}
  catch(error){if(item?.delete)try{await item.delete();}catch{}await actor.update({'system.currency':wallet(current)});throw error;}
}
