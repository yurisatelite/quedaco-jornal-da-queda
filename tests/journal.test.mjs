import test from 'node:test';
import assert from 'node:assert/strict';
import {EXAMPLE_EDITION} from '../src/model.mjs';
import {publicJournalHTML,purchasingUsers} from '../src/journal.mjs';

test('Journal comprado contém texto público sem bastidores',()=>{const html=publicJournalHTML(EXAMPLE_EDITION);assert.match(html,/A ESTRADA DO NORTE CAIU/);assert.doesNotMatch(html,/desabamento não foi natural|Bastidores|Verdade:/);});
test('Journal é liberado para solicitante e outros donos da personagem',()=>{const users=[{id:'a'},{id:'b'},{id:'c'}],game={users},actor={testUserPermission:user=>user.id==='b'};assert.deepEqual(purchasingUsers(game,actor,'a'),['a','b']);});
