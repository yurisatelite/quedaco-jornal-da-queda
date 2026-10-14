import {NewspaperApp} from './app.mjs';
import {MODULE_ID} from './model.mjs';
import {initializeStore,refreshPublicEditions,registerSettings} from './store.mjs';
import {installSidebarButton} from './sidebar.mjs';
import {registerPurchaseSocket} from './socket.mjs';

let newspaper;
export function openNewspaper(){if(newspaper?.rendered){newspaper.bringToFront();return newspaper;}const app=new NewspaperApp();app.onClosed=()=>{if(newspaper===app)newspaper=null;};newspaper=app;app.render(true);return app;}

Hooks.once('init',()=>registerSettings());
Hooks.once('ready',async()=>{try{await initializeStore();registerPurchaseSocket();}catch(error){console.error(MODULE_ID,error);ui.notifications.error(`Jornal da Queda: ${error.message}`);}const module=game.modules.get(MODULE_ID);if(module){const descriptor=Object.freeze({family:'quedaco',contractVersion:1,id:MODULE_ID,title:module.title,version:module.version,capabilities:Object.freeze({newspaper:true,createEdition:true,purchaseEdition:true,playerJournalDelivery:true}),open(){return openNewspaper();},getAccessibleJournals(){return Array.from(game.journal??[]).filter(j=>j.getFlag?.(MODULE_ID,'editionId')&&j.testUserPermission?.(game.user,'OBSERVER')).map(j=>({uuid:j.uuid,label:j.name}));},getStatus(){return {ready:true};}});module.api=descriptor;Hooks.callAll('quedaco:register',descriptor);}queueMicrotask(()=>installSidebarButton(openNewspaper,ui.sidebar,ui.sidebar?.element));});
Hooks.on('renderSidebar',(application,html)=>installSidebarButton(openNewspaper,application,html));
Hooks.on('renderApplicationV2',(application,html)=>{if(application===ui.sidebar||application?.constructor?.name==='Sidebar')installSidebarButton(openNewspaper,application,html);});
Hooks.on('updateSetting',setting=>{if(setting.key!==`${MODULE_ID}.publicEditions`)return;refreshPublicEditions(game.settings.get(MODULE_ID,'publicEditions'));if(newspaper?.rendered)newspaper.render(true);});

Hooks.on('quedaco:catalog-updated',()=>{if(newspaper?.rendered&&newspaper.mode!=='edit')newspaper.render(true);});
