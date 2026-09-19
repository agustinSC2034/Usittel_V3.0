export const KEY = 'mundial-cafe-v1';
export const blankScores = () => ['', '', '', '', '', ''];
export function rounds(size) {
  return Array.from({length: Math.log2(size)}, (_, r) => Array.from({length:size / 2 ** (r+1)}, (_, i) => ({id:`${r}-${i}`, teams:[null,null], date:'', scores:[blankScores(),blankScores()], winner:null, note:''})));
}
export const initial = () => ({version:1,title:'Mundial de café y medialunas',city:'Morón',tasters:['Yo','Ella'],cafes:[],rounds:rounds(8)});
export const average = scores => scores.every(v => v !== '' && Number.isFinite(Number(v)) && Number(v)>=1 && Number(v)<=10) ? scores.reduce((a,b)=>a+Number(b),0)/6 : null;
export function canAdvanceBye(state,r,i){
  const m=state.rounds[r][i];if(m.teams.filter(Boolean).length!==1)return false;
  if(r===0)return true;
  const missing=m.teams[0]?1:0,start=(i*2+missing)*2**(r-1);
  return state.rounds[0].slice(start,start+2**(r-1)).every(match=>match.teams.every(t=>t===null));
}
export function advanceBye(state,r,i){
  if(!canAdvanceBye(state,r,i))throw Error('Todavía falta definir un rival.');
  const next=structuredClone(state),m=next.rounds[r][i];m.winner=m.teams.find(Boolean);m.scores=[blankScores(),blankScores()];return propagate(next);
}
export function propagate(state) {
  for(let r=1;r<state.rounds.length;r++) state.rounds[r].forEach((m,i)=>{
    const teams = [state.rounds[r-1][i*2].winner,state.rounds[r-1][i*2+1].winner];
    if(m.teams.some((t,j)=>t!==teams[j])) Object.assign(m,{teams,scores:[blankScores(),blankScores()],winner:null,note:''});
  });
  return state;
}
export function setTeam(state,index,side,id) {
  const next=structuredClone(state), m=next.rounds[0][index];
  if(id && next.rounds[0].some((match,i)=>match.teams.some((t,j)=>t===id && (i!==index || j!==side)))) throw Error('Este lugar ya participa en otro lugar del fixture.');
  m.teams[side]=id || null;m.scores=[blankScores(),blankScores()];m.winner=null;m.note='';
  return propagate(next);
}
export function removeCafe(state,id) {
  const next=structuredClone(state);next.cafes=next.cafes.filter(c=>c.id!==id);
  next.rounds[0].forEach(m=>{if(m.teams.includes(id)){m.teams=m.teams.map(t=>t===id?null:t);m.scores=[blankScores(),blankScores()];m.winner=null;m.note='';}});
  return propagate(next);
}
export function saveMatch(state,r,i,values,tie) {
  const next=structuredClone(state),m=next.rounds[r][i];
  if(!m.teams.every(Boolean)) throw Error('Elegí los dos lugares antes de guardar un resultado.');
  const means=values.scores.map(average);
  if(means.some(v=>v===null)) throw Error('Completá las seis notas de cada lugar, del 1 al 10.');
  if(means[0]===means[1] && !m.teams.includes(tie)) throw Error('Hay empate. Elijan qué lugar pasa de ronda.');
  Object.assign(m,values,{winner:means[0]===means[1]?tie:m.teams[means[0]>means[1]?0:1]});
  return propagate(next);
}
export function saveDraft(state,r,i,values) {
  const next=structuredClone(state),m=next.rounds[r][i];
  if(values.scores.some(s=>s.some(v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)<1||Number(v)>10))))throw Error('Las notas deben estar entre 1 y 10.');
  const changed=JSON.stringify(m.scores)!==JSON.stringify(values.scores);
  Object.assign(m,values);if(changed)m.winner=null;
  return propagate(next);
}
export function validate(data) {
  if(data?.version!==1 || typeof data.title!=='string' || !data.title.trim() || data.title.length>100 || typeof data.city!=='string' || !Array.isArray(data.tasters) || data.tasters.length!==2 || data.tasters.some(t=>typeof t!=='string'||!t.trim()||t.length>30) || !Array.isArray(data.cafes) || data.cafes.length>64 || !Array.isArray(data.rounds) || data.rounds.length<1 || data.rounds.length>6) throw Error('El archivo no es un respaldo válido.');
  const ids=new Set(); data.cafes.forEach(c=>{if(typeof c.id!=='string'||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||typeof c.address!=='string')throw Error('Cafeterías inválidas.');ids.add(c.id);});
  const assigned=new Set();
  data.rounds.forEach((round,r)=>{if(!Array.isArray(round)||round.length!==2**(data.rounds.length-r-1))throw Error('Fixture inválido.');round.forEach((m,i)=>{
    if(m.id!==`${r}-${i}` || !Array.isArray(m.teams)||m.teams.length!==2||m.teams.some(t=>t!==null&&!ids.has(t))||!Array.isArray(m.scores)||m.scores.length!==2||m.scores.some(s=>!Array.isArray(s)||s.length!==6||s.some(v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)<1||Number(v)>10)))||typeof m.date!=='string'||typeof m.note!=='string'||(m.winner!==null&&!m.teams.includes(m.winner)))throw Error('Encuentro inválido.');
    if(r===0)m.teams.filter(Boolean).forEach(t=>{if(assigned.has(t))throw Error('Lugar duplicado en el fixture.');assigned.add(t);});
    if(r>0 && m.teams.some((t,j)=>t!==data.rounds[r-1][i*2+j].winner))throw Error('Avances inconsistentes.');
    if(m.winner&&!canAdvanceBye(data,r,i)){const a=m.scores.map(average);if(!m.teams.every(Boolean)||a.includes(null)||(a[0]!==a[1]&&m.winner!==m.teams[a[0]>a[1]?0:1]))throw Error('Resultado inválido.');}
  });});return data;
}

