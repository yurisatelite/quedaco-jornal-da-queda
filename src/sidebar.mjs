import {MODULE_ID} from './model.mjs';

function rootOf(html){return html instanceof HTMLElement?html:html?.[0]??null;}
export function installSidebarButton(open,application,html){
  const root=rootOf(html)??rootOf(application?.element)??document;const controls=document.querySelector('#scene-controls-layers, #scene-controls');if(!controls||document.querySelector(`[data-${MODULE_ID}]`))return false;
  const menu=controls.querySelector('menu, ol, ul')??controls;const original=menu.querySelector('button[role="tab"], button[data-tool], button.control-tool');const originalItem=original?.closest('li')??original;if(!menu||!originalItem)return false;
  const item=originalItem.cloneNode(true);const button=item.querySelector('button');if(!button)return false;
  button.className='ui-control plain icon fa-solid fa-newspaper';button.type='button';button.removeAttribute('data-action');button.removeAttribute('data-tool');button.removeAttribute('data-control');button.removeAttribute('data-tab');button.removeAttribute('aria-controls');button.removeAttribute('aria-pressed');button.removeAttribute('role');button.setAttribute(`data-${MODULE_ID}`,'');button.setAttribute('aria-label','Jornal da Queda');button.setAttribute('data-tooltip','Jornal da Queda');button.title='Jornal da Queda';
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open();});const notes=Array.from(menu.querySelectorAll('button')).find(entry=>/Notas de Diário/i.test(entry.getAttribute('aria-label')??entry.title??''));const notesItem=notes?.closest('li')??notes;if(notesItem)notesItem.after(item);else menu.append(item);return true;
}
