import {MODULE_ID,RELIABILITIES,RELIABILITY_LABELS,SECTION_LABELS,STATUSES,STATUS_LABELS,formatCurrency,normalizeEdition,uid,visibleEditions} from './model.mjs';
import {loadEditions,removeEdition,upsertEdition} from './store.mjs';
import {ownedCharacters,purchaseEdition} from './purchase.mjs';
import {e,multiline} from './escape.mjs';

const option=(value,label,current)=>`<option value="${e(value)}" ${value===current?'selected':''}>${e(label)}</option>`;
const field=(label,name,value,type='text')=>`<label><span>${e(label)}</span><input type="${type}" name="${e(name)}" value="${e(value)}"></label>`;
const area=(label,name,value)=>`<label class="qd-wide"><span>${e(label)}</span><textarea name="${e(name)}" rows="4">${e(value)}</textarea></label>`;

export class NewspaperApp extends foundry.applications.api.ApplicationV2{
  static DEFAULT_OPTIONS={id:'quedaco-jornal-da-queda-app',classes:['qd-app'],tag:'section',window:{title:'QUEDAÇO - Jornal da Queda',icon:'fa-solid fa-newspaper',resizable:true},position:{width:1120,height:860}};
  constructor(options={}){super(options);this.selectedId='';this.mode='read';this.draft=null;this.message='';}
  editions(){return loadEditions();}
  selected(){const list=this.editions(),visible=visibleEditions(list,game.user.isGM);return visible.find(item=>item.id===this.selectedId)??visible[0]??null;}
  async _renderHTML(){
    const editions=visibleEditions(this.editions(),game.user.isGM),selected=this.selected();if(selected&&!this.selectedId)this.selectedId=selected.id;
    const list=editions.map(issue=>`<button class="qd-issue-link ${issue.id===selected?.id?'is-active':''}" data-action="select" data-id="${e(issue.id)}"><small>${e(issue.region||'Sem região')} · ${e(STATUS_LABELS[issue.status])}</small><strong>${e(issue.headline||issue.title)}</strong><span>${e(issue.number?`Edição ${issue.number}`:issue.date)}</span></button>`).join('');
    return `<div class="qd-shell"><aside class="qd-index"><div class="qd-index-title"><i class="fa-solid fa-newspaper"></i><span><strong>Jornal da Queda</strong><small>A verdade chega amassada, mas chega.</small></span></div>${game.user.isGM?'<button class="qd-primary" data-action="new"><i class="fa-solid fa-plus"></i> Nova edição</button>':''}<div class="qd-issue-list">${list||'<p>Nenhuma edição disponível.</p>'}</div></aside><main class="qd-stage">${this.message?`<p class="qd-message">${e(this.message)}</p>`:''}${this.mode==='edit'&&game.user.isGM?this.renderEditor():this.renderEdition(selected)}</main></div>`;
  }
  _replaceHTML(result,content){content.innerHTML=result;}
  _onRender(context,options){super._onRender(context,options);if(!this.element)return;this.element.addEventListener('click',this._click??=(event)=>this.handleClick(event));this.element.addEventListener('submit',this._submit??=(event)=>this.handleSubmit(event));}
  rerender(){return this.render(true);}
  renderEdition(issue){
    if(!issue)return '<section class="qd-empty"><i class="fa-regular fa-newspaper"></i><h2>Nenhuma edição disponível</h2><p>A pessoa Mestre ainda não colocou um exemplar em circulação.</p></section>';
    const pages=Array.from({length:issue.pageCount},(_,index)=>index+1),actors=ownedCharacters();
    const paper=pages.map(page=>this.renderPage(issue,page)).join('');
    const actorPicker=actors.length?`<select name="buyerActor">${actors.map(actor=>option(actor.id,actor.name,actors[0]?.id)).join('')}</select><button data-action="buy" data-id="${e(issue.id)}"><i class="fa-solid fa-coins"></i> Comprar · ${e(formatCurrency(issue.price))}</button>`:'<small>Nenhuma personagem controlada disponível para receber o exemplar.</small>';
    return `<div class="qd-toolbar"><span class="qd-status is-${e(issue.status)}">${e(STATUS_LABELS[issue.status])}</span><span>${e(issue.region||'Sem região definida')}</span><span>${e(issue.place||'Todos os locais')}</span>${issue.status==='available'?`<div class="qd-buy">${actorPicker}</div>`:''}${game.user.isGM?`<button data-action="edit" data-id="${e(issue.id)}"><i class="fa-solid fa-pen"></i> Editar</button><button data-action="duplicate" data-id="${e(issue.id)}"><i class="fa-regular fa-copy"></i> Duplicar</button>`:''}</div><div class="qd-pages">${paper}</div>`;
  }
  renderPage(issue,page){
    const blocks=issue.blocks.filter(block=>block.page===page),isCover=page===1;
    return `<article class="qd-paper" data-page="${page}"><div class="qd-corner qd-corner-a"></div><div class="qd-corner qd-corner-b"></div><header class="qd-masthead"><div class="qd-rune">✦</div><div><h1>QUEDAÇO</h1><p>JORNAL DA QUEDA</p></div><div class="qd-seal">${e(issue.region||'EDIÇÃO')}<small>${e(issue.number||issue.date||'LOCAL')}</small></div></header>${isCover?`<section class="qd-lead"><small>${e([issue.region,issue.date].filter(Boolean).join(' · '))}</small><h2>${e(issue.headline||issue.title)}</h2>${issue.subtitle?`<h3>${e(issue.subtitle)}</h3>`:''}<figure><img src="${e(issue.image)}" alt=""><figcaption>${e(issue.summary)}</figcaption></figure></section>`:`<div class="qd-page-title"><span>EDIÇÃO ${e(issue.number||'LOCAL')}</span><strong>${e(issue.title)}</strong><span>PÁGINA ${page}</span></div>`}<div class="qd-blocks">${blocks.map(block=>this.renderBlock(block)).join('')||'<p class="qd-blank">Esta página aguarda novas notícias.</p>'}</div>${game.user.isGM&&page===issue.pageCount&&issue.gmNotes?`<details class="qd-gm-notes"><summary><i class="fa-solid fa-lock"></i> Notas exclusivas da pessoa Mestre</summary><p>${multiline(issue.gmNotes)}</p></details>`:''}<footer><span>◇</span>A VERDADE CHEGA AMASSADA, MAS CHEGA.<span>◇</span></footer></article>`;
  }
  renderBlock(block){
    const secret=game.user.isGM&&(block.secretTruth||block.faction||block.consequence||block.hook||block.deadline)?`<details class="qd-secret"><summary><i class="fa-solid fa-lock"></i> Bastidores · ${e(RELIABILITY_LABELS[block.reliability])}</summary>${block.secretTruth?`<p><b>Verdade:</b> ${multiline(block.secretTruth)}</p>`:''}${block.faction?`<p><b>Facção:</b> ${e(block.faction)}</p>`:''}${block.consequence?`<p><b>Se ignorada:</b> ${multiline(block.consequence)}</p>`:''}${block.hook?`<p><b>Gancho:</b> ${multiline(block.hook)}</p>`:''}${block.deadline?`<p><b>Prazo:</b> ${e(block.deadline)}</p>`:''}</details>`:'';
    return `<section class="qd-block qd-${e(block.section)}"><h3><span>${e(SECTION_LABELS[block.section])}</span></h3>${block.title?`<h4>${e(block.title)}</h4>`:''}<p>${multiline(block.body)}</p>${secret}</section>`;
  }
  renderEditor(){
    const issue=normalizeEdition(this.draft??this.selected()??{id:uid(),pageCount:2,blocks:[]});
    const blockEditors=issue.blocks.map((block,index)=>`<fieldset class="qd-block-editor" data-block-index="${index}"><legend>Bloco ${index+1}</legend><input type="hidden" name="block.${index}.id" value="${e(block.id)}"><div class="qd-form-grid"><label><span>Página</span><select name="block.${index}.page">${[1,2,3].map(value=>option(String(value),`Página ${value}`,String(block.page))).join('')}</select></label><label><span>Seção</span><select name="block.${index}.section">${Object.entries(SECTION_LABELS).map(([value,label])=>option(value,label,block.section)).join('')}</select></label>${field('Título',`block.${index}.title`,block.title)}<label><span>Confiabilidade — só Mestre</span><select name="block.${index}.reliability">${RELIABILITIES.map(value=>option(value,RELIABILITY_LABELS[value],block.reliability)).join('')}</select></label>${area('Texto público',`block.${index}.body`,block.body)}${area('Verdade por trás',`block.${index}.secretTruth`,block.secretTruth)}${field('Facção',`block.${index}.faction`,block.faction)}${field('Prazo',`block.${index}.deadline`,block.deadline)}${area('Consequência se ignorada',`block.${index}.consequence`,block.consequence)}${area('Gancho relacionado',`block.${index}.hook`,block.hook)}</div><button type="button" class="qd-danger" data-action="remove-block" data-index="${index}">Remover bloco</button></fieldset>`).join('');
    return `<form class="qd-editor"><div class="qd-editor-actions"><button type="button" data-action="cancel">← Voltar à edição</button><strong>${issue.id===this.selectedId?'Editar edição':'Nova edição'}</strong><button class="qd-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar edição</button></div><input type="hidden" name="id" value="${e(issue.id)}"><section><h2>Identificação e circulação</h2><div class="qd-form-grid">${field('Título da edição','title',issue.title)}${field('Número ou ciclo','number',issue.number)}${field('Data narrativa','date',issue.date)}${field('Região','region',issue.region)}${field('Local','place',issue.place)}${field('Vendedor ou estabelecimento','vendor',issue.vendor)}${field('Disponibilidade','availability',issue.availability)}${field('Preço em Trocados','price',issue.price,'number')}<label><span>Estado</span><select name="status">${STATUSES.map(value=>option(value,STATUS_LABELS[value],issue.status)).join('')}</select></label><label><span>Número de páginas</span><select name="pageCount">${[1,2,3].map(value=>option(String(value),String(value),String(issue.pageCount))).join('')}</select></label></div></section><section><h2>Capa</h2><div class="qd-form-grid">${field('Manchete','headline',issue.headline)}${field('Subtítulo','subtitle',issue.subtitle)}${field('Caminho da ilustração','image',issue.image)}${area('Resumo do acontecimento','summary',issue.summary)}</div></section><section><div class="qd-editor-heading"><h2>Matérias</h2><button type="button" data-action="add-block"><i class="fa-solid fa-plus"></i> Adicionar bloco</button></div>${blockEditors||'<p>Nenhuma matéria criada.</p>'}</section><section><h2>Uso pela pessoa Mestre</h2>${area('Notas gerais exclusivas','gmNotes',issue.gmNotes)}</section><div class="qd-editor-actions qd-editor-footer"><button type="button" class="qd-danger" data-action="delete" data-id="${e(issue.id)}">Excluir edição</button><button class="qd-primary" type="submit">Salvar edição</button></div></form>`;
  }
  editionFromForm(form){
    if(!form)return normalizeEdition(this.draft??this.selected()??{});const data=new FormData(form),raw=Object.fromEntries(data.entries()),blocks=[];
    for(let i=0;;i++){if(!data.has(`block.${i}.id`))break;const block={};for(const key of ['id','page','section','title','body','reliability','secretTruth','faction','consequence','hook','deadline'])block[key]=raw[`block.${i}.${key}`]??'';blocks.push(block);}
    return normalizeEdition({...raw,blocks});
  }
  async handleClick(event){
    const target=event.target.closest?.('[data-action]');if(!target)return;event.preventDefault();const action=target.dataset.action,id=target.dataset.id;
    try{
      if(action==='select'){this.selectedId=id;this.mode='read';this.draft=null;}
      else if(action==='new'){this.draft=normalizeEdition({id:uid(),title:'Nova edição',status:'draft',pageCount:2,blocks:[]});this.mode='edit';}
      else if(action==='edit'){this.selectedId=id;this.draft=structuredClone(this.selected());this.mode='edit';}
      else if(action==='duplicate'){const copy=structuredClone(this.selected());copy.id=uid();copy.title=`${copy.title} — cópia`;copy.number='';copy.status='draft';this.draft=copy;this.mode='edit';}
      else if(action==='cancel'){this.mode='read';this.draft=null;}
      else if(action==='add-block'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.blocks.push({id:uid(),page:Math.min(this.draft.pageCount,2),section:'local',title:'',body:'',reliability:'confirmed',secretTruth:'',faction:'',consequence:'',hook:'',deadline:''});}
      else if(action==='remove-block'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.blocks.splice(Number(target.dataset.index),1);}
      else if(action==='delete'){await removeEdition(id);this.mode='read';this.draft=null;this.selectedId='';this.message='Edição excluída.';}
      else if(action==='buy'){const actorId=this.element.querySelector('[name="buyerActor"]')?.value,actor=game.actors.get(actorId),result=await purchaseEdition(actor,this.selected());this.message=`Exemplar entregue a ${actor.name}. Saldo: ${formatCurrency(result.remaining)}.`;ui.notifications.info(this.message);}
      await this.rerender();
    }catch(error){this.message=error.message;ui.notifications.error(error.message);await this.rerender();}
  }
  async handleSubmit(event){
    if(!event.target.matches('.qd-editor'))return;event.preventDefault();try{const issue=this.editionFromForm(event.target);await upsertEdition(issue);this.selectedId=issue.id;this.mode='read';this.draft=null;this.message='Edição salva.';ui.notifications.info(this.message);await this.rerender();}catch(error){this.message=error.message;ui.notifications.error(error.message);await this.rerender();}
  }
}
