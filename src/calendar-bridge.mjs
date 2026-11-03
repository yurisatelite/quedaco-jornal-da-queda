export function calendarAPI(gameRef=globalThis.game){
  for(const module of gameRef?.modules?.values?.()??[]){
    const api=module?.api;
    if(module.active&&api?.family==='quedaco'&&api.contractVersion===1&&api.capabilities?.calendar&&typeof api.getCurrentDate==='function')return api;
  }
  return null;
}
export const narrativeDate=date=>date?`${date.day} de ${date.cycleName} · Anel ${Math.abs(date.year)} ${date.year<0?'A.F.':'D.F.'}`:'';
export function calendarDays(gameRef=globalThis.game,reference=null){
  const api=calendarAPI(gameRef);if(!api?.dateToWorldTime||!api?.worldTimeToDate)return [];
  const current=reference??api.getCurrentDate();
  return Array.from({length:15},(_,index)=>api.worldTimeToDate(api.dateToWorldTime({year:current.year,cycle:current.cycle,day:index+1,hour:0,minute:0,second:0})));
}
export async function registerCalendarPurchase(gameRef,journal,receipt){
  const api=calendarAPI(gameRef);
  if(!receipt.date||typeof api?.linkJournalToDay!=='function')return {registered:false,reason:'Calendário indisponível no momento da compra.'};
  const uuid=await api.linkJournalToDay(journal.uuid,{title:`Compra · ${journal.name??'Jornal da Queda'}`.slice(0,160),absoluteDay:receipt.date.absoluteDay,timelineId:receipt.timelineId??api.getTimelines?.().activeId??'main',visibility:'shared',sharedWith:receipt.userIds,description:`Exemplar adquirido em ${narrativeDate(receipt.date)}.`,image:''});
  return {registered:true,uuid};
}
