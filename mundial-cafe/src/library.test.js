import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,setTeam,saveMatch} from './model.js';
import {LIBRARY_KEY,migrateLegacy,createTournament,updateTournament,assignSlot,readLibrary,validateLibrary,validateVisit,visitScore,visitSummary,THEMES} from './library.js';

function legacy(){let t=initial();t.title='Nuestro café de siempre';t.cafes=[{id:'a',name:'Café A',address:'Morón'},{id:'b',name:'Café B',address:''}];t=setTeam(t,0,0,'a');t=setTeam(t,0,1,'b');return saveMatch(t,0,0,{scores:[Array(6).fill('9'),Array(6).fill('7')],date:'2026-09-19',note:'Buen café'});}
const visit=()=>({id:'v1',place:'Lugar A',dish:'Pizza de muzzarella',address:'Morón',date:'2026-09-19',price:'15000',currency:'ARS',theme:'pizza',scores:['8','9','8','9','8','9'],tasters:['Yo','Ella'],note:'Volveríamos.'});

test('migration preserves all participants, names, dates, scores and winner; original stays untouched',()=>{
  const old=legacy(),snapshot=JSON.stringify(old),library=migrateLegacy(old);
  assert.equal(library.tournaments[0].title,old.title);assert.deepEqual(library.tournaments[0].rounds,old.rounds);assert.deepEqual(library.tournaments[0].cafes,old.cafes);assert.equal(library.activeId,library.tournaments[0].id);validateLibrary(library);assert.equal(JSON.stringify(old),snapshot);
});
test('read chooses v2 over legacy and never writes during migration',()=>{
  const old=legacy(),data=new Map([['mundial-cafe-v1',JSON.stringify(old)]]),storage={getItem:key=>data.get(key)??null};
  const library=readLibrary(storage);assert.equal(data.size,1);library.tournaments[0].title='Nuevo nombre';data.set(LIBRARY_KEY,JSON.stringify(library));assert.equal(readLibrary(storage).tournaments[0].title,'Nuevo nombre');data.set(LIBRARY_KEY,'broken');assert.throws(()=>readLibrary(storage));
});
test('multiple tournament updates stay isolated and criteria match food type',()=>{
  let library=migrateLegacy(legacy());const original=JSON.stringify(library.tournaments[0]);
  const pizza=createTournament({id:'pizza1',theme:'pizza',size:4,tasters:['Ana','Agus']});library={...library,tournaments:[...library.tournaments,pizza],activeId:pizza.id};
  library=updateTournament(library,{...pizza,title:'La mejor pizza de Morón'});
  assert.equal(JSON.stringify(library.tournaments[0]),original);assert.deepEqual(library.tournaments[1].criteria,THEMES.pizza.criteria);validateLibrary(library);
});
test('slot picker swaps occupied entrants and invalidates affected results without duplicates',()=>{
  const t=legacy();const swapped=assignSlot(t,0,0,'b');assert.deepEqual(swapped.rounds[0][0].teams,['b','a']);assert.equal(swapped.rounds[0][0].winner,null);assert.equal(swapped.rounds[1][0].teams[0],null);
  const moved=assignSlot(swapped,1,0,'a');assert.equal(moved.rounds[0][0].teams[1],null);assert.equal(moved.rounds[0][1].teams[0],'a');assert.throws(()=>assignSlot(t,0,0,'missing'));assert.strictEqual(assignSlot(t,0,0,'a'),t);
});
test('standalone visit score and note use entered facts; zero and missing price remain distinct',()=>{
  const v=validateVisit(visit());assert.equal(visitScore(v),8.5);assert.match(visitSummary(v),/Pizza de muzzarella en Lugar A/);assert.match(visitSummary(v),/8,5\/10/);assert.match(visitSummary({...v,price:'0'}),/Total:/);assert.doesNotMatch(visitSummary({...v,price:''}),/Total:/);assert.throws(()=>validateVisit({...v,price:'-1'}));assert.throws(()=>validateVisit({...v,scores:['',9,8,9,8,9]}));
});
test('full backup roundtrip keeps visits, profile and active selection',()=>{
  const library=migrateLegacy(legacy());library.visits=[visit()];assert.deepEqual(validateLibrary(JSON.parse(JSON.stringify(library))),library);assert.throws(()=>validateLibrary({...library,activeId:'missing'}));assert.throws(()=>validateLibrary({...library,visits:[visit(),visit()]}));assert.throws(()=>validateLibrary({...library,tournaments:[library.tournaments[0],library.tournaments[0]]}));
});
