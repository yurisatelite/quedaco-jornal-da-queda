import {NewspaperApp} from './app.mjs';
import {MODULE_ID} from './model.mjs';
import {registerSettings} from './store.mjs';
import {installSidebarButton} from './sidebar.mjs';

let newspaper;
export function openNewspaper(){if(newspaper?.rendered){newspaper.bringToFront();return newspaper;}newspaper=new NewspaperApp();newspaper.render(true);return newspaper;}

Hooks.once('init',()=>registerSettings());
Hooks.once('ready',()=>{const module=game.modules.get(MODULE_ID);if(module)module.api={open:openNewspaper};queueMicrotask(()=>installSidebarButton(openNewspaper,ui.sidebar,ui.sidebar?.element));});
Hooks.on('renderSidebar',(application,html)=>installSidebarButton(openNewspaper,application,html));
Hooks.on('renderApplicationV2',(application,html)=>{if(application===ui.sidebar||application?.constructor?.name==='Sidebar')installSidebarButton(openNewspaper,application,html);});
Hooks.on('updateSetting',setting=>{if(setting.key===`${MODULE_ID}.editions`&&newspaper?.rendered)newspaper.render(true);});
