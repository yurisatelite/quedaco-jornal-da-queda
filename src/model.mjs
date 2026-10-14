export const MODULE_ID='quedaco-jornal-da-queda';
export const STATUSES=['draft','available','soldout','archived'];
export const RELIABILITIES=['confirmed','distorted','false','clue','propaganda'];
export const STATUS_LABELS={draft:'Rascunho',available:'Disponível',soldout:'Esgotada',archived:'Arquivada'};
export const RELIABILITY_LABELS={confirmed:'Confirmada',distorted:'Distorcida',false:'Falsa',clue:'Pista',propaganda:'Propaganda'};
export const SECTION_LABELS={known:'O QUE SE SABE',local:'NOTÍCIAS LOCAIS',rumors:'RUMORES DA RUA',classifieds:'CLASSIFICADOS',wanted:'PROCURA-SE',notices:'AVISOS & OFÍCIOS',editorial:'EDITORIAL',omen:'PRESSÁGIO'};
export const FEATURE_LABELS={hot:'Notícia quente',wanted:'Procura-se',rumors:'Rumores',market:'Comércio e preços',notices:'Avisos & Ofícios',omen:'Presságio'};
export const FEATURE_SECTIONS={wanted:'wanted',rumors:'rumors',market:'classifieds',notices:'notices',omen:'omen'};
export const EDITION_TEMPLATES={
  blank:{label:'Em branco',blocks:[]},
  notices:{label:'Avisos & Ofícios',blocks:[['notices','Ofício da localidade'],['notices','Aviso de circulação']]},
  local:{label:'Notícias locais',blocks:[['known','O que se sabe'],['local','Notícias locais'],['rumors','Rumores da rua']]},
  omen:{label:'Presságio',blocks:[['omen','Sinais estranhos'],['rumors','O que a rua comenta'],['known','O que se sabe'],['editorial','Palavra da redação']]},
  market:{label:'Comércio e estrada',blocks:[['classifieds','Mercado e preços'],['notices','Rotas e avisos'],['local','Movimento local']]}
};

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
  const legacyAvailability=typeof edition.availability==='string'&&!/^\s*\d+\s*$/.test(edition.availability)&&edition.availability.trim();
  const features=Array.from(new Set(Array.from(edition.features??[]).filter(value=>Object.hasOwn(FEATURE_LABELS,value))));
  return {id:text(edition.id)||uid(),title:text(edition.title)||'Edição sem título',number:text(edition.number),date:text(edition.date),region:text(edition.region),place:text(edition.place),regionId:text(edition.regionId),placeId:text(edition.placeId),vendor:text(edition.vendor),writer:text(edition.writer),availability:legacyAvailability?1:integer(edition.availability,0,999),price:integer(edition.price),status,pageCount,features,headline:text(edition.headline),subtitle:text(edition.subtitle),summary:text(edition.summary),image:text(edition.image)||'modules/quedaco-jornal-da-queda/assets/road-north.svg',blocks:Array.from(edition.blocks??[]).map(normalizeBlock).filter(block=>block.title||block.body),gmNotes:text(edition.gmNotes)};
}

export function templateEdition(templateId='blank',base={}){
  const template=EDITION_TEMPLATES[templateId]??EDITION_TEMPLATES.blank;
  const issue=normalizeEdition({...base,blocks:template.blocks.map(([section,title],index)=>({id:uid(),page:Math.min(3,Math.floor(index/2)+1),section,title,body:''}))});
  return {...issue,pageCount:Math.max(issue.pageCount,Math.min(3,Math.ceil(template.blocks.length/2)||1))};
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
  id:'estrada-do-norte-caiu',title:'Edição local',number:'01',date:'Após a última chuva',region:'Thur Thur',place:'Alberich e Estrada do Norte',vendor:'Tavernas, mercados e vendedores de rua',availability:5,price:2,status:'available',pageCount:2,
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

export const SAMPLE_EDITIONS=[EXAMPLE_EDITION,
  normalizeEdition({id:'mar-de-huma',title:'Folha das Ilhas',number:'07',date:'Maré alta',region:'Arquipélago de Huma',place:'Kiki',availability:4,price:1,status:'available',pageCount:1,headline:'VELAS E SINAIS NO ARQUIPÉLAGO',subtitle:'Pescadores relatam luzes sobre as águas',summary:'Barcos que cruzam as ilhas ao norte voltam com histórias diferentes sobre a mesma luz.',blocks:[{id:'huma-news',page:1,section:'local',title:'Relatos do cais',body:'A capitania pede que embarcações viajem em pares até a próxima maré.',reliability:'confirmed'}]}),
  normalizeEdition({id:'poeira-mirmir',title:'Gazeta das Dunas',number:'03',date:'Ciclo seco',region:'Deserto de Mirmir',place:'Kravokia',availability:3,price:2,status:'available',pageCount:1,headline:'A CARAVANA QUE NÃO DEIXOU PEGADAS',subtitle:'Mercadores procuram testemunhas',summary:'Uma caravana chegou ao oásis sem marcas de rodas, animais ou passos na areia.',blocks:[{id:'mirmir-news',page:1,section:'rumors',title:'Vozes do deserto',body:'Guias recomendam não seguir lanternas que aparecem depois do pôr do sol.',reliability:'clue'}]}),
  normalizeEdition({id:'gelo-norvak',title:'Correio de Norvak',number:'12',date:'Primeiro frio',region:'Norvak',place:'At’ui',availability:5,price:1,status:'available',pageCount:1,headline:'O GELO CANTOU AO AMANHECER',subtitle:'Trilhas fechadas no extremo sul',summary:'Viajantes ouviram um som profundo sob o gelo e encontraram marcas novas na trilha.',blocks:[{id:'norvak-news',page:1,section:'known',title:'Aviso aos viajantes',body:'A guarda recomenda levar cordas e não atravessar fendas sem marcação.',reliability:'confirmed'}]}),
  normalizeEdition({id:'folha-blurghta',title:'Folha de Blurgh’ta',number:'21',date:'Após a feira',region:'Reino de Blurgh’ta',place:'Maruma',availability:2,price:10,status:'available',pageCount:1,headline:'MERCADO DE MARUMA MUDA DE LUGAR',subtitle:'Comerciantes disputam a nova praça',summary:'As bancas foram remontadas perto das muralhas, e os preços mudaram com a distância.',blocks:[{id:'blurgh-news',page:1,section:'classifieds',title:'Comércio local',body:'Ferramentas, grãos e mapas de estrada estão disponíveis na praça velha até o fim do ciclo.',reliability:'confirmed'}]}),
  normalizeEdition({id:'verde-forah',title:'O Mensageiro Verde',number:'05',date:'Estação das folhas',region:'Protetorado de Forah',place:'Sarfo',availability:4,price:1,status:'available',pageCount:1,headline:'PATRULHAS ENCONTRAM UM BOSQUE INTACTO',subtitle:'Uma rota segura pode ter sido descoberta',summary:'Batedores descrevem uma passagem coberta por árvores antigas, longe das estradas conhecidas.',blocks:[{id:'forah-news',page:1,section:'omen',title:'Sinal entre as folhas',body:'Quem entrar deve deixar uma fita clara na primeira árvore e voltar antes da neblina.',reliability:'clue'}]})
];
