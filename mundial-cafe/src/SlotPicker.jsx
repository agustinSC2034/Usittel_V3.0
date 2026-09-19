import {useState} from 'react';
import {Check,ArrowLeftRight,Plus,Search} from 'lucide-react';
import {FoodIcon} from './ThemeArt';

export function SlotPicker({tournament,index,side,onChoose,onAdd}) {
  const [search,setSearch]=useState('');
  const current=tournament.rounds[0][index].teams[side];
  const places=tournament.cafes.filter(c=>`${c.name} ${c.address}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="slot-picker">
    <p>Elegí entre los lugares de este torneo.</p>
    <label className="search-field"><Search size={17}/><input aria-label="Buscar lugar del torneo" placeholder="Buscar por nombre o barrio" value={search} onChange={e=>setSearch(e.target.value)} autoFocus/></label>
    <div className="place-options">{places.map(c=>{
      const assigned=tournament.rounds[0].some(m=>m.teams.includes(c.id));
      return <button key={c.id} onClick={()=>onChoose(c.id)} className={current===c.id?'chosen':''}><FoodIcon theme={tournament.theme} size={22}/><span><strong>{c.name}</strong><small>{current===c.id?'Seleccionado':assigned?'Ya está en otro cruce · intercambiar':c.address||'Disponible para este cruce'}</small></span>{current===c.id?<Check size={18}/>:assigned?<ArrowLeftRight size={17}/>:null}</button>;
    })}{!places.length&&<p className="picker-empty">{tournament.cafes.length?'No encontramos ese lugar.':'Todavía no agregaste lugares a este torneo.'}</p>}</div>
    {current&&<button className="clear-slot" onClick={()=>onChoose(null)}>Dejar este espacio por definir</button>}
    <button className="primary form-submit" onClick={onAdd}><Plus size={18}/>Agregar un lugar</button>
    <p className="hint">Cambiar participantes borra los puntajes del cruce y sus avances dependientes. Si el lugar ya está asignado, intercambia su posición.</p>
  </div>;
}
