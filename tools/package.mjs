import {cp,mkdir,readFile,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(join(root,'module.json'),'utf8'));
const target=join(root,'dist',`${manifest.id}-${manifest.version}`,manifest.id);
await rm(join(root,'dist',`${manifest.id}-${manifest.version}`),{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const entry of ['module.json','README.md','LICENSE','src','styles','assets','lang','vendor'])await cp(join(root,entry),join(target,entry),{recursive:true});
console.log(`Pacote de desenvolvimento: ${target}`);
