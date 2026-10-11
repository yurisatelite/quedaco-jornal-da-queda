import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};globalThis.game={user:{isGM:true}};
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),{NewspaperApp}=await import('../src/app.mjs'),{EXAMPLE_EDITION}=await import('../src/model.mjs'),app=new NewspaperApp();
const pages=Array.from({length:EXAMPLE_EDITION.pageCount},(_,index)=>app.renderPage(EXAMPLE_EDITION,index+1)).join('').replaceAll('modules/quedaco-jornal-da-queda/assets/','../assets/');
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Prévia — Jornal da Queda</title><link rel="stylesheet" href="../styles/newspaper.css"><style>body{margin:0;padding:24px;background:#071018}.qd-pages{display:grid;gap:24px}.qd-secret,.qd-gm-notes{display:block}</style></head><body><main class="qd-app"><div class="qd-pages">${pages}</div></main></body></html>`;
const directory=join(root,'.local');await mkdir(directory,{recursive:true});const output=join(directory,'preview.html');await writeFile(output,html);console.log(output);
