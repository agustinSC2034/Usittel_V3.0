import {Pencil,Trash2} from 'lucide-react';
import {themeFor} from './library';
import {FoodIcon} from './ThemeArt';
export function CafeList({state,onEdit,onDelete,onAdd}) {
  const theme=themeFor(state);
  return <section className="panel cafe-list"><div className="section-heading"><div><h2>Los lugares del torneo</h2><p>Agregá {theme.plural} y después elegí sus posiciones tocando el fixture.</p></div><button className="primary" onClick={onAdd}>Agregar {theme.singular}</button></div>
    {state.cafes.length===0?<div className="empty"><FoodIcon theme={state.theme} size={36}/><h3>No hay participantes</h3><p>Agregá los lugares que van a competir en este torneo.</p></div>:state.cafes.map(c=><div className="cafe-row" key={c.id}><FoodIcon theme={state.theme} size={23}/><div><h3>{c.name}</h3><small>{c.address||state.city} · {state.rounds[0].some(m=>m.teams.includes(c.id))?'En el fixture':'Sin asignar'}</small></div><button aria-label={`Editar ${c.name}`} onClick={()=>onEdit(c)}><Pencil size={17}/></button><button aria-label={`Quitar ${c.name}`} onClick={()=>onDelete(c)}><Trash2 size={17}/></button></div>)}
  </section>;
}

