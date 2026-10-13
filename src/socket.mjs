import {MODULE_ID,formatCurrency,publicEdition} from './model.mjs';
import {loadEditions} from './store.mjs';
import {ownedCharacters,purchaseEdition} from './purchase.mjs';
import {e} from './escape.mjs';

const CHANNEL=`module.${MODULE_ID}`,pending=new Map();
const requestId=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;
function primaryGM(gameRef=game){return Array.from(gameRef.users??[]).filter(user=>user.active&&user.isGM).sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0]??null;}
async function executePurchase(payload,gameRef=game){
  const actor=gameRef.actors.get(payload.actorId),edition=loadEditions().find(issue=>issue.id===payload.editionId);if(!edition)throw Error('Esta edição não existe mais.');
  return purchaseEdition(actor,edition,{gameRef,buyerUserId:payload.userId});
}
async function showOffer(payload,gameRef=game){
  if(gameRef.user.isGM)return;const issue=payload.edition,actors=ownedCharacters(gameRef);if(!actors.length){ui.notifications.warn(`O QUEDAÇO “${issue.headline}” está à venda por ${formatCurrency(issue.price)}, mas você não controla uma personagem.`);return;}
  const Dialog=foundry.applications.api.DialogV2,content=`<form><p><strong>${e(issue.headline||issue.title)}</strong></p><p>${e(issue.summary)}</p><p>Preço: <strong>${e(formatCurrency(issue.price))}</strong></p><label>Receber com<select name="actorId">${actors.map(actor=>`<option value="${e(actor.id)}">${e(actor.name)}</option>`).join('')}</select></label></form>`;
  const actorId=await Dialog.prompt({window:{title:'Comprar o Jornal da Queda?'},content,ok:{label:`Comprar · ${formatCurrency(issue.price)}`,callback:(_event,button)=>button.form.elements.actorId.value},cancel:{label:'Agora não'}});if(!actorId)return;
  try{const result=await requestPurchase(actorId,issue.id,gameRef);ui.notifications.info(`Jornal comprado. Saldo restante: ${formatCurrency(result.remaining)}.`);}catch(error){ui.notifications.error(error.message);}
}
export function registerPurchaseSocket(gameRef=game){
  gameRef.socket.on(CHANNEL,async payload=>{
    if(payload.type==='offer'){await showOffer(payload,gameRef);return;}
    if(payload.type==='purchase-result'&&payload.userId===gameRef.user.id){const waiter=pending.get(payload.requestId);if(!waiter)return;pending.delete(payload.requestId);payload.ok?waiter.resolve(payload.result):waiter.reject(Error(payload.error));return;}
    if(payload.type!=='purchase'||primaryGM(gameRef)?.id!==gameRef.user.id)return;
    try{const result=await executePurchase(payload,gameRef);gameRef.socket.emit(CHANNEL,{type:'purchase-result',requestId:payload.requestId,userId:payload.userId,ok:true,result:{remaining:result.remaining,journalUuid:result.journal?.uuid}});}
    catch(error){gameRef.socket.emit(CHANNEL,{type:'purchase-result',requestId:payload.requestId,userId:payload.userId,ok:false,error:error.message});}
  });
}
export function broadcastOffer(edition,gameRef=game){if(!gameRef.user.isGM)throw Error('Somente a pessoa Mestre pode oferecer uma edição.');gameRef.socket.emit(CHANNEL,{type:'offer',edition:publicEdition(edition)});ui.notifications.info('Oferta enviada às telas dos jogadores.');}
export async function requestPurchase(actorId,editionId,gameRef=game){
  if(gameRef.user.isGM)return executePurchase({actorId,editionId,userId:gameRef.user.id},gameRef);
  if(!primaryGM(gameRef))throw Error('A pessoa Mestre precisa estar conectada para concluir a compra.');const id=requestId();
  const promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('A compra demorou demais. Tente novamente.'));},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});});
  gameRef.socket.emit(CHANNEL,{type:'purchase',requestId:id,userId:gameRef.user.id,actorId,editionId});return promise;
}
