import {MODULE_ID,formatCurrency,normalizeEdition,publicationAccess} from './model.mjs';
import {ensurePurchasedJournal,purchasingUsers} from './journal.mjs';
import {e} from './escape.mjs';
import {calendarAPI,registerCalendarPurchase} from './calendar-bridge.mjs';
const actorPurchases=new WeakMap();

export const walletTotal=({k=0,p=0,t=0}={})=>Number(k||0)*1000+Number(p||0)*10+Number(t||0);
export function wallet(total){const value=Math.max(0,Math.trunc(Number(total)||0));return {k:Math.floor(value/1000),p:Math.floor(value%1000/10),t:value%10};}
export function ownedCharacters(gameRef=game){return Array.from(gameRef.actors??[]).filter(actor=>actor.type==='character'&&actor.isOwner);}

async function performPurchase(actor,edition,{gameRef=game,buyerUserId=gameRef.user?.id,journalGrant=ensurePurchasedJournal}={}){
  if(!gameRef.user?.isGM)throw Error('A compra precisa ser executada pela pessoa Mestre.');
  const issue=normalizeEdition(edition);if(issue.status!=='available')throw Error('Esta edição não está disponível para compra.');
  const buyer=gameRef.users?.get?.(buyerUserId)??(buyerUserId===gameRef.user.id?gameRef.user:null);if(!buyer)throw Error('Comprador não encontrado.');if(!publicationAccess(issue,buyer).buy)throw Error('Esta publicação não está à venda para você.');
  const allowed=actor?.testUserPermission?actor.testUserPermission(buyer,'OWNER'):Boolean(actor?.isOwner&&buyerUserId===gameRef.user?.id);if(!actor||actor.type!=='character'||!allowed)throw Error('Escolha uma personagem que você possa controlar.');
  const current=walletTotal(actor.system?.currency),price=issue.price;if(current<price)throw Error(`Faltam ${formatCurrency(price-current)} para comprar esta edição.`);
  const api=calendarAPI(gameRef),receipt={date:api?.getCurrentDate()??null,timelineId:api?.getTimelines?.().activeId??'main',userIds:purchasingUsers(gameRef,actor,buyerUserId).filter(id=>!Array.from(gameRef.users??[]).find(user=>user.id===id)?.isGM)};
  await actor.update({'system.currency':wallet(current-price)});
  const source={name:`QUEDAÇO — ${issue.headline||issue.title}`,type:'loot',img:'icons/sundries/documents/document-torn-diagram-tan.webp',system:{description:{value:`<p><strong>${e(issue.title)}</strong> · ${e(issue.region||'Edição regional')}</p><p>${e(issue.summary)}</p><p>O Journal desta edição foi liberado automaticamente.</p>`},unidentified:{value:false,name:'',description:''},descriptors:[],quantity:1,price,capacity:0,type:''},flags:{[MODULE_ID]:{editionId:issue.id,purchasedAt:receipt.date,purchaseTimeline:receipt.timelineId}}};let item;
  try{[item]=await actor.createEmbeddedDocuments('Item',[source]);const journal=await journalGrant(gameRef,issue,purchasingUsers(gameRef,actor,buyerUserId));let calendar;try{calendar=await registerCalendarPurchase(gameRef,journal,receipt);}catch(error){calendar={registered:false,reason:error.message};}return {item,journal,calendar,remaining:current-price};}
  catch(error){if(item?.delete)try{await item.delete();}catch{}await actor.update({'system.currency':wallet(current)});throw error;}
}

// Serialize purchases for a character so two simultaneous requests cannot spend
// the same balance. A failed request must not block the next one.
export async function purchaseEdition(actor,edition,options={}){
  if(!actor||typeof actor!=='object')return performPurchase(actor,edition,options);
  const previous=actorPurchases.get(actor)??Promise.resolve();
  const next=previous.catch(()=>{}).then(()=>performPurchase(actor,edition,options));
  actorPurchases.set(actor,next);
  try{return await next;}finally{if(actorPurchases.get(actor)===next)actorPurchases.delete(actor);}
}
