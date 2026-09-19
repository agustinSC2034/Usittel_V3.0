import {useState} from 'react';
import {ArrowUpRight,Plus,Trash2,Trophy} from 'lucide-react';
import {THEMES,themeFor,criteriaFor,createTournament} from './library';
import {ThemeArt,FoodIcon} from './ThemeArt';

export function Tournaments({library,onOpen,onCreate,onDelete}) {
  return <section className="collection">
    <div className="section-heading"><div><h2>Torneos guardados</h2></div><button className="primary" onClick={onCreate}><Plus size={18}/>Nuevo torneo</button></div>
    {library.tournaments.length===0?<div className="panel empty"><Trophy size={36}/><h3>No hay torneos</h3><p>Creá uno a partir de una plantilla o configurá uno personalizado.</p><button onClick={onCreate}>Crear un torneo</button></div>:<div className="tournament-grid">{library.tournaments.map(t=>{
      const config=themeFor(t),champion=t.cafes.find(c=>c.id===t.rounds.at(-1)[0].winner);
      return <article key={t.id} className="tournament-card" style={{'--accent':config.accent}}>
        <button className="card-open" onClick={()=>onOpen(t.id)} aria-label={`Abrir ${t.title}`}>
          <div className="card-art"><ThemeArt theme={t.theme}/><span className="card-status">{champion?'Finalizado':library.activeId===t.id?'Torneo seleccionado':t.cafes.length?'En curso':'Sin iniciar'}</span></div>
          <div className="card-copy"><small><FoodIcon theme={t.theme} size={15}/>{config.name} · {t.city}</small><h3>{t.title}</h3><p>{champion?`Campeón: ${champion.name}`:`${t.cafes.length} lugares · ${t.rounds[0].length*2} espacios`}</p><span className="text-link">Ver fixture <ArrowUpRight size={17}/></span></div>
        </button>
        <button className="card-delete" aria-label={`Eliminar ${t.title}`} onClick={()=>onDelete(t)}><Trash2 size={16}/></button>
      </article>;
    })}</div>}
    <p className="collection-foot">Cada torneo tiene sus propios lugares, criterios y resultados.</p>
  </section>;
}

export function TournamentForm({tournament,profile,onSubmit}) {
  const [theme,setTheme]=useState(tournament?.theme||'cafe');
  const [title,setTitle]=useState(tournament?.title||THEMES.cafe.title);
  const [criteria,setCriteria]=useState(tournament?criteriaFor(tournament):THEMES.cafe.criteria);
  const [error,setError]=useState('');
  function chooseTheme(value){setTheme(value);if(!tournament){setTitle(THEMES[value].title);setCriteria([...THEMES[value].criteria]);}}
  function submit(e){
    e.preventDefault();const data=new FormData(e.currentTarget);
    try {
      const names=[data.get('one').trim(),data.get('two').trim()];
      if(!title.trim()||criteria.some(c=>!c.trim())||names.some(n=>!n))throw Error('Completá el nombre, los participantes y los tres criterios.');
      const values={theme,title:title.trim(),city:data.get('city').trim(),tasters:names,criteria:criteria.map(c=>c.trim()),size:Number(data.get('size'))};
      onSubmit(tournament?{...tournament,...values}:createTournament({...values,id:crypto.randomUUID()}));
    }catch(err){setError(err.message);}
  }
  return <form onSubmit={submit} className="tournament-form">
    <fieldset className="theme-choices"><legend>Tipo de torneo</legend>{Object.entries(THEMES).map(([id,config])=><button key={id} type="button" aria-pressed={theme===id} className={theme===id?'chosen':''} onClick={()=>chooseTheme(id)}><FoodIcon theme={id} size={21}/><span>{config.name}</span></button>)}</fieldset>
    <label>Nombre del torneo<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <div className="two-fields"><label>Ciudad<input name="city" maxLength={80} defaultValue={tournament?.city??profile.city}/></label><label>Lugares en el fixture<select name="size" defaultValue={tournament?tournament.rounds[0].length*2:8}>{[2,4,8,16,32,64].map(n=><option key={n} value={n}>{n} espacios</option>)}</select></label></div>
    <div className="two-fields">{(tournament?.tasters||profile.tasters).map((name,i)=><label key={i}>Participante {i+1}<input name={i===0?'one':'two'} required maxLength={30} defaultValue={name}/></label>)}</div>
    <fieldset className="criteria-fields"><legend>Criterios de evaluación <small>Del 1 al 10, cada uno</small></legend>{criteria.map((value,i)=><label key={i}>Criterio {i+1}<input required maxLength={35} value={value} onChange={e=>setCriteria(prev=>prev.map((v,j)=>i===j?e.target.value:v))}/></label>)}</fieldset>
    {tournament&&<p className="hint">Cambiar el tamaño o los criterios pide confirmación antes de reiniciar resultados. El tema solo cambia la estética.</p>}
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="primary form-submit">{tournament?'Guardar cambios':'Crear torneo'}</button>
  </form>;
}


