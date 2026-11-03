import {MODULE_ID,formatCurrency,normalizeEdition,publicationAccess} from './model.mjs';
import {loadEditions,upsertEdition} from './store.mjs';
import {deliverPublication} from './journal.mjs';
import {ownedCharacters,purchaseEdition} from './purchase.mjs';
import {e} from './escape.mjs';
import {civilianActors} from './creation.mjs';

const CHANNEL=`module.${MODULE_ID}`,pending=new Map(),queuedOffers=new Map(),showingOffers=new Set();
const requestId=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;
function primaryGM(gameRef=game){return Array.from(gameRef.users??[]).filter(user=>user.active&&user.isGM).sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0]??null;}
async function executePurchase(payload,gameRef=game){
  const actor=gameRef.actors.get(payload.actorId),edition=loadEditions().find(issue=>issue.id===payload.editionId);if(!edition)throw Error('Esta edição não existe mais.');
  return purchaseEdition(actor,edition,{gameRef,buyerUserId:payload.userId});
}
async function displayOffer(payload,gameRef=game){
  if(gameRef.user.isGM)return;
  // A socket offer carries only an ID; read the authoritative global index locally.
  const issue=loadEditions(gameRef).find(item=>item.id===payload.editionId);
  if(!issue||!publicationAccess(issue,gameRef.user).buy)return;
  const actors=ownedCharacters(gameRef);if(!actors.length){ui.notifications.warn(`O QUEDAÇO “${issue.headline}” está à venda por ${formatCurrency(issue.price)}, mas você não controla uma personagem.`);return;}
  const Dialog=foundry.applications.api.DialogV2;
  const gold=issue.price>=10;
  const content=`<div class="qd-sale-stage">${issue.vendorPortrait?`<img class="qd-sale-portrait" src="${e(issue.vendorPortrait)}" alt="${e(issue.vendor)}">`:'<i class="fa-solid fa-newspaper qd-sale-placeholder"></i>'}<p class="qd-sale-kicker">O JORNAL CHEGOU À CIDADE</p><h2>${e(issue.vendor||'Vendedor de jornais')}</h2><h3>${e(issue.headline||issue.title)}</h3><p>${e(issue.summary)}</p><div class="qd-sale-price"><span class="qd-coin ${gold?'is-gold':'is-silver'}" aria-hidden="true">●</span><strong>${e(formatCurrency(issue.price))}</strong></div><label>Receber com<select name="actorId">${actors.map(actor=>`<option value="${e(actor.id)}">${e(actor.name)}</option>`).join('')}</select></label></div>`;
  const actorId=await Dialog.prompt({classes:['qd-sale-dialog'],modal:true,window:{title:'Um exemplar para a viagem?'},content,rejectClose:false,ok:{label:`Comprar exemplar · ${formatCurrency(issue.price)}`,callback:(_event,button)=>button.form.elements.actorId.value},cancel:{label:'Agora não'}});if(!actorId)return;

  try{const result=await requestPurchase(actorId,issue.id,gameRef);ui.notifications.info(`Jornal comprado. Saldo restante: ${formatCurrency(result.remaining)}.${result.calendar?.registered?' Registro adicionado ao Calendário.':''}`);if(result.calendar&&!result.calendar.registered)ui.notifications.warn(`Compra concluída; Calendário pendente: ${result.calendar.reason}`);}catch(error){ui.notifications.error(error.message);}
}
async function showOffer(payload,gameRef=game){
  if(gameRef.user.isGM||showingOffers.has(payload.editionId))return;
  if(!loadEditions(gameRef).some(issue=>issue.id===payload.editionId)){queuedOffers.set(payload.editionId,payload);return;}
  queuedOffers.delete(payload.editionId);showingOffers.add(payload.editionId);
  try{await displayOffer(payload,gameRef);}catch(error){ui.notifications.error(error.message);}finally{showingOffers.delete(payload.editionId);}
}
export function registerPurchaseSocket(gameRef=game){
  globalThis.Hooks?.on('updateSetting',setting=>{if(setting.key===`${MODULE_ID}.publicEditions`)for(const payload of [...queuedOffers.values()])void showOffer(payload,gameRef);});
  gameRef.socket.on(CHANNEL,async payload=>{
    if(payload.type==='offer'){await showOffer(payload,gameRef);return;}
    if(payload.type==='purchase-result'&&payload.userId===gameRef.user.id){const waiter=pending.get(payload.requestId);if(!waiter)return;pending.delete(payload.requestId);payload.ok?waiter.resolve(payload.result):waiter.reject(Error(payload.error));return;}
    if(payload.type!=='purchase'||primaryGM(gameRef)?.id!==gameRef.user.id)return;
    try{const result=await executePurchase(payload,gameRef);gameRef.socket.emit(CHANNEL,{type:'purchase-result',requestId:payload.requestId,userId:payload.userId,ok:true,result:{remaining:result.remaining,journalUuid:result.journal?.uuid,calendar:result.calendar}});}
    catch(error){gameRef.socket.emit(CHANNEL,{type:'purchase-result',requestId:payload.requestId,userId:payload.userId,ok:false,error:error.message});}
  });
}
export async function broadcastOffer(edition,gameRef=game){
  if(!gameRef.user.isGM)throw Error('Somente a pessoa Mestre pode oferecer uma edição.');
  const issue=normalizeEdition(edition);
  if(issue.kind!=='newspaper'||issue.delivery!=='purchase'||issue.status!=='available'||issue.availability<1)throw Error('Esta publicação não permite compra.');
  const seller=civilianActors(gameRef).find(actor=>actor.id===issue.vendorId||actor.name===issue.vendor);
  if(!seller)throw Error('Escolha um NPC vendedor na etapa Pessoas antes de apresentar.');
  await upsertEdition({...issue,vendor:seller.name,vendorId:seller.id,vendorPortrait:seller.img,visibility:{mode:'players',userIds:[]}},gameRef);
  gameRef.socket.emit(CHANNEL,{type:'offer',editionId:issue.id});ui.notifications.info('Oferta enviada às telas dos jogadores.');
}

// GM-only commands; no player socket request can show or grant a document.
export async function releasePublication(id,options={},gameRef=game){
  if(!gameRef.user?.isGM)throw Error('Somente a pessoa Mestre pode liberar publicações.');
  const original=loadEditions(gameRef).find(issue=>issue.id===id);if(!original)throw Error('Publicação não encontrada.');
  const delivery=options.delivery??'private';
  const issue=normalizeEdition({...original,delivery,visibility:options.visibility??{mode:'gm',userIds:[]}});
  if(issue.delivery!==delivery)throw Error('Entrega não permitida para este tipo de publicação.');
  if(delivery==='purchase')return broadcastOffer(issue,gameRef);
  let journal=null;
  if(['show','grant'].includes(delivery))journal=await deliverPublication(gameRef,issue,{userIds:issue.visibility.userIds,actor:gameRef.actors?.get?.(options.actorId)});
  await upsertEdition(issue,gameRef);
  return journal;
}
export async function requestPurchase(actorId,editionId,gameRef=game){
  if(gameRef.user.isGM)return executePurchase({actorId,editionId,userId:gameRef.user.id},gameRef);
  if(!primaryGM(gameRef))throw Error('A pessoa Mestre precisa estar conectada para concluir a compra.');const id=requestId();
  const promise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('A compra demorou demais. Tente novamente.'));},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});});
  gameRef.socket.emit(CHANNEL,{type:'purchase',requestId:id,userId:gameRef.user.id,actorId,editionId});return promise;
}
