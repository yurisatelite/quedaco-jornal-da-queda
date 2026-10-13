import {MODULE_ID} from './model.mjs';

function rootOf(html){return html instanceof HTMLElement?html:html?.[0]??null;}
export function installSidebarButton(open,application,html){
  const root=rootOf(html)??rootOf(application?.element)??document.querySelector('#sidebar');if(!root||root.querySelector(`[data-${MODULE_ID}]`))return false;
  const nav=root.querySelector('#sidebar-tabs, nav.tabs, .sidebar-tabs');if(!nav)return false;
  const menu=nav.querySelector(':scope > menu, menu.flexcol');const original=menu?.querySelector('button[data-action="tab"]');const originalItem=original?.closest('li');if(!menu||!originalItem)return false;
  const item=originalItem.cloneNode(true);const button=item.querySelector('button');if(!button)return false;
  button.className='ui-control plain icon fa-solid fa-newspaper';button.type='button';button.removeAttribute('data-action');button.removeAttribute('data-tab');button.removeAttribute('data-group');button.removeAttribute('aria-controls');button.removeAttribute('aria-pressed');button.removeAttribute('role');button.setAttribute(`data-${MODULE_ID}`,'');button.setAttribute('aria-label','Jornal da Queda');button.setAttribute('data-tooltip','Jornal da Queda');
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open();});const collapse=menu.querySelector('button[data-action="toggleState"]')?.closest('li');menu.insertBefore(item,collapse??null);return true;
}
