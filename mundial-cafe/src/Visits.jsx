import {useState} from 'react';
import {Plus,Search,Pencil,Trash2,MapPin,NotebookPen} from 'lucide-react';
import {THEMES,today,visitScore,visitSummary,validateVisit,money} from './library';
import {FoodIcon} from './ThemeArt';

const VISIT_CRITERIA=['Sabor','Atención','Ambiente'];
export function Visits({visits,onAdd,onEdit,onDelete}) {
  const [search,setSearch]=useState(''),[theme,setTheme]=useState('all');
  const filtered=visits.filter(v=>(theme==='all'||v.theme===theme)&&`${v.place} ${v.dish} ${v.address}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).toSorted((a,b)=>b.date.localeCompare(a.date));
  return <section className="collection visits">
    <div className="section-heading"><div><h2>Visitas registradas</h2><p>Evaluaciones de lugares fuera de los torneos.</p></div><button className="primary" onClick={onAdd}><Plus size={18}/>Anotar visita</button></div>
    {visits.length>0&&<div className="visit-filters"><label className="search-field"><Search size={18}/><input aria-label="Buscar visitas" placeholder="Buscar por lugar, plato o barrio" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filtrar visitas por comida" value={theme} onChange={e=>setTheme(e.target.value)}><option value="all">Todas las comidas</option>{Object.entries(THEMES).map(([id,t])=><option key={id} value={id}>{t.name}</option>)}</select></div>}
    {!filtered.length?<div className="panel empty"><NotebookPen size={36}/><h3>{visits.length?'No hay coincidencias':'No hay visitas registradas'}</h3><p>{visits.length?'Probá con otro nombre o tipo de comida.':'Registrá el lugar, el pedido, el precio y los puntajes.'}</p>{!visits.length&&<button onClick={onAdd}>Anotar la primera visita</button>}</div>:<div className="visit-list">{filtered.map(v=><article className="visit-card" key={v.id} style={{'--accent':THEMES[v.theme].accent}}>
      <div className="visit-icon"><FoodIcon theme={v.theme} size={26}/></div><div className="visit-body"><div className="visit-meta"><small>{new Date(v.date+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})} · {THEMES[v.theme].name}</small></div><h3>{v.place}</h3><p className="dish">{v.dish}</p>{v.address&&<small className="address"><MapPin size={13}/>{v.address}</small>}<p className="visit-summary">{visitSummary(v)}</p>{v.note&&<p className="personal-note">“{v.note}”</p>}<details className="visit-details"><summary>Ver puntajes</summary><table><thead><tr><th>Criterio</th>{v.tasters.map((t,i)=><th key={i}>{t}</th>)}</tr></thead><tbody>{VISIT_CRITERIA.map((c,i)=><tr key={c}><td>{c}</td><td>{v.scores[i*2]}</td><td>{v.scores[i*2+1]}</td></tr>)}</tbody></table></details></div>
      <div className="visit-side"><div className="rating"><strong>{visitScore(v).toFixed(1).replace('.',',')}</strong><span>/10</span></div><small>{v.price!==''?money(v.price,v.currency):'Sin precio'}</small><div><button aria-label={`Editar visita a ${v.place}`} onClick={()=>onEdit(v)}><Pencil size={16}/></button><button aria-label={`Eliminar visita a ${v.place}`} onClick={()=>onDelete(v)}><Trash2 size={16}/></button></div></div>
    </article>)}</div>}
  </section>;
}

export function VisitForm({visit,profile,knownPlaces,onSubmit}) {
  const [theme,setTheme]=useState(visit?.theme||'cafe');
  const [scores,setScores]=useState(visit?.scores||Array(6).fill(''));
  const [error,setError]=useState('');
  const tasters=visit?.tasters||profile.tasters;
  function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);try{
    const values={id:visit?.id||crypto.randomUUID(),place:f.get('place').trim(),address:f.get('address').trim(),dish:f.get('dish').trim(),date:f.get('date'),price:f.get('price'),currency:f.get('currency'),note:f.get('note').trim(),theme,scores,tasters:[...tasters]};
    onSubmit(validateVisit(values));
  }catch(err){setError(err.message);}}
  const total=scores.every(s=>s!=='')?scores.reduce((sum,s)=>sum+Number(s),0)/6:null;
  return <form className="visit-form" onSubmit={submit}>
    <div className="two-fields"><label>Lugar<input name="place" list="known-places" maxLength={80} required defaultValue={visit?.place} placeholder="Nombre del lugar" autoFocus/></label><label>Tipo de comida<select value={theme} onChange={e=>setTheme(e.target.value)}>{Object.entries(THEMES).map(([id,t])=><option key={id} value={id}>{t.name}</option>)}</select></label></div>
    <datalist id="known-places">{knownPlaces.map(p=><option key={p} value={p}/>)}</datalist>
    <label>Comida o pedido<input name="dish" maxLength={160} required defaultValue={visit?.dish} placeholder="Dos cafés con leche y cuatro medialunas"/></label>
    <div className="two-fields"><label>Dirección o barrio<input name="address" maxLength={160} defaultValue={visit?.address||profile.city}/></label><label>Fecha<input name="date" type="date" required defaultValue={visit?.date||today()}/></label></div>
    <div className="two-fields"><label>Precio total <span className="optional">(opcional)</span><input name="price" type="number" min="0" max="1000000000000" step="0.01" defaultValue={visit?.price} placeholder="0,00"/></label><label>Moneda<select name="currency" defaultValue={visit?.currency||'ARS'}><option value="ARS">Pesos argentinos</option><option value="USD">Dólares</option><option value="EUR">Euros</option></select></label></div>
    <table className="scores"><thead><tr><th>Puntajes <span>(1 a 10)</span></th>{tasters.map((t,i)=><th key={i}>{t}</th>)}</tr></thead><tbody>{VISIT_CRITERIA.map((c,i)=><tr key={c}><td>{c}</td>{tasters.map((t,j)=><td key={j}><input required aria-label={`${c}, ${t}`} type="number" min="1" max="10" step="0.1" placeholder="—" value={scores[i*2+j]} onChange={e=>setScores(prev=>prev.map((s,n)=>n===i*2+j?e.target.value:s))}/></td>)}</tr>)}</tbody></table>
    <p className="score-explanation">{total!==null?`Nota de la visita: ${total.toFixed(1).replace('.',',')}/10. `:''}Promedio de las seis notas, con el mismo peso. El precio se registra aparte.</p>
    <label>Comentarios<textarea name="note" maxLength={2000} rows={3} defaultValue={visit?.note} placeholder="Comentarios sobre la visita (opcional)"/></label>
    {error&&<p className="error" role="alert">{error}</p>}<button className="primary form-submit">Guardar visita</button>
  </form>;
}

