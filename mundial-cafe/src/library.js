import {initial, rounds, validate, average, setTeam} from './model.js';

export const LIBRARY_KEY = 'sobremesa-library-v2';
export const THEMES = {
  cafe: {name: 'Café y medialunas', title: 'Mundial de café y medialunas', criteria: ['Café', 'Medialuna 1', 'Medialuna 2'], accent: '#ae5036', image: 'coffee-medialunas.png', singular: 'cafetería', plural: 'cafeterías'},
  pizza: {name: 'Pizza', title: 'Mundial de pizza', criteria: ['Masa', 'Salsa y queso', 'Sabor'], accent: '#a44532', image: 'pizza.png', singular: 'pizzería', plural: 'pizzerías'},
  ramen: {name: 'Ramen', title: 'Mundial de ramen', criteria: ['Caldo', 'Fideos', 'Toppings'], accent: '#647257', image: 'ramen.png', singular: 'lugar', plural: 'lugares'},
  empanadas: {name: 'Empanadas', title: 'Mundial de empanadas', criteria: ['Masa', 'Relleno', 'Sabor'], accent: '#a06b32', image: 'empanadas.png', singular: 'lugar', plural: 'lugares'},
  custom: {name: 'Personalizado', title: 'Torneo personalizado', criteria: ['Sabor', 'Calidad', 'Experiencia'], accent: '#806755', image: null, singular: 'lugar', plural: 'lugares'},
};

export const themeFor = tournament => THEMES[tournament.theme] || THEMES.cafe;
export const criteriaFor = tournament => tournament.criteria || THEMES.cafe.criteria;
export function upgradeTournament(tournament, id = 'torneo-inicial') {
  return {...structuredClone(tournament), id, theme: tournament.theme || 'cafe', criteria: [...criteriaFor(tournament)]};
}
export function createTournament({id, theme = 'cafe', title, city = 'Morón', tasters = ['Yo', 'Ella'], size = 8, criteria}) {
  if (!Object.hasOwn(THEMES,theme) || ![2,4,8,16,32,64].includes(size)) throw Error('Elegí un tipo y un tamaño de torneo válidos.');
  return {...initial(), id, theme, title: title || THEMES[theme].title, city, tasters: [...tasters], criteria: criteria || [...THEMES[theme].criteria], rounds: rounds(size)};
}
export function migrateLegacy(old = initial()) {
  validate(old);
  return {version: 2, activeId: 'torneo-inicial', profile: {tasters: [...old.tasters], city: old.city}, tournaments: [upgradeTournament(old)], visits: []};
}
export function updateTournament(library, tournament) {
  if (!library.tournaments.some(t => t.id === tournament.id)) throw Error('No se encontró el torneo.');
  return {...library, tournaments: library.tournaments.map(t => t.id === tournament.id ? tournament : t)};
}
export function assignSlot(tournament, index, side, id) {
  if (id && !tournament.cafes.some(c => c.id === id)) throw Error('El lugar no pertenece a este torneo.');
  const current = tournament.rounds[0][index].teams[side];
  if (current === id || (!current && !id)) return tournament;
  let other;
  tournament.rounds[0].forEach((m,i) => m.teams.forEach((t,j) => {if(id && t===id) other=[i,j];}));
  if (!other) return setTeam(tournament,index,side,id);
  // Swap explicitly selected participants; invalidate only affected branches.
  let next = setTeam(tournament, other[0], other[1], null);
  next = setTeam(next,index,side,id);
  return setTeam(next,other[0],other[1],current);
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export const money = (value,currency='ARS') => new Intl.NumberFormat('es-AR',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value));
export const visitScore = visit => average(visit.scores);
export function visitSummary(visit) {
  const score = visitScore(visit);
  return `${visit.dish} en ${visit.place}.${visit.price !== '' ? ` Total: ${money(visit.price,visit.currency)}.` : ''}${score !== null ? ` Nota: ${score.toFixed(1).replace('.',',')}/10.` : ''}`;
}
const bounded = (value,max,required=true) => typeof value==='string' && value.length<=max && (!required || !!value.trim());
export function validateVisit(visit) {
  if(!bounded(visit.id,100)||!bounded(visit.place,80)||!bounded(visit.dish,160)||!bounded(visit.address,160,false)||!bounded(visit.note,2000,false)||!Object.hasOwn(THEMES,visit.theme)||!['ARS','USD','EUR'].includes(visit.currency)||!/^\d{4}-\d{2}-\d{2}$/.test(visit.date)||!Number.isFinite(new Date(visit.date+'T12:00:00').getTime())||!Array.isArray(visit.tasters)||visit.tasters.length!==2||visit.tasters.some(t=>!bounded(t,30))||!Array.isArray(visit.scores)||visit.scores.length!==6||average(visit.scores)===null||(visit.price!=='' && (typeof visit.price!=='string'||!Number.isFinite(Number(visit.price))||Number(visit.price)<0||Number(visit.price)>1e12))) throw Error('Completá el lugar, lo que comieron, la fecha y las seis notas del 1 al 10. El precio es opcional y no puede ser negativo.');
  return visit;
}
export function validateLibrary(data) {
  if(data?.version!==2 || !Array.isArray(data.tournaments)||data.tournaments.length>100||!Array.isArray(data.visits)||data.visits.length>5000||!data.profile||!bounded(data.profile.city,80,false)||!Array.isArray(data.profile.tasters)||data.profile.tasters.length!==2||data.profile.tasters.some(t=>!bounded(t,30))) throw Error('El archivo no es un respaldo válido de la app.');
  const ids = new Set();
  for (const t of data.tournaments) {
    validate(t);
    if(!bounded(t.id,100)||ids.has(t.id)||!Object.hasOwn(THEMES,t.theme)||!Array.isArray(t.criteria)||t.criteria.length!==3||t.criteria.some(c=>!bounded(c,35))) throw Error('Hay un torneo inválido en el respaldo.');
    ids.add(t.id);
  }
  if((data.tournaments.length && !ids.has(data.activeId)) || (!data.tournaments.length && data.activeId!==null)) throw Error('El torneo activo no existe en el respaldo.');
  const visits = new Set();
  for (const v of data.visits) {validateVisit(v);if(visits.has(v.id))throw Error('Hay visitas duplicadas.');visits.add(v.id);}
  return data;
}
export function readLibrary(storage) {
  const raw=storage.getItem(LIBRARY_KEY);
  if(raw!==null) return validateLibrary(JSON.parse(raw));
  const old=storage.getItem('mundial-cafe-v1');
  return migrateLegacy(old===null?initial():JSON.parse(old));
}


