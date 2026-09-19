import {Trophy} from 'lucide-react';
import {Bracket,roundName} from './Bracket';
import {MatchEditor} from './MatchEditor';
import {CafeList} from './CafeList';
import {average} from './model';


export function TournamentView({tournament,tab,onTab,selected,onSelect,onPick,revision,onSave,onDraft,onBye,onDirty,onAdd,onEdit,onDelete}) {
  const winner=tournament.cafes.find(c=>c.id===tournament.rounds.at(-1)[0].winner);
  const active=tournament.rounds[selected[0]]?.[selected[1]];
  return <>
    <div className="tournament-subnav" role="group" aria-label="Vistas del torneo">{['Cuadro','Participantes','Resultados'].map(t=><button key={t} aria-pressed={tab===t} className={tab===t?'active':''} onClick={()=>onTab(t)}>{t}</button>)}</div>
    {tab==='Cuadro'?<div className="workspace">
      <section className="panel fixture"><div className="panel-head"><div><h2>Fixture del torneo</h2><p>Tocá un lugar para elegirlo. Editá las fechas y registrá cada encuentro.</p></div></div>
        <Bracket state={tournament} selected={selected} onSelect={onSelect} onPick={onPick}/>
        {winner&&<footer className="panel-foot"><strong>Campeón: {winner.name}</strong></footer>}
      </section>
      {active&&<MatchEditor key={`${tournament.id}-${active.id}-${revision}`} state={tournament} selected={selected} onPick={onPick} onSave={onSave} onDraft={onDraft} onBye={onBye} onDirty={onDirty}/>}
    </div>:tab==='Participantes'?<CafeList state={tournament} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}/>:<section className="panel results"><h2>Resultados</h2><p>El promedio de las seis notas de cada lugar define quién avanza.</p>
      {!tournament.rounds.flat().some(m=>m.winner)?<div className="empty"><Trophy size={36}/><h3>Sin resultados</h3><p>Los encuentros completados van a aparecer acá.</p></div>:tournament.rounds.flatMap((round,r)=>round.filter(m=>m.winner).map(m=><article className="result" key={m.id}><small>{roundName(round.length)} · {m.date||'Sin fecha'}</small><h3>{m.teams.filter(Boolean).map(id=>tournament.cafes.find(c=>c.id===id)?.name).join(' vs. ')}</h3><p>{m.teams.every(Boolean)?m.scores.map(s=>average(s)?.toFixed(2)).join(' — '):'Pase libre'} · Avanza {tournament.cafes.find(c=>c.id===m.winner)?.name}</p>{m.note&&<p>{m.note}</p>}<button onClick={()=>{onTab('Cuadro');onSelect([r,round.indexOf(m)]);}}>Editar encuentro</button></article>))}
    </section>}
  </>;
}


