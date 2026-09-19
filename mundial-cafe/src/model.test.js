import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,setTeam,saveMatch,removeCafe,validate,average,saveDraft,advanceBye,canAdvanceBye} from './model.js';
function seeded(){let s=initial();s.cafes=Array.from({length:8},(_,i)=>({id:String(i),name:`Café ${i}`,address:''}));s.cafes.forEach((c,i)=>s=setTeam(s,Math.floor(i/2),i%2,c.id));return s;}
const result=(a,b)=>({scores:[Array(6).fill(a),Array(6).fill(b)],date:'2026-09-19',note:''});
test('empty tournament has editable slots and round structure',()=>{assert.equal(initial().rounds.flat().length,7);assert.deepEqual(validate(initial()),initial());});
test('winner progresses; changing earlier winner invalidates downstream result',()=>{let s=seeded();s=saveMatch(s,0,0,result(9,7));s=saveMatch(s,0,1,result(9,7));s=saveMatch(s,1,0,result(9,7));assert.equal(s.rounds[2][0].teams[0],'0');s=saveMatch(s,0,0,result(7,9));assert.equal(s.rounds[1][0].teams[0],'1');assert.equal(s.rounds[1][0].winner,null);assert.equal(s.rounds[2][0].teams[0],null);validate(s);});
test('removing cafe clears results and duplicate placement rejected',()=>{let s=seeded();assert.throws(()=>setTeam(s,0,0,'2'));s=saveMatch(s,0,0,result(9,7));s=removeCafe(s,'0');assert.equal(s.rounds[0][0].teams[0],null);assert.equal(s.rounds[1][0].teams[0],null);validate(s);});
test('incomplete and out of range marks cannot decide winner; ties explicit',()=>{const s=seeded();assert.equal(average(['',8,8,8,8,8]),null);assert.throws(()=>saveMatch(s,0,0,result(11,7)));assert.throws(()=>saveMatch(s,0,0,result(8,8)));assert.equal(saveMatch(s,0,0,result(8,8),'1').rounds[0][0].winner,'1');});
test('backup roundtrip validates and rejects malformed or inconsistent state',()=>{const s=saveMatch(seeded(),0,0,result(9,7));assert.deepEqual(validate(JSON.parse(JSON.stringify(s))),s);assert.throws(()=>validate({version:1}));s.rounds[1][0].teams[0]='7';assert.throws(()=>validate(s));});

test('draft saves a date without ratings; editing scores reopens downstream rounds',()=>{let s=seeded();s=saveDraft(s,0,0,{scores:s.rounds[0][0].scores,date:'2026-09-26',note:'Visita uno'});assert.equal(s.rounds[0][0].date,'2026-09-26');assert.equal(s.rounds[0][0].winner,null);s=saveMatch(s,0,0,result(9,7));s=saveDraft(s,0,0,{...result(9,7),date:'2026-10-03'});assert.equal(s.rounds[0][0].winner,'0');s=saveDraft(s,0,0,result(6,7));assert.equal(s.rounds[1][0].teams[0],null);validate(s);});

test('odd participant counts support explicit byes without bypassing pending rivals',()=>{let s=initial();s.cafes=[{id:'a',name:'A',address:''},{id:'b',name:'B',address:''}];s=setTeam(s,0,0,'a');s=advanceBye(s,0,0);assert.equal(canAdvanceBye(s,1,0),true);s=setTeam(s,1,0,'b');assert.equal(canAdvanceBye(s,1,0),false);assert.throws(()=>advanceBye(s,1,0));validate(s);});
