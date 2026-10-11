import {MODULE_ID} from './model.mjs';

function rootOf(html){return html instanceof HTMLElement?html:html?.[0]??null;}
export function installSidebarButton(open,application,html){
  const root=rootOf(html)??rootOf(application?.element)??document.querySelector('#sidebar');if(!root||root.querySelector(`[data-${MODULE_ID}]`))return false;
  const nav=root.querySelector('#sidebar-tabs, nav.tabs, .sidebar-tabs');if(!nav)return false;
  const button=document.createElement('button');button.type='button';button.className='item qd-sidebar-button';button.setAttribute(`data-${MODULE_ID}`,'');button.setAttribute('aria-label','Jornal da Queda');button.title='Jornal da Queda';button.innerHTML='<i class="fa-solid fa-newspaper" aria-hidden="true"></i>';
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open();});nav.append(button);return true;
}
