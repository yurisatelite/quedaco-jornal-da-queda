import {normalizeEdition,uid} from './model.mjs';
import {PUBLICATION_KINDS} from './publication-policy.mjs';
import {REGIONS} from './geography.mjs';

export function civilianActors(gameRef=globalThis.game){
  return Array.from(gameRef?.actors??[]).filter(actor=>actor.type==='character'&&!actor.hasPlayerOwner&&!actor.flags?.quedaco?.monster&&!actor.flags?.quedaco?.threat).map(actor=>{
    const npc=actor.flags?.quedaco?.npc??{};
    return {id:actor.id,name:String(actor.name??''),regionId:String(npc.regionId??''),img:actor.prototypeToken?.texture?.src||actor.img||'icons/svg/mystery-man.svg',role:String(npc.role??'Habitante'),vendor:!!npc.shop};
  }).filter(actor=>actor.name);
}
export function defaultRegionImage(regionId=''){
  return `modules/quedaco-jornal-da-queda/assets/regions/${REGIONS.some(region=>region.id===regionId)?regionId:'default'}.svg`;
}
const SECTIONS={newspaper:['O acontecimento','Vozes da rua','Aviso aos viajantes'],bulletin:['Comunicado','Orientações'],wanted:['Quem se procura','Última localização','Recompensa'], 'field-report':['Observação','Evidências','Próximos passos'],'bestiary-dossier':['Aparência','Habitat e comportamento','Sinais de presença'],'mission-brief':['Objetivo','Contato e recompensa','Riscos conhecidos'],'exploration-log':['Rota','Descobertas','Pontos de atenção'],'rumor-sheet':['O que foi ouvido'],'research-note':['Hipótese','Observações','Conclusão provisória'],'encounter-card':['Composição','Gatilho','Ajustes de combate'],'campaign-record':['Acontecimentos','Decisões','Consequências']};
const EXAMPLES={
  newspaper:['A feira volta à praça nesta semana. Bancas de comida e ferramentas já começaram a chegar.','Uma moradora conta que ouviu música junto ao portão depois que todos tinham ido embora.','Quem vier de longe deve consultar as condições da estrada antes de partir.'],
  bulletin:['A passagem da ponte estará fechada para reparos ao amanhecer.','Pedestres devem usar a travessia indicada pelos guardas. Não há cobrança adicional.'],
  wanted:['Procura-se uma pessoa de capa remendada que levou um embrulho da hospedaria.','Foi vista pela última vez junto ao portão, perguntando pela estrada velha.','A hospedaria oferece hospedagem e uma gratificação pela devolução do embrulho.'],
  'field-report':['A equipe encontrou uma carroça abandonada ao lado da trilha. Não havia ocupantes.','Há marcas recentes no barro e uma roda quebrada. O restante da carga permanece intacto.','Ouvir quem passou pela estrada e comparar as pegadas antes de prosseguir.'],
  'bestiary-dossier':['O animal observado possui pelagem escura e uma mancha clara no focinho.','Os relatos situam a criatura perto de água e vegetação fechada. Ainda não há confirmação.','Marcas de garras e galhos partidos ajudam a reconhecer os locais visitados.'],
  'mission-brief':['Recuperar a caixa de correspondências perdida na estrada.','A responsável pela hospedaria receberá o grupo e combinará a recompensa.','O caminho não foi vistoriado desde a última chuva. A missão pede reconhecimento primeiro.'],
  'exploration-log':['O grupo deixou o portão ao amanhecer e seguiu a margem do riacho.','Uma ponte de pedra coberta por vegetação apareceu depois da curva.','Uma marca na árvore indica o retorno. A correnteza impede cruzar com segurança.'],
  'rumor-sheet':['Ouvi dizer que alguém deixa uma lanterna acesa na torre vazia. Ninguém soube dizer quem viu primeiro.'],
  'research-note':['Talvez o pó encontrado no frasco reaja à umidade.','A amostra mudou de cor quando exposta ao ar. Nenhum outro efeito foi confirmado.','Guardar uma amostra seca e repetir a observação antes de usar a substância.'],
  'encounter-card':['Selecionar no preparo as criaturas adequadas ao grupo e ao cenário.','O encontro começa se o grupo investigar a carroça ou seguir as pegadas.','Prever uma rota de fuga e revisar dificuldade antes da sessão. Não há estatísticas neste exemplo.'],
  'campaign-record':['O grupo voltou à cidade com notícias da passagem interrompida.','As personagens decidiram ouvir os viajantes antes de retomar a viagem.','A hospedaria tornou-se ponto de encontro para reunir os relatos.']
};
export function publicationTemplate(kind='newspaper',base={}){
  if(!PUBLICATION_KINDS[kind])kind='newspaper';
  const headings=SECTIONS[kind];
  return normalizeEdition({...base,kind,delivery:'private',visibility:{mode:'gm',userIds:[]},title:`${PUBLICATION_KINDS[kind].label} — edição local`,headline:kind==='wanted'?'PROCURA-SE':`${PUBLICATION_KINDS[kind].label} de ${base.place||base.region||'nossa região'}`,summary:'Exemplo fictício para personalizar: acontecimentos e relatos da localidade.',pageCount:1,image:base.image||defaultRegionImage(base.regionId),blocks:headings.map((title,index)=>({id:uid(),page:1,section:kind==='wanted'?'wanted':index===0?'known':'local',title,body:EXAMPLES[kind][index]})),playerSummary:'',playerBlocks:[]});
}
export function composePublication(request,base={}){
  const text=String(request??'').trim();if(!text)throw Error('Conte à redação o que deve entrar na publicação.');
  const result=publicationTemplate(base.kind,base);
  const paragraphs=text.split(/\n\s*\n|(?<=[.!?])\s+/).filter(Boolean);
  result.headline=text.match(/(?:título|manchete)\s*:\s*([^\n]+)/i)?.[1]??paragraphs[0].slice(0,120);
  result.summary=text;
  result.blocks=result.blocks.map((block,index)=>({...block,body:paragraphs[index]??(index===0?text:'Acrescente aqui informações adicionais, se necessário.')}));
  return result;
}
