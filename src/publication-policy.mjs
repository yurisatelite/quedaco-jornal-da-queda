// Individual grants rely on Foundry Journal ownership, never a public recipient list.
export const PUBLICATION_KINDS=Object.freeze({
  newspaper:{label:'Jornal tradicional',layout:'newspaper',delivery:'purchase'},
  bulletin:{label:'Boletim / edital',layout:'bulletin',delivery:'show'},
  wanted:{label:'Cartaz de procurado',layout:'bulletin',delivery:'show'},
  'field-report':{label:'Relatório de campo',layout:'dossier',delivery:'private'},
  'bestiary-dossier':{label:'Dossiê de ameaça',layout:'dossier',delivery:'private'},
  'mission-brief':{label:'Informe de missão',layout:'record',delivery:'grant'},
  'exploration-log':{label:'Registro de exploração',layout:'record',delivery:'grant'},
  'rumor-sheet':{label:'Bilhete / rumor',layout:'record',delivery:'grant'},
  'research-note':{label:'Nota de pesquisa',layout:'dossier',delivery:'private'},
  'encounter-card':{label:'Cartão de encontro',layout:'encounter',delivery:'private'},
  'campaign-record':{label:'Registro de campanha',layout:'record',delivery:'show'}
});
Object.values(PUBLICATION_KINDS).forEach(Object.freeze);
export const DELIVERIES=Object.freeze(['private','show','grant','purchase']);
export const VISIBILITY_MODES=Object.freeze(['gm','players','users','owners']);

export function publicationAccess(issue,user,{journalObserver=false}={}){
  if(user?.isGM)return {list:true,read:true,buy:issue.kind==='newspaper'&&issue.delivery==='purchase'&&issue.status==='available'&&issue.availability>0};
  if(!user||issue.kind==='encounter-card')return {list:false,read:false,buy:false};
  const global=issue.visibility?.mode==='players'&&['show','purchase'].includes(issue.delivery);
  return {list:journalObserver||global,read:journalObserver||(global&&issue.delivery==='show'),buy:global&&issue.kind==='newspaper'&&issue.delivery==='purchase'&&issue.status==='available'&&issue.availability>0};
}

export function isGlobalPublication(issue){
  return issue.kind!=='encounter-card'&&issue.visibility?.mode==='players'&&['show','purchase'].includes(issue.delivery);
}
