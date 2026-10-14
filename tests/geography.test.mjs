import test from 'node:test';
import assert from 'node:assert/strict';
import {getGeography} from '../src/geography.mjs';

test('Jornal usa cadastro ativo, reflete alterações e conserva fallback independente',()=>{
  let catalog={regions:[{id:'novo',name:'Nova região'}],places:[{id:'vila',name:'Vila',regionId:'novo'}]};
  const module={active:true,api:{family:'quedaco',capabilities:{worldCatalog:true},getWorldCatalog:()=>structuredClone(catalog)}};
  const game={modules:new Map([['quedaco',module]])};
  assert.equal(getGeography(game).places[0].id,'vila');
  catalog.places[0].name='Vila nova';assert.equal(getGeography(game).places[0].name,'Vila nova');
  module.active=false;assert.ok(getGeography(game).places.some(p=>p.id==='alberich'));
  module.active=true;module.api.getWorldCatalog=()=>{throw Error('Indisponível');};assert.equal(getGeography(game).regions.length,10);
});
