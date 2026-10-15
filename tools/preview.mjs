import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
// Isolated fixtures: never connects to Foundry or changes world documents.
globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const {NewspaperApp}=await import('../src/app.mjs');
const {SAMPLE_EDITIONS,normalizeEdition}=await import('../src/model.mjs');
const editions=SAMPLE_EDITIONS.map(issue=>normalizeEdition({...issue,writer:'Nália Pedibarro',headline:issue.headline+' — relatos e avisos para os viajantes da região'}));
globalThis.game={user:{isGM:true},actors:[{id:'fixture',name:'Nália Pedibarro',img:'../assets/road-north.svg',type:'character',isOwner:true,hasPlayerOwner:true}]};
const app=new NewspaperApp();app.editions=()=>editions;
const mode=process.argv.includes('--editor')?'editor':'reader';
if(mode==='editor'){app.mode='edit';app.draft=editions[0];}
const content=(await app._renderHTML()).replaceAll('modules/quedaco-jornal-da-queda/assets/','../assets/');
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Prévia — Jornal da Queda</title><link rel="stylesheet" href="../styles/newspaper.css"><style>body{margin:0;background:#071018;font:14px Arial,sans-serif}.application{display:flex;flex-direction:column;width:100vw;height:100dvh}.window-header{display:flex;align-items:center;gap:10px;padding:8px 12px}.window-title{flex:1;margin:0}.window-content{display:flex;flex-direction:column}.window-content>.qd-shell{flex:1}button,input,select,textarea{box-sizing:border-box}button{width:100%;height:32px;line-height:32px}fieldset{min-inline-size:min-content}</style></head><body><section class="application qd-app"><header class="window-header"><h1 class="window-title">QUEDAÇO - Jornal da Queda</h1><button data-action="close" style="width:32px" aria-label="Fechar">×</button></header><div class="window-content">${content}</div></section></body></html>`;
const directory=join(root,'.local');await mkdir(directory,{recursive:true});const output=join(directory,mode==='editor'?'preview-editor.html':'preview.html');await writeFile(output,html);console.log(output);
