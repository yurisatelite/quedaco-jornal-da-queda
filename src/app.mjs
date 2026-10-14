import {EDITION_TEMPLATES,FEATURE_LABELS,FEATURE_SECTIONS,MODULE_ID,RELIABILITIES,RELIABILITY_LABELS,SECTION_LABELS,STATUSES,STATUS_LABELS,formatCurrency,normalizeEdition,templateEdition,uid,visibleEditions} from './model.mjs';
import {getGeography} from './geography.mjs';
import {loadEditions,removeEdition,upsertEdition} from './store.mjs';
import {ownedCharacters} from './purchase.mjs';
import {broadcastOffer,requestPurchase} from './socket.mjs';
import {e,multiline} from './escape.mjs';

const option=(value,label,current)=>`<option value="${e(value)}" ${value===current?'selected':''}>${e(label)}</option>`;
const field=(label,name,value,type='text')=>`<label><span>${e(label)}</span><input type="${type}" name="${e(name)}" value="${e(value)}"></label>`;
const area=(label,name,value)=>`<label class="qd-wide"><span>${e(label)}</span><textarea name="${e(name)}" rows="4">${e(value)}</textarea></label>`;
const regionId=name=>getGeography().regions.find(region=>region.name===name)?.id??'';
const regionColor=name=>getGeography().regions.find(region=>region.name===name)?.color??'#4aa7d8';
const npcCatalog=()=>Array.from(game.actors??[]).map(actor=>{const npc=actor.flags?.quedaco?.npc??actor.getFlag?.('quedaco','npc')??{};return {name:String(actor.name??''),regionId:String(npc.regionId??''),img:actor.prototypeToken?.texture?.src||actor.img||'',vendor:Boolean(npc.shop)||/mercador|vendedor|comerciante|lojista/i.test(String(npc.role??''))};}).filter(actor=>actor.name);
const npcOptions=(current,region='',vendors=false)=>{const regionalId=regionId(region),all=npcCatalog().filter(npc=>!vendors||npc.vendor).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));const local=regionalId?all.filter(npc=>npc.regionId===regionalId):[];const other=regionalId?all.filter(npc=>npc.regionId!==regionalId):all;const options=list=>list.map(npc=>option(npc.name,npc.name,current)).join('');return `${local.length?`<optgroup label="Da região escolhida">${options(local)}</optgroup>`:''}${other.length?`<optgroup label="${regionalId?'Outros NPCs':'NPCs da mesa'}">${options(other)}</optgroup>`:''}`;};

export class NewspaperApp extends foundry.applications.api.ApplicationV2{
  static DEFAULT_OPTIONS={id:'quedaco-jornal-da-queda-app',classes:['qd-app'],tag:'section',window:{title:'QUEDAÇO - Jornal da Queda',icon:'fa-solid fa-newspaper',resizable:true},position:{width:1120,height:860}};
  constructor(options={}){super(options);this.selectedId='';this.mode='read';this.draft=null;this.message='';this.messageTimer=null;}
  async close(options={}){const result=await super.close(options);this.onClosed?.();return result;}
  flash(message){this.message=message;clearTimeout(this.messageTimer);this.messageTimer=setTimeout(()=>{this.message='';if(this.rendered)void this.rerender();},4500);}
  editions(){return loadEditions();}
  selected(){const list=this.editions(),visible=visibleEditions(list,game.user.isGM);return visible.find(item=>item.id===this.selectedId)??visible[0]??null;}
  async _renderHTML(){
    const editions=visibleEditions(this.editions(),game.user.isGM),selected=this.selected();if(selected&&!this.selectedId)this.selectedId=selected.id;
    const list=editions.map(issue=>{const writer=npcCatalog().find(actor=>actor.name===issue.writer);return `<button class="qd-issue-link ${issue.id===selected?.id?'is-active':''}" style="--qd-region:${e(regionColor(issue.region))}" data-action="select" data-id="${e(issue.id)}"><span class="qd-issue-heading">${writer?.img?`<img src="${e(writer.img)}" alt="">`:''}<span><small>${e(issue.region||'Sem região')} · ${e(STATUS_LABELS[issue.status])}</small><strong>${e(issue.headline||issue.title)}</strong><span>${e(issue.number?`Edição ${issue.number}`:issue.date||'Sem data')}</span></span></span></button>`;}).join('');
    return `<div class="qd-shell"><aside class="qd-index"><div class="qd-index-title"><i class="fa-solid fa-newspaper"></i><span><strong>Jornal da Queda</strong><small>A verdade chega amassada, mas chega.</small></span></div>${game.user.isGM?'<button class="qd-primary" data-action="new"><i class="fa-solid fa-plus"></i> Nova edição</button>':''}<div class="qd-issue-list">${list||'<p>Nenhuma edição disponível.</p>'}</div></aside><main class="qd-stage">${this.message?`<p class="qd-message">${e(this.message)}</p>`:''}${this.mode==='edit'&&game.user.isGM?this.renderEditor():this.renderEdition(selected)}</main></div>`;
  }
  _replaceHTML(result,content){content.innerHTML=result;}
  _onRender(context,options){super._onRender(context,options);if(!this.element)return;this.element.addEventListener('click',this._click??=(event)=>this.handleClick(event));this.element.addEventListener('submit',this._submit??=(event)=>this.handleSubmit(event));this.element.addEventListener('change',this._change??=(event)=>this.handleChange(event));this.element.addEventListener('dragover',this._drag??=(event)=>{if(event.target.closest?.('.qd-image-drop'))event.preventDefault();});this.element.addEventListener('drop',this._drop??=(event)=>this.handleImageDrop(event));}
  rerender(){return this.render(true);}
  renderEdition(issue){
    if(!issue)return '<section class="qd-empty"><i class="fa-regular fa-newspaper"></i><h2>Nenhuma edição disponível</h2><p>A pessoa Mestre ainda não colocou um exemplar em circulação.</p></section>';
    const pages=Array.from({length:issue.pageCount},(_,index)=>index+1),actors=ownedCharacters();
    const paper=pages.map(page=>this.renderPage(issue,page)).join('');
    const actorPicker=actors.length?`<select name="buyerActor">${actors.map(actor=>option(actor.id,actor.name,actors[0]?.id)).join('')}</select><button data-action="buy" data-id="${e(issue.id)}"><i class="fa-solid fa-coins"></i> Comprar · ${e(formatCurrency(issue.price))}</button>`:'<small>Nenhuma personagem controlada disponível para receber o exemplar.</small>';
    return `<div class="qd-toolbar" style="--qd-region:${e(regionColor(issue.region))}"><span class="qd-status is-${e(issue.status)}">${e(STATUS_LABELS[issue.status])}</span><span>${e(issue.region||'Sem região definida')}</span><span>${e(issue.place||'Todos os locais')}</span>${issue.vendor?`<span>${e(issue.vendor)}</span>`:''}<span>${issue.availability} exemplar(es)</span>${issue.status==='available'?`<div class="qd-buy">${actorPicker}</div>`:''}${game.user.isGM?`${issue.status==='available'?`<button data-action="offer" data-id="${e(issue.id)}"><i class="fa-solid fa-bullhorn"></i> Oferecer aos jogadores</button>`:''}<button data-action="export-png" data-id="${e(issue.id)}"><i class="fa-solid fa-image"></i> Baixar PNG</button><button data-action="edit" data-id="${e(issue.id)}"><i class="fa-solid fa-pen"></i> Editar</button><button data-action="duplicate" data-id="${e(issue.id)}"><i class="fa-regular fa-copy"></i> Duplicar</button><button class="qd-danger" data-action="delete" data-id="${e(issue.id)}"><i class="fa-solid fa-trash"></i> Apagar</button>`:''}</div><div class="qd-pages">${paper}</div>`;
  }
  renderPage(issue,page){
    const blocks=issue.blocks.filter(block=>block.page===page),isCover=page===1,writer=npcCatalog().find(actor=>actor.name===issue.writer);
    return `<article class="qd-paper ${issue.features.includes('hot')?'is-hot':''} ${issue.features.includes('wanted')?'has-wanted':''}" style="--qd-region:${e(regionColor(issue.region))}" data-page="${page}"><div class="qd-corner qd-corner-a"></div><div class="qd-corner qd-corner-b"></div>${issue.features.includes('hot')?'<div class="qd-breaking">EDIÇÃO EXTRA · NOTÍCIA QUENTE</div>':''}<header class="qd-masthead"><div class="qd-rune">✦</div><div><h1>QUEDAÇO</h1><p>JORNAL DA QUEDA</p></div><div class="qd-seal">${e(issue.region||'EDIÇÃO')}<small>${e(issue.number||issue.date||'LOCAL')}</small></div></header>${isCover?`<section class="qd-lead"><small>${e([issue.region,issue.place,issue.date].filter(Boolean).join(' · '))}</small><h2>${e(issue.headline||issue.title)}</h2>${issue.subtitle?`<h3>${e(issue.subtitle)}</h3>`:''}<figure><img src="${e(issue.image)}" alt=""><figcaption>${e(issue.summary)}</figcaption></figure></section>`:`<div class="qd-page-title"><span>EDIÇÃO ${e(issue.number||'LOCAL')}</span><strong>${e(issue.title)}</strong><span>PÁGINA ${page}</span></div>`}<div class="qd-blocks">${blocks.map(block=>this.renderBlock(block)).join('')||'<p class="qd-blank">Esta página aguarda novas notícias.</p>'}</div>${game.user.isGM&&page===issue.pageCount&&issue.gmNotes?`<details class="qd-gm-notes"><summary><i class="fa-solid fa-lock"></i> Notas exclusivas da pessoa Mestre</summary><p>${multiline(issue.gmNotes)}</p></details>`:''}<footer class="qd-byline-footer">${writer?.img?`<img src="${e(writer.img)}" alt="">`:''}<span>${issue.writer?`Publicado por <b>${e(issue.writer)}</b>`:'Redação do Jornal da Queda'}</span></footer></article>`;
  }
  renderBlock(block){
    const secret=game.user.isGM&&(block.secretTruth||block.faction||block.consequence||block.hook||block.deadline)?`<details class="qd-secret"><summary><i class="fa-solid fa-lock"></i> Bastidores · ${e(RELIABILITY_LABELS[block.reliability])}</summary>${block.secretTruth?`<p><b>Verdade:</b> ${multiline(block.secretTruth)}</p>`:''}${block.faction?`<p><b>Facção:</b> ${e(block.faction)}</p>`:''}${block.consequence?`<p><b>Se ignorada:</b> ${multiline(block.consequence)}</p>`:''}${block.hook?`<p><b>Gancho:</b> ${multiline(block.hook)}</p>`:''}${block.deadline?`<p><b>Prazo:</b> ${e(block.deadline)}</p>`:''}</details>`:'';
    return `<section class="qd-block qd-${e(block.section)}"><h3><span>${e(SECTION_LABELS[block.section])}</span></h3>${block.title?`<h4>${e(block.title)}</h4>`:''}<p>${multiline(block.body)}</p>${secret}</section>`;
  }
  renderEditor(){
    const issue=normalizeEdition(this.draft??this.selected()??{id:uid(),pageCount:2,blocks:[]});
    const geography=getGeography();if(issue.regionId)issue.region=geography.regions.find(r=>r.id===issue.regionId)?.name??issue.region;if(issue.placeId)issue.place=geography.places.find(p=>p.id===issue.placeId)?.name??issue.place;
    const blockEditors=issue.blocks.map((block,index)=>`<fieldset class="qd-block-editor" data-block-index="${index}"><legend>Bloco ${index+1}</legend><input type="hidden" name="block.${index}.id" value="${e(block.id)}"><div class="qd-form-grid"><label><span>Página</span><select name="block.${index}.page">${[1,2,3].map(value=>option(String(value),`Página ${value}`,String(block.page))).join('')}</select></label><label><span>Seção</span><select name="block.${index}.section">${Object.entries(SECTION_LABELS).map(([value,label])=>option(value,label,block.section)).join('')}</select></label>${field('Título',`block.${index}.title`,block.title)}<label><span>Confiabilidade — só Mestre</span><select name="block.${index}.reliability">${RELIABILITIES.map(value=>option(value,RELIABILITY_LABELS[value],block.reliability)).join('')}</select></label>${area('Texto público',`block.${index}.body`,block.body)}${area('Verdade por trás',`block.${index}.secretTruth`,block.secretTruth)}${field('Facção',`block.${index}.faction`,block.faction)}${field('Prazo',`block.${index}.deadline`,block.deadline)}${area('Consequência se ignorada',`block.${index}.consequence`,block.consequence)}${area('Gancho relacionado',`block.${index}.hook`,block.hook)}</div><button type="button" class="qd-danger" data-action="remove-block" data-index="${index}">Remover bloco</button></fieldset>`).join('');
    const featureChecks=Object.entries(FEATURE_LABELS).map(([value,label])=>`<label class="qd-feature ${issue.features.includes(value)?'is-selected':''}"><input class="qd-feature-check" type="checkbox" name="features" value="${e(value)}" ${issue.features.includes(value)?'checked':''}><span>${e(label)}</span></label>`).join('');
    const regionOptions=`<option value="">Sem região</option>${getGeography().regions.map(region=>option(region.name,region.name,issue.region)).join('')}`;
    const placeOptions=`<option value="">Toda a região / sem local</option>${getGeography().places.filter(place=>!issue.region||place.regionId===regionId(issue.region)).map(place=>option(place.name,place.name,issue.place)).join('')}`;
    const pricePreset=issue.price===1?'1':issue.price===10?'10':'custom';
    const templates=Object.entries(EDITION_TEMPLATES).map(([id,template])=>option(id,template.label,'blank')).join('');
    return `<form class="qd-editor"><div class="qd-editor-actions"><button type="button" data-action="cancel">← Voltar à edição</button><strong>${issue.id===this.selectedId?'Editar edição':'Nova edição'}</strong><button class="qd-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar edição</button></div><input type="hidden" name="id" value="${e(issue.id)}"><section><h2>Identificação e circulação</h2><div class="qd-form-grid"><label><span>Título da edição</span><input name="title" list="qd-title-presets" value="${e(issue.title)}"></label><label><span>Número ou ciclo</span><input name="number" list="qd-number-presets" value="${e(issue.number)}"></label>${field('Data narrativa','date',issue.date)}<datalist id="qd-title-presets"><option value="Edição local"><option value="Edição extra"><option value="Boletim do Senado"><option value="Folha da estrada"></datalist><datalist id="qd-number-presets"><option value="01"><option value="02"><option value="Ciclo da Aurora"><option value="Ciclo da Colheita"></datalist><label><span>Região Geopaf</span><select name="region">${regionOptions}</select></label><label><span>Localidade</span><select name="place">${placeOptions}</select></label><label><span>NPC escritor · opcional</span><select name="writer"><option value="">Sem assinatura</option>${npcOptions(issue.writer,issue.region)}</select></label><label><span>Vendedor ou estabelecimento · opcional</span><select name="vendor"><option value="">Sem vendedor definido</option>${npcOptions(issue.vendor,issue.region)}</select></label><label><span>Exemplares disponíveis</span><div class="qd-stepper"><button type="button" data-action="availability-step" data-delta="-1" aria-label="Diminuir exemplares">−</button><input type="number" name="availability" min="0" max="999" value="${e(issue.availability)}"><button type="button" data-action="availability-step" data-delta="1" aria-label="Aumentar exemplares">+</button></div></label><label><span>Preço em Trocados</span><select name="pricePreset"><option value="1" ${pricePreset==='1'?'selected':''}>1 T$</option><option value="10" ${pricePreset==='10'?'selected':''}>10 T$</option><option value="custom" ${pricePreset==='custom'?'selected':''}>Personalizado</option></select></label><label><span>Preço personalizado</span><input type="number" name="price" min="0" value="${e(issue.price)}" ${pricePreset==='custom'?'':'readonly'}></label><label><span>Estado</span><select name="status">${STATUSES.map(value=>option(value,STATUS_LABELS[value],issue.status)).join('')}</select></label><label><span>Número de páginas</span><select name="pageCount">${[1,2,3].map(value=>option(String(value),String(value),String(issue.pageCount))).join('')}</select></label></div></section><section><div class="qd-editor-heading"><h2>Modelo de edição</h2><div class="qd-template-picker"><select name="template">${templates}</select><button type="button" data-action="apply-template"><i class="fa-solid fa-wand-magic-sparkles"></i> Aplicar modelo</button></div></div><p>Aplicar um modelo substitui as matérias atuais. Os destaques abaixo continuam opcionais.</p></section><section><h2>Formato da edição</h2><p>Marque os destaques que quer usar. Cada opção cria a seção correspondente.</p><div class="qd-features">${featureChecks}</div></section><section><h2>Capa</h2><div class="qd-form-grid">${field('Manchete','headline',issue.headline)}${field('Subtítulo','subtitle',issue.subtitle)}${area('Resumo do acontecimento','summary',issue.summary)}<div class="qd-wide qd-image-drop" data-image-drop><img src="${e(issue.image)}" alt="Prévia da capa"><div><strong>Imagem da capa</strong><span>Arraste uma imagem aqui ou escolha nos arquivos do Foundry.</span><button type="button" data-action="pick-image"><i class="fa-solid fa-image"></i> Escolher imagem</button></div><input type="hidden" name="image" value="${e(issue.image)}"></div></div></section><section><div class="qd-editor-heading"><h2>Matérias</h2><button type="button" data-action="add-block"><i class="fa-solid fa-plus"></i> Adicionar bloco</button></div>${blockEditors||'<p>Nenhuma matéria criada.</p>'}</section><section><h2>Uso pela pessoa Mestre</h2>${area('Notas gerais exclusivas','gmNotes',issue.gmNotes)}</section><div class="qd-editor-actions qd-editor-footer"><button type="button" class="qd-danger" data-action="delete" data-id="${e(issue.id)}">Excluir edição</button><button type="button" class="qd-window-close" data-action="close-app" aria-label="Fechar Jornal da Queda" title="Fechar Jornal da Queda"><i class="fa-solid fa-xmark"></i><span>Fechar</span></button><button class="qd-primary" type="submit">Salvar edição</button></div></form>`;
  }
  editionFromForm(form){
    if(!form)return normalizeEdition(this.draft??this.selected()??{});const data=new FormData(form),raw=Object.fromEntries(data.entries()),blocks=[];
    for(let i=0;;i++){if(!data.has(`block.${i}.id`))break;const block={};for(const key of ['id','page','section','title','body','reliability','secretTruth','faction','consequence','hook','deadline'])block[key]=raw[`block.${i}.${key}`]??'';blocks.push(block);}
    const geography=getGeography();raw.regionId=geography.regions.find(r=>r.name===raw.region)?.id??'';raw.placeId=geography.places.find(p=>p.name===raw.place&&(!raw.regionId||p.regionId===raw.regionId))?.id??'';
    return normalizeEdition({...raw,features:data.getAll('features'),blocks});
  }
  async applyImage(path){
    if(!path)return;this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.image=String(path);await this.rerender();
  }
  async handleImageDrop(event){
    if(!event.target.closest?.('[data-image-drop]'))return;event.preventDefault();
    try{
      const file=event.dataTransfer?.files?.[0];let path='';
      if(file){
        if(!file.type.startsWith('image/'))throw Error('Solte um arquivo de imagem.');
        const FP=globalThis.FilePicker??foundry.applications.apps.FilePicker.implementation;
        try{await FP.createDirectory('data','quedaco-jornal-da-queda');}catch{}
        const uploaded=await FP.upload('data','quedaco-jornal-da-queda',file,{}, {notify:true});path=uploaded?.path??'';
      }else{
        const raw=event.dataTransfer?.getData('text/plain')||event.dataTransfer?.getData('text/uri-list')||'';
        try{const parsed=JSON.parse(raw);path=parsed.path??parsed.src??parsed.texture?.src??'';}catch{path=raw;}
      }
      if(!path)throw Error('Não foi possível identificar a imagem solta.');await this.applyImage(path);
    }catch(error){this.message=error.message;ui.notifications.error(error.message);await this.rerender();}
  }
  async handleChange(event){
    if(!event.target.matches?.('.qd-feature-check,[name="region"],[name="pricePreset"]'))return;this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));
    if(event.target.matches('.qd-feature-check')&&event.target.checked){const section=FEATURE_SECTIONS[event.target.value];if(section&&!this.draft.blocks.some(block=>block.section===section))this.draft.blocks.push({id:uid(),page:Math.min(this.draft.pageCount,2),section,title:FEATURE_LABELS[event.target.value],body:'',reliability:'confirmed',secretTruth:'',faction:'',consequence:'',hook:'',deadline:''});}
    if(event.target.name==='region'){const validPlaces=new Set(getGeography().places.filter(place=>place.regionId===regionId(this.draft.region)).map(place=>place.name));if(!validPlaces.has(this.draft.place))this.draft.place='';this.draft.vendor='';}
    if(event.target.name==='pricePreset'&&event.target.value!=='custom')this.draft.price=Number(event.target.value);
    await this.rerender();
  }
  async exportPages(){
    if(typeof globalThis.html2canvas!=='function')throw Error('O exportador de imagem não foi carregado.');const pages=[...this.element.querySelectorAll('.qd-paper')];
    for(let index=0;index<pages.length;index++){
      const canvas=await globalThis.html2canvas(pages[index],{backgroundColor:null,scale:2,useCORS:true,logging:false});
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Não foi possível gerar a imagem desta página.');
      const url=URL.createObjectURL(blob),link=document.createElement('a'),name=(this.selected()?.headline||'jornal-da-queda').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();link.href=url;link.download=`${name}-pagina-${index+1}.png`;link.click();URL.revokeObjectURL(url);
    }
    ui.notifications.info(`${pages.length} página(s) exportada(s) em PNG.`);
  }
  async handleClick(event){
    const target=event.target.closest?.('[data-action]');if(!target)return;event.preventDefault();const action=target.dataset.action,id=target.dataset.id;
    try{
      if(action==='close-app'){await this.close();return;}
      if(action==='select'){this.selectedId=id;this.mode='read';this.draft=null;}
      else if(action==='new'){this.draft=normalizeEdition({id:uid(),title:'Nova edição',status:'draft',pageCount:2,availability:1,blocks:[]});this.mode='edit';}
      else if(action==='edit'){this.selectedId=id;this.draft=structuredClone(this.selected());this.mode='edit';}
      else if(action==='duplicate'){const copy=structuredClone(this.selected());copy.id=uid();copy.title=`${copy.title} — cópia`;copy.number='';copy.status='draft';this.draft=copy;this.mode='edit';}
      else if(action==='cancel'){this.mode='read';this.draft=null;}
      else if(action==='apply-template'){const form=this.element.querySelector('.qd-editor'),template=form?.elements.template?.value??'blank';this.draft=templateEdition(template,this.editionFromForm(form));}
      else if(action==='availability-step'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.availability=Math.max(0,Math.min(999,this.draft.availability+Number(target.dataset.delta||0)));}
      else if(action==='add-block'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.blocks.push({id:uid(),page:Math.min(this.draft.pageCount,2),section:'local',title:'',body:'',reliability:'confirmed',secretTruth:'',faction:'',consequence:'',hook:'',deadline:''});}
      else if(action==='remove-block'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.blocks.splice(Number(target.dataset.index),1);}
      else if(action==='pick-image'){const FP=foundry.applications.apps.FilePicker.implementation;const current=this.editionFromForm(this.element.querySelector('.qd-editor')).image;new FP({type:'image',current,callback:path=>this.applyImage(path)}).render(true);return;}
      else if(action==='offer'){broadcastOffer(this.selected());return;}
      else if(action==='export-png'){await this.exportPages();return;}
      else if(action==='delete'){const confirmed=globalThis.Dialog?.confirm?await Dialog.confirm({title:'Apagar edição',content:'<p>Apagar esta edição permanentemente?</p>'}):globalThis.confirm?.('Apagar esta edição permanentemente?');if(!confirmed)return;await removeEdition(id);this.mode='read';this.draft=null;this.selectedId='';this.flash('Edição excluída.');}
      else if(action==='buy'){const actorId=this.element.querySelector('[name="buyerActor"]')?.value,actor=game.actors.get(actorId),result=await requestPurchase(actorId,this.selected().id);this.flash(`Exemplar e Journal liberados para ${actor.name}. Saldo: ${formatCurrency(result.remaining)}.`);ui.notifications.info(this.message);}
      await this.rerender();
    }catch(error){this.message=error.message;ui.notifications.error(error.message);await this.rerender();}
  }
  async handleSubmit(event){
    if(!event.target.matches('.qd-editor'))return;event.preventDefault();try{const issue=this.editionFromForm(event.target);await upsertEdition(issue);this.selectedId=issue.id;this.mode='read';this.draft=null;this.flash('Edição salva.');ui.notifications.info(this.message);await this.rerender();}catch(error){this.message=error.message;ui.notifications.error(error.message);await this.rerender();}
  }
}
