import {useState,useEffect} from 'react';
import {Croissant,FileText,MapPin,ChevronDown} from 'lucide-react';
import {average,canAdvanceBye} from './model';
import {criteriaFor} from './library';
import {FoodIcon} from './ThemeArt';

export function MatchEditor({state,selected,onPick,onSave,onDraft,onBye,onDirty}) {
  const [r,i]=selected,m=state.rounds[r][i];
  const [scores,setScores]=useState(structuredClone(m.scores));
  const [date,setDate]=useState(m.date),[note,setNote]=useState(m.note),[side,setSide]=useState(0),[tie,setTie]=useState(m.winner||''),[error,setError]=useState('');
  const dirty=JSON.stringify(scores)!==JSON.stringify(m.scores)||date!==m.date||note!==m.note;
  useEffect(()=>{onDirty(dirty);return ()=>onDirty(false);},[dirty,onDirty]);
  const means=scores.map(average),isTie=means[0]!==null&&means[0]===means[1];
  const cafe=id=>state.cafes.find(c=>c.id===id);
  function submit(e){e.preventDefault();try{onSave({scores,date,note},tie);setError('');}catch(e){setError(e.message);}}
  return <aside className="panel editor" id="match-editor">
    <h2>Este fin de semana</h2><p>Registrá sus puntajes y guardá el resultado.</p>
    <form onSubmit={submit}>
      <label className="date-field">Fecha del encuentro<input type="date" value={date} onInput={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)}/></label>
      <div className="versus">{m.teams.map((id,j)=><div key={j}><button type="button" className="team-select" disabled={r>0} onClick={()=>onPick(i,j)} aria-label={`Elegir lugar ${j===0?'A':'B'} del panel`}><FoodIcon theme={state.theme} size={21}/><span>{cafe(id)?.name||'Por definir'}</span>{r===0&&<ChevronDown size={15}/>}</button><small><MapPin size={13}/>{cafe(id)?.address||state.city}</small></div>)}</div>
      {r>0&&!m.teams.every(Boolean)&&<p className="hint">Los lugares se definen al guardar las rondas anteriores.</p>}
      {canAdvanceBye(state,r,i)&&!m.winner&&<button type="button" className="bye" onClick={onBye}>Avanzar sin rival (pase libre)</button>}
      <div className="score-tabs" role="group" aria-label="Lugar a puntuar">{m.teams.map((id,j)=><button type="button" aria-pressed={side===j} className={side===j?'active':''} onClick={()=>setSide(j)} key={j}>{cafe(id)?.name||`Lugar ${j===0?'A':'B'}`}</button>)}</div>
      <table className="scores"><thead><tr><th>Puntajes <span>(1 a 10)</span></th>{state.tasters.map((t,j)=><th key={j}>{t}</th>)}</tr></thead><tbody>{criteriaFor(state).map((label,k)=><tr key={k}><td>{state.theme==='cafe'&&k>0?<Croissant size={21}/>:<FoodIcon theme={state.theme} size={21}/>} {label}</td>{state.tasters.map((t,j)=><td key={j}><input aria-label={`${label}, ${t}`} type="number" min="1" max="10" step="0.1" placeholder="—" value={scores[side][k*2+j]} onChange={e=>setScores(prev=>prev.map((s,x)=>x===side?s.map((v,n)=>n===k*2+j?e.target.value:v):s))}/></td>)}</tr>)}</tbody></table>
      {isTie&&<label className="tie">Empataron. ¿Quién pasa?<select value={tie} onChange={e=>setTie(e.target.value)}><option value="">Elegir ganador</option>{m.teams.filter(Boolean).map(id=><option key={id} value={id}>{cafe(id)?.name}</option>)}</select></label>}
      <label className="notes">Comentarios del encuentro<textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="Comentarios (opcional)" rows={2}/></label>
      {dirty&&<p className="draft-indicator">Tenés cambios sin guardar.</p>}
      {error&&<p role="alert" className="error">{error}</p>}
      <button className="primary save" type="submit">Guardar resultado</button><button className="draft" type="button" onClick={()=>{try{onDraft({scores,date,note});setError('')}catch(e){setError(e.message)}}}>Guardar para después</button>
      <div className="match-info"><FileText size={23}/><span>{m.winner?<><strong>{cafe(m.winner)?.name} pasa de ronda.</strong><br/>Podés corregir los puntajes cuando quieras.</>:<>Todavía no hay resultado para este encuentro.<br/><span>Completá las notas de ambos lugares.</span></>}</span></div>
    </form>
  </aside>;
}

