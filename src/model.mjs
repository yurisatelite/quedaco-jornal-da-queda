export const MODULE_ID='quedaco-jornal-da-queda';
export const STATUSES=['draft','available','soldout','archived'];
export const RELIABILITIES=['confirmed','distorted','false','clue','propaganda'];
export const STATUS_LABELS={draft:'Rascunho',available:'Disponível',soldout:'Esgotada',archived:'Arquivada'};
export const RELIABILITY_LABELS={confirmed:'Confirmada',distorted:'Distorcida',false:'Falsa',clue:'Pista',propaganda:'Propaganda'};
export const SECTION_LABELS={known:'O QUE SE SABE',local:'NOTÍCIAS LOCAIS',rumors:'RUMORES DA RUA',classifieds:'CLASSIFICADOS',wanted:'PROCURA-SE',notices:'AVISOS & OFÍCIOS',editorial:'EDITORIAL',omen:'PRESSÁGIO'};

export const uid=()=>globalThis.crypto?.randomUUID?.()??`issue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const text=value=>String(value??'').trim();
const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Math.min(max,Math.max(min,Math.trunc(Number(value)||0)));

export function normalizeBlock(block={},index=0){
  const section=Object.hasOwn(SECTION_LABELS,block.section)?block.section:'local';
  const reliability=RELIABILITIES.includes(block.reliability)?block.reliability:'confirmed';
  return {id:text(block.id)||`block-${index+1}`,page:integer(block.page,1,3),section,title:text(block.title),body:text(block.body),reliability,secretTruth:text(block.secretTruth),faction:text(block.faction),consequence:text(block.consequence),hook:text(block.hook),deadline:text(block.deadline)};
}

export function normalizeEdition(edition={}){
  const status=STATUSES.includes(edition.status)?edition.status:'draft';
  const pageCount=integer(edition.pageCount,1,3)||1;
  return {id:text(edition.id)||uid(),title:text(edition.title)||'Edição sem título',number:text(edition.number),date:text(edition.date),region:text(edition.region),place:text(edition.place),vendor:text(edition.vendor),availability:text(edition.availability),price:integer(edition.price),status,pageCount,headline:text(edition.headline),subtitle:text(edition.subtitle),summary:text(edition.summary),image:text(edition.image)||'modules/quedaco-jornal-da-queda/assets/road-north.svg',blocks:Array.from(edition.blocks??[]).map(normalizeBlock).filter(block=>block.title||block.body),gmNotes:text(edition.gmNotes)};
}

export function normalizeCollection(value={}){
  const editions=Array.from(value.editions??[]).map(normalizeEdition);
  return {schemaVersion:1,editions};
}

export function publicEdition(edition){
  const normalized=normalizeEdition(edition);
  return {...normalized,gmNotes:'',blocks:normalized.blocks.map(({secretTruth,faction,consequence,hook,deadline,...block})=>block)};
}

export function visibleEditions(editions,isGM=false){
  return editions.filter(edition=>isGM||edition.status==='available'||edition.status==='archived');
}

export function formatCurrency(total){
  const value=integer(total),k=Math.floor(value/1000),p=Math.floor(value%1000/10),t=value%10;
  return [k?`K$ ${k}`:'',p?`P$ ${p}`:'',t||(!k&&!p)?`T$ ${t}`:''].filter(Boolean).join(' · ');
}

export const EXAMPLE_EDITION=normalizeEdition({
  id:'estrada-do-norte-caiu',title:'Edição local',number:'01',date:'Após a última chuva',region:'Thur Thur',place:'Alberich e Estrada do Norte',vendor:'Tavernas, mercados e vendedores de rua',availability:'Enquanto houver exemplares',price:2,status:'available',pageCount:2,
  headline:'A ESTRADA DO NORTE CAIU',subtitle:'Desabamento isola vilas e faz autoridades prometerem respostas',summary:'Um grande desabamento interrompeu a passagem pela Estrada do Norte. Equipes de reconhecimento foram enviadas, mas moradores afirmam que a montanha ainda se move.',
  blocks:[
    {id:'known',page:1,section:'known',title:'O que se sabe',body:'Trechos inteiros da via desapareceram. Caravanas aguardam autorização para seguir e os primeiros suprimentos já começaram a encarecer.',reliability:'confirmed',secretTruth:'A estrada realmente caiu, mas o desabamento não foi natural.',hook:'Investigar a origem das fendas antes que a passagem seja reaberta.'},
    {id:'local',page:1,section:'local',title:'Patrulhas sobem a serra',body:'Batedores partiram antes do amanhecer. A administração local pede que curiosos permaneçam longe das ruínas.',reliability:'distorted',secretTruth:'A patrulha procura um objeto desaparecido, não sobreviventes.',faction:'Administração local'},
    {id:'rumors',page:1,section:'rumors',title:'Rumores da Rua',body:'Dizem que o solo canta durante a noite. Há quem fale em criaturas nas fendas e em caminhos antigos sob as pedras.',reliability:'clue',secretTruth:'O som vem de uma galeria selada que agora está exposta.'},
    {id:'wanted',page:2,section:'wanted',title:'Procuram-se aventureiros experientes',body:'Boa recompensa para grupos confiáveis dispostos a reconhecer os trechos bloqueados e localizar desaparecidos.',reliability:'confirmed',consequence:'Sem ajuda, uma segunda caravana desaparecerá em três dias.',deadline:'Três dias de jogo.'},
    {id:'notices',page:2,section:'notices',title:'Avisos & Ofícios',body:'A passagem permanece fechada. Fornecimentos básicos serão distribuídos nas vilas afetadas. Comerciantes devem registrar desvios de rota.',reliability:'propaganda',secretTruth:'Os suprimentos são insuficientes para todas as vilas.',faction:'Conselho de Alberich'},
    {id:'omen',page:2,section:'omen',title:'A tinta não secou',body:'Alguns exemplares chegaram com uma linha a mais: “A segunda queda virá de baixo”. A tipografia nega ter impresso a frase.',reliability:'clue',secretTruth:'A frase aparece apenas perto da entrada para a galeria.'}
  ],gmNotes:'Use a edição para apresentar a estrada bloqueada sem confirmar a causa. A pista da tinta aponta para a galeria descoberta pelo desabamento.'
});
