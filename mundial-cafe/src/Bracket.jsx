import {Pencil, Trophy, ChevronDown} from 'lucide-react';
import {FoodIcon} from './ThemeArt';
export const roundName = count => ({1:'Final',2:'Semifinal',4:'Cuartos de final',8:'Octavos de final',16:'Dieciseisavos',32:'Primera ronda'}[count]);

export function Bracket({state,selected,onSelect,onPick}) {
  const name=id=>state.cafes.find(c=>c.id===id)?.name||'Por definir';
  return <div className="bracket-scroll" tabIndex={0} aria-label="Cuadro del torneo, desplazable horizontalmente">
    <div className="bracket" style={{minWidth:state.rounds.length*245,height:Math.max(590,state.rounds[0].length*130+76)}}>
      {state.rounds.map((round,r)=><section className="round" key={r}>
        <header><h3>{roundName(round.length)}</h3><small>{round.length===1?'El último encuentro':`${round.length} encuentros`}</small></header>
        <div className="round-matches">
          {r<state.rounds.length-1&&<svg className="connectors" viewBox="0 0 48 100" preserveAspectRatio="none" aria-hidden="true">{Array.from({length:round.length/2},(_,pair)=>{const a=(pair*2+.5)/round.length*100,b=(pair*2+1.5)/round.length*100;return <path key={pair} d={`M0 ${a} H24 V${b} H0 M24 ${(a+b)/2} H48`}/>})}</svg>}
          {round.map((m,i)=><div className="match-wrap" key={m.id}>
            <button className="match-date" aria-label={`Editar ${roundName(round.length)}, encuentro ${i+1}`} onClick={()=>onSelect([r,i])}>{m.date?new Date(m.date+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'}):'Elegir fecha'}<Pencil size={14}/></button>
            <div className={`match ${selected[0]===r&&selected[1]===i?'selected':''}`}>
              {m.teams.map((id,j)=><button className={`team ${!id?'muted':''} ${m.winner===id&&id?'winner':''}`} key={j} onClick={()=>r===0?onPick(i,j):onSelect([r,i])} aria-label={r===0?`Elegir lugar ${j===0?'A':'B'} del encuentro ${i+1}: ${name(id)}`:`Ver ${roundName(round.length)}, encuentro ${i+1}: ${name(id)}`}>
                <FoodIcon theme={state.theme} size={18}/><span>{name(id)}</span>{m.winner===id&&id?<Trophy size={15}/>:r===0?<ChevronDown className="slot-arrow" size={14}/>:null}
              </button>)}
            </div>
          </div>)}
        </div>
      </section>)}
    </div>
  </div>;
}
