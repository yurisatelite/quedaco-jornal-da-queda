import {EDITION_TEMPLATES,FEATURE_LABELS,FEATURE_SECTIONS,MODULE_ID,RELIABILITIES,RELIABILITY_LABELS,SECTION_LABELS,STATUSES,STATUS_LABELS,formatCurrency,normalizeEdition,templateEdition,uid,visibleEditions} from './model.mjs';
import {getGeography} from './geography.mjs';
import {loadEditions,removeEdition,upsertEdition} from './store.mjs';
import {ownedCharacters} from './purchase.mjs';
import {releasePublication,requestPurchase} from './socket.mjs';
import {e,multiline} from './escape.mjs';
import {accessiblePublications} from './journal.mjs';
import {publicationAccess} from './publication-policy.mjs';
import {renderWizard} from './editor.mjs';
import {renderDocument} from './document-view.mjs';
import {civilianActors,publicationTemplate,composePublication,defaultRegionImage} from './creation.mjs';
import {calendarAPI,calendarDays,narrativeDate} from './calendar-bridge.mjs';

const option=(value,label,current)=>`<option value="${e(value)}" ${value===current?'selected':''}>${e(label)}</option>`;
const field=(label,name,value,type='text')=>`<label><span>${e(label)}</span><input type="${type}" name="${e(name)}" value="${e(value)}"></label>`;
const area=(label,name,value)=>`<label class="qd-wide"><span>${e(label)}</span><textarea name="${e(name)}" rows="4">${e(value)}</textarea></label>`;
const regionId=name=>getGeography().regions.find(region=>region.name===name)?.id??'';
const regionColor=name=>getGeography().regions.find(region=>region.name===name)?.color??'#4aa7d8';
const npcCatalog=()=>civilianActors();

export class NewspaperApp extends foundry.applications.api.ApplicationV2{
  static DEFAULT_OPTIONS={id:'quedaco-jornal-da-queda-app',classes:['qd-app'],tag:'section',window:{title:'QUEDAÇO - Jornal da Queda',icon:'fa-solid fa-newspaper',resizable:true},position:{width:1120,height:860}};
  constructor(options={}){super(options);this.selectedId='';this.mode='read';this.draft=null;this.message='';this.messageTimer=null;}
  async close(options={}){const result=await super.close(options);this.onClosed?.();return result;}
  flash(message){this.message=message;clearTimeout(this.messageTimer);this.messageTimer=setTimeout(()=>{this.message='';if(this.rendered)void this.rerender();},4500);}
  resetWorkshop(){this.wizardStep=0;this.deliveryChoice='private';this.calendarCursor=null;this.composerMessages=[];this.composerRequest='';this.recipientIds=[];this.previewPlayers=false;this.npcSearch='';this.allNPCs=false;}
  editions(){return loadEditions();}
  selected(){const list=this.editions(),visible=visibleEditions(list,game.user.isGM,{observerIds:accessiblePublications().map(issue=>issue.id)});return visible.find(item=>item.id===this.selectedId)??visible[0]??null;}
  async _renderHTML(){
    const editions=visibleEditions(this.editions(),game.user.isGM,{observerIds:accessiblePublications().map(issue=>issue.id)}),selected=this.selected();if(selected&&!this.selectedId)this.selectedId=selected.id;
    const list=editions.map(issue=>{const writer=npcCatalog().find(actor=>actor.name===issue.writer)??(issue.writerPortrait?{img:issue.writerPortrait}:null);return `<button class="qd-issue-link ${issue.id===selected?.id?'is-active':''}" style="--qd-region:${e(regionColor(issue.region))}" data-action="select" data-id="${e(issue.id)}"><span class="qd-issue-heading">${writer?.img?`<img src="${e(writer.img)}" alt="">`:''}<span><small>${e(issue.region||'Sem região')} · ${e(STATUS_LABELS[issue.status])}</small><strong>${e(issue.headline||issue.title)}</strong><span>${e(issue.number?`Edição ${issue.number}`:issue.date||'Sem data')}</span></span></span></button>`;}).join('');
    return `<div class="qd-shell"><aside class="qd-index"><div class="qd-index-title"><i class="fa-solid fa-newspaper"></i><span><strong>Jornal da Queda</strong><small>A verdade chega amassada, mas chega.</small></span></div>${game.user.isGM?'<button class="qd-primary" data-action="new"><i class="fa-solid fa-plus"></i> Nova edição</button>':''}<div class="qd-issue-list">${list||'<p>Nenhuma edição disponível.</p>'}</div></aside><main class="qd-stage">${this.message?`<p class="qd-message">${e(this.message)}</p>`:''}${this.mode==='edit'&&game.user.isGM?this.renderEditor():this.renderEdition(selected)}</main></div>`;
  }
  _replaceHTML(result,content){content.innerHTML=result;}
  _onRender(context,options){super._onRender(context,options);if(!this.element)return;this.element.addEventListener('click',this._click??=(event)=>this.handleClick(event));this.element.addEventListener('submit',this._submit??=(event)=>this.handleSubmit(event));this.element.addEventListener('change',this._change??=(event)=>this.handleChange(event));this.element.addEventListener('dragover',this._drag??=(event)=>{if(event.target.closest?.('.qd-image-drop'))event.preventDefault();});this.element.addEventListener('drop',this._drop??=(event)=>this.handleImageDrop(event));}
  rerender(){return this.render(true);}
  renderEdition(issue){
    if(!issue)return '<section class="qd-empty"><i class="fa-regular fa-newspaper"></i><h2>Nenhuma edição disponível</h2><p>A pessoa Mestre ainda não colocou um exemplar em circulação.</p></section>';
    const access=publicationAccess(issue,game.user,{journalObserver:accessiblePublications().some(item=>item.id===issue.id)});
    const pages=Array.from({length:issue.pageCount},(_,index)=>index+1),actors=ownedCharacters();
    const paper=access.read?pages.map(page=>this.renderPage(issue,page)).join(''):'<p class="qd-message">Compre um exemplar para ler esta publicação.</p>';
    const actorPicker=actors.length?`<select name="buyerActor">${actors.map(actor=>option(actor.id,actor.name,actors[0]?.id)).join('')}</select><button data-action="buy" data-id="${e(issue.id)}"><i class="fa-solid fa-coins"></i> Comprar · ${e(formatCurrency(issue.price))}</button>`:'<small>Nenhuma personagem controlada disponível para receber o exemplar.</small>';
    return `<div class="qd-toolbar" style="--qd-region:${e(regionColor(issue.region))}"><span class="qd-status is-${e(issue.status)}">${e(STATUS_LABELS[issue.status])}</span><span>${e(issue.region||'Sem região definida')}</span><span>${e(issue.place||'Todos os locais')}</span>${issue.vendor?`<span>${e(issue.vendor)}</span>`:''}<span>${issue.availability} exemplar(es)</span>${access.buy?`<div class="qd-buy">${actorPicker}</div>`:''}${game.user.isGM?`${issue.kind==='newspaper'&&issue.status==='available'?`<button data-action="offer" data-id="${e(issue.id)}"><i class="fa-solid fa-bullhorn"></i> Apresentar vendedor aos jogadores</button>`:''}<button data-action="export-png" data-id="${e(issue.id)}"><i class="fa-solid fa-image"></i> Baixar PNG</button><button data-action="edit" data-id="${e(issue.id)}"><i class="fa-solid fa-pen"></i> Editar</button><button data-action="duplicate" data-id="${e(issue.id)}"><i class="fa-regular fa-copy"></i> Duplicar</button><button class="qd-danger" data-action="delete" data-id="${e(issue.id)}"><i class="fa-solid fa-trash"></i> Apagar</button>`:''}</div><div class="qd-pages">${paper}</div>`;
  }
  renderPage(issue,page){
    if(issue.kind&&issue.kind!=='newspaper')return renderDocument(this,issue,page);
    const blocks=issue.blocks.filter(block=>block.page===page),isCover=page===1,writer=npcCatalog().find(actor=>actor.name===issue.writer)??(issue.writerPortrait?{img:issue.writerPortrait}:null);
    return `<article class="qd-paper ${issue.features.includes('hot')?'is-hot':''} ${issue.features.includes('wanted')?'has-wanted':''}" style="--qd-region:${e(regionColor(issue.region))}" data-page="${page}"><div class="qd-corner qd-corner-a"></div><div class="qd-corner qd-corner-b"></div>${issue.features.includes('hot')?'<div class="qd-breaking">EDIÇÃO EXTRA · NOTÍCIA QUENTE</div>':''}<header class="qd-masthead"><div class="qd-rune">✦</div><div><h1>QUEDAÇO</h1><p>JORNAL DA QUEDA</p></div><div class="qd-seal">${e(issue.region||'EDIÇÃO')}<small>${e(issue.number||issue.date||'LOCAL')}</small></div></header>${isCover?`<section class="qd-lead"><small>${e([issue.region,issue.place,issue.date].filter(Boolean).join(' · '))}</small><h2>${e(issue.headline||issue.title)}</h2>${issue.subtitle?`<h3>${e(issue.subtitle)}</h3>`:''}<figure><img src="${e(issue.image)}" alt=""><figcaption>${e(issue.summary)}</figcaption></figure></section>`:`<div class="qd-page-title"><span>EDIÇÃO ${e(issue.number||'LOCAL')}</span><strong>${e(issue.title)}</strong><span>PÁGINA ${page}</span></div>`}<div class="qd-blocks">${blocks.map(block=>this.renderBlock(block)).join('')||'<p class="qd-blank">Esta página aguarda novas notícias.</p>'}</div>${game.user.isGM&&page===issue.pageCount&&issue.gmNotes?`<details class="qd-gm-notes"><summary><i class="fa-solid fa-lock"></i> Notas exclusivas da pessoa Mestre</summary><p>${multiline(issue.gmNotes)}</p></details>`:''}<footer class="qd-byline-footer">${writer?.img?`<img src="${e(writer.img)}" alt="">`:''}<span>${issue.writer?`Publicado por <b>${e(issue.writer)}</b>`:'Redação do Jornal da Queda'}</span></footer></article>`;
  }
  renderBlock(block){
    const secret=game.user.isGM&&(block.secretTruth||block.faction||block.consequence||block.hook||block.deadline)?`<details class="qd-secret"><summary><i class="fa-solid fa-lock"></i> Bastidores · ${e(RELIABILITY_LABELS[block.reliability])}</summary>${block.secretTruth?`<p><b>Verdade:</b> ${multiline(block.secretTruth)}</p>`:''}${block.faction?`<p><b>Facção:</b> ${e(block.faction)}</p>`:''}${block.consequence?`<p><b>Se ignorada:</b> ${multiline(block.consequence)}</p>`:''}${block.hook?`<p><b>Gancho:</b> ${multiline(block.hook)}</p>`:''}${block.deadline?`<p><b>Prazo:</b> ${e(block.deadline)}</p>`:''}</details>`:'';
    return `<section class="qd-block qd-${e(block.section)}"><h3><span>${e(SECTION_LABELS[block.section])}</span></h3>${block.title?`<h4>${e(block.title)}</h4>`:''}<p>${multiline(block.body)}</p>${secret}</section>`;
  }
  renderEditor(){return renderWizard(this,normalizeEdition(this.draft??this.selected()??publicationTemplate()));}
  editionFromForm(form){
    if(!form)return normalizeEdition(this.draft??this.selected()??{});const data=new FormData(form),raw=Object.fromEntries(data.entries()),base=this.draft??this.selected()??{},blocks=[];
    for(let i=0;;i++){if(!data.has(`block.${i}.id`))break;const block={...(base.blocks?.[i]??{})};for(const key of ['id','page','section','title','body','reliability','secretTruth','faction','consequence','hook','deadline'])if(data.has(`block.${i}.${key}`))block[key]=raw[`block.${i}.${key}`];blocks.push(block);}
    const geography=getGeography();raw.regionId=geography.regions.find(r=>r.name===raw.region)?.id??'';raw.placeId=geography.places.find(p=>p.name===raw.place&&(!raw.regionId||p.regionId===raw.regionId))?.id??'';
    const inNewsroom=Number(form.dataset.step)===3;
    const nextBlocks=inNewsroom?blocks:(base.blocks??[]);
    this.recipientIds=data.has('recipient')?data.getAll('recipient'):(Number(form.dataset.step)===5?[]:this.recipientIds??[]);
    this.composerRequest=String(data.get('composerRequest')??this.composerRequest??'');
    const place=geography.places.find(item=>item.name===(raw.place??base.place)&&item.regionId===(raw.regionId||base.regionId));
    return normalizeEdition({...base,...raw,calendarDate:Object.hasOwn(raw,'date')&&raw.date!==base.date?null:base.calendarDate,regionId:raw.region?raw.regionId:base.regionId,region:raw.region??base.region,placeId:Object.hasOwn(raw,'place')?(place?.id??''):base.placeId,blocks:nextBlocks,features:inNewsroom?data.getAll('features'):(base.features??[]),playerBlocks:inNewsroom?data.getAll('playerBlock').map(index=>nextBlocks[Number(index)]).filter(Boolean):base.playerBlocks});
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
        const FP=foundry.applications.apps.FilePicker.implementation;
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
    const target=event.target.closest?.('.qd-shell [data-action]');if(!target)return;event.preventDefault();const action=target.dataset.action,id=target.dataset.id;
    try{
      if(action==='close-app'){await this.close();return;}
      if(action==='wizard-step'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.wizardStep=Math.max(0,Math.min(5,Number(target.dataset.step)));}
      else if(action==='choose-kind'||action==='kind-template'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));if((this.draft.delivery!=='private'&&this.draft.visibility.mode!=='gm')||Array.from(game.journal??[]).some(doc=>doc.getFlag?.(MODULE_ID,'editionId')===this.draft.id))throw Error('Esta publicação já foi entregue. Duplique para criar outro formato.');this.draft=publicationTemplate(target.dataset.kind??this.draft.kind,this.draft);}
      else if(action==='choose-region'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));const region=getGeography().regions.find(item=>item.id===target.dataset.region);if(region){Object.assign(this.draft,{regionId:region.id,region:region.name,place:'',placeId:'',image:defaultRegionImage(region.id)});}}
      else if(action==='choose-npc'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));const role=target.dataset.role;if(!['writer','vendor'].includes(role))return;const actor=civilianActors().find(item=>item.id===id);this.draft[role]=actor?.name??'';this.draft[role+'Id']=actor?.id??'';this.draft[role+'Portrait']=actor?.img??'';}
      else if(action==='npc-filter'||action==='npc-search'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.npcSearch=this.element.querySelector('[name="npcSearch"]')?.value??'';if(action==='npc-filter')this.allNPCs=!this.allNPCs;}
      else if(action==='compose'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.composerMessages??=[];this.composerMessages.push({role:'user',text:this.composerRequest});const old=this.draft;this.draft=composePublication(this.composerRequest,this.draft);Object.assign(this.draft,{title:old.title,writer:old.writer,writerPortrait:old.writerPortrait,writerId:old.writerId,vendor:old.vendor,vendorId:old.vendorId,date:old.date,number:old.number,calendarDate:old.calendarDate});this.composerMessages.push({role:'assistant',text:'Rascunho montado. Revise as matérias e selecione o conteúdo autorizado aos jogadores.'});}
      else if(action==='region-image'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.image=defaultRegionImage(this.draft.regionId);}
      else if(action==='preview-toggle'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.previewPlayers=!this.previewPlayers;}
      else if(action==='delivery-choice'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.deliveryChoice=target.dataset.delivery;}
      else if(action==='calendar-shift'||action==='calendar-day'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));const api=calendarAPI();if(!api)throw Error('Ative o Calendário QUEDAÇO.');const date=this.calendarCursor??this.draft.calendarDate??api.getCurrentDate();if(action==='calendar-shift'){const time=api.dateToWorldTime({...date,day:1,hour:0,minute:0,second:0});this.calendarCursor=api.worldTimeToDate(time+Number(target.dataset.shift)*15*86400);}else{const chosen=calendarDays(game,date).find(item=>item.absoluteDay===Number(target.dataset.day));if(chosen){this.draft.calendarDate=chosen;this.draft.date=narrativeDate(chosen);this.draft.number=`Ciclo ${chosen.cycle} · ${chosen.cycleName}`;}}}
      else if(action==='wizard-release'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));const delivery=this.deliveryChoice??'private';const issue=normalizeEdition({...this.draft,status:delivery==='private'?this.draft.status:'available'});if(delivery==='purchase'&&!civilianActors().some(actor=>actor.id===issue.vendorId||actor.name===issue.vendor))throw Error('Escolha um vendedor na etapa Pessoas.');await upsertEdition(issue);await releasePublication(issue.id,{delivery,visibility:delivery==='private'?{mode:'gm',userIds:[]}:delivery==='grant'?{mode:'users',userIds:this.recipientIds??[]}:{mode:'players',userIds:[]}});this.selectedId=issue.id;this.mode='read';this.draft=null;this.flash('Publicação preparada e entrega solicitada.');}
      else if(action==='select'){this.selectedId=id;this.mode='read';this.draft=null;}
      else if(action==='new'){this.draft=publicationTemplate('newspaper',{id:uid(),availability:5,price:1});this.resetWorkshop();this.mode='edit';}
      else if(action==='edit'){this.selectedId=id;this.draft=structuredClone(this.selected());this.resetWorkshop();this.mode='edit';}
      else if(action==='duplicate'){const copy=structuredClone(this.selected());copy.id=uid();copy.title=`${copy.title} — cópia`;copy.number='';copy.status='draft';copy.delivery='private';copy.visibility={mode:'gm',userIds:[]};this.draft=copy;this.resetWorkshop();this.mode='edit';}
      else if(action==='cancel'){this.mode='read';this.draft=null;}
      else if(action==='apply-template'){const form=this.element.querySelector('.qd-editor'),template=form?.elements.template?.value??'blank';this.draft=templateEdition(template,this.editionFromForm(form));}
      else if(action==='availability-step'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.availability=Math.max(0,Math.min(999,this.draft.availability+Number(target.dataset.delta||0)));}
      else if(action==='add-block'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.blocks.push({id:uid(),page:Math.min(this.draft.pageCount,2),section:'local',title:'',body:'',reliability:'confirmed',secretTruth:'',faction:'',consequence:'',hook:'',deadline:''});}
      else if(action==='remove-block'){this.draft=this.editionFromForm(this.element.querySelector('.qd-editor'));this.draft.blocks.splice(Number(target.dataset.index),1);}
      else if(action==='pick-image'){const FP=foundry.applications.apps.FilePicker.implementation;const current=this.editionFromForm(this.element.querySelector('.qd-editor')).image;new FP({type:'image',current,callback:path=>this.applyImage(path)}).render(true);return;}
      else if(action==='offer'){await releasePublication(this.selected().id,{delivery:'purchase',visibility:{mode:'players',userIds:[]}});return;}
      else if(action==='export-png'){await this.exportPages();return;}
      else if(action==='delete'){const confirmed=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Apagar edição'},rejectClose:false,content:'<p>Apagar esta edição permanentemente?</p>'}):globalThis.confirm?.('Apagar esta edição permanentemente?');if(!confirmed)return;await removeEdition(id);this.mode='read';this.draft=null;this.selectedId='';this.flash('Edição excluída.');}
      else if(action==='buy'){const actorId=this.element.querySelector('[name="buyerActor"]')?.value,actor=game.actors.get(actorId),result=await requestPurchase(actorId,this.selected().id);this.flash(`Exemplar e Journal liberados para ${actor.name}. Saldo: ${formatCurrency(result.remaining)}.`);ui.notifications.info(this.message);}
      await this.rerender();
    }catch(error){this.message=error.message;ui.notifications.error(error.message);await this.rerender();}
  }
  async handleSubmit(event){
    if(!event.target.matches('.qd-editor'))return;event.preventDefault();try{const issue=this.editionFromForm(event.target);await upsertEdition(issue);this.selectedId=issue.id;this.mode='read';this.draft=null;this.flash('Edição salva.');ui.notifications.info(this.message);await this.rerender();}catch(error){this.message=error.message;ui.notifications.error(error.message);await this.rerender();}
  }
}
