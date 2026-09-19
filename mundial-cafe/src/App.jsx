import {useState,useRef,useEffect} from 'react';
import {Trophy,GitBranch,NotebookPen,UserRound,Pencil,Plus,ChevronDown,ArrowLeft} from 'lucide-react';
import {rounds,removeCafe,saveMatch,saveDraft,advanceBye,validate} from './model';
import {LIBRARY_KEY,readLibrary,migrateLegacy,themeFor,criteriaFor,updateTournament,assignSlot,validateLibrary,upgradeTournament} from './library';
import {ThemeArt} from './ThemeArt';
import {TournamentView} from './TournamentView';
import {Tournaments,TournamentForm} from './Tournaments';
import {Visits,VisitForm} from './Visits';
import {Profile} from './Profile';
import {SlotPicker} from './SlotPicker';
import {Dialog} from './Dialog';

function load() {
  try{return {data:readLibrary(localStorage),error:''};}
  catch{return {data:migrateLegacy(),error:'No pudimos leer los datos guardados. Para protegerlos, el guardado está bloqueado. Importá un respaldo desde Perfil o recargá para reintentar.'};}
}
const NAV=[['Fixture',GitBranch],['Torneos',Trophy],['Lugares',NotebookPen],['Perfil',UserRound]];

export default function App() {
  const [loaded]=useState(load);
  const [library,setLibrary]=useState(loaded.data),[blocked,setBlocked]=useState(!!loaded.error),[notice,setNotice]=useState(loaded.error);
  const [screen,setScreen]=useState('Fixture'),[tab,setTab]=useState('Cuadro'),[selected,setSelected]=useState([0,0]);
  const [modal,setModal]=useState(null),[revision,setRevision]=useState(0),[dirty,setDirty]=useState(false);
  const file=useRef();
  const tournament=library.tournaments.find(t=>t.id===library.activeId);
  const theme=tournament?themeFor(tournament):null;
  const knownPlaces=[...new Set([...library.tournaments.flatMap(t=>t.cafes.map(c=>c.name)),...library.visits.map(v=>v.place)])].sort();

  useEffect(()=>{function unload(e){if(dirty){e.preventDefault();e.returnValue='';}}window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[dirty]);
  useEffect(()=>{function changed(e){if(e.key===LIBRARY_KEY){setBlocked(true);setNotice('Los datos cambiaron en otra ventana. Recargá esta página antes de seguir editando.');}}window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[]);

  function commit(next,{restore=false,message='Guardado en este navegador.'}={}) {
    if(blocked&&!restore)throw Error('El guardado está bloqueado para proteger tus datos. Recargá o importá un respaldo desde Perfil.');
    validateLibrary(next);
    try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(next));}
    catch{throw Error('No pudimos guardar. Puede faltar espacio en el navegador. Exportá un respaldo y volvé a intentar.');}
    setLibrary(next);setBlocked(false);setNotice(message);setRevision(r=>r+1);setDirty(false);
  }
  function perform(action){try{action();}catch(e){setNotice(e.message);}}
  function guard(action){if(dirty)setModal({type:'unsaved',action});else action();}
  function go(next){guard(()=>{setScreen(next);window.scrollTo({top:0,behavior:'instant'});});}
  function commitTournament(next){commit(updateTournament(library,next));}
  function openTournament(id){guard(()=>perform(()=>{commit({...library,activeId:id});setSelected([0,0]);setTab('Cuadro');setScreen('Fixture');window.scrollTo({top:0,behavior:'instant'});}));}
  function pick(index,side){guard(()=>{setSelected([0,index]);setModal({type:'slot',index,side});});}
  function selectMatch(value){guard(()=>{setSelected(value);if(window.matchMedia('(max-width:850px)').matches)requestAnimationFrame(()=>document.getElementById('match-editor')?.scrollIntoView({behavior:'smooth',block:'start'}));});}
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(library,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='nuestros-lugares.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importFile(e){const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>5000000)throw Error('El respaldo supera el tamaño permitido de 5 MB.');const data=JSON.parse(await f.text());if(data.version===1){validate(data);setModal({type:'importLegacy',data:upgradeTournament(data,crypto.randomUUID())});}else setModal({type:'import',data:validateLibrary(data)});}catch(err){setNotice(`No se importó el archivo. ${err.message}`);}}

  function saveCafe(e){e.preventDefault();const f=new FormData(e.currentTarget),name=f.get('name').trim(),address=f.get('address').trim();if(!name)return;
    try{
      if(tournament.cafes.some(c=>c.id!==modal.cafe?.id&&c.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('Ese lugar ya está agregado a este torneo.');
      if(!modal.cafe&&tournament.cafes.length>=64)throw Error('El máximo es 64 lugares por torneo.');
      const cafe={id:modal.cafe?.id||crypto.randomUUID(),name,address};
      let next={...tournament,cafes:modal.cafe?tournament.cafes.map(c=>c.id===cafe.id?cafe:c):[...tournament.cafes,cafe]};
      if(modal.slot)next=assignSlot(next,modal.slot.index,modal.slot.side,cafe.id);
      commitTournament(next);setModal(null);
    }catch(error){setModal({...modal,error:error.message});}
  }
  function saveSettings(values){
    if(!modal.tournament){if(library.tournaments.length>=100)throw Error('Ya hay 100 torneos. Exportá una copia antes de quitar alguno.');commit({...library,tournaments:[...library.tournaments,values],activeId:values.id});setScreen('Fixture');setTab('Cuadro');setSelected([0,0]);setModal(null);return;}
    const {size,...next}=values;
    const changedSize=size!==tournament.rounds[0].length*2,changedCriteria=JSON.stringify(next.criteria)!==JSON.stringify(criteriaFor(tournament));
    if(changedSize||changedCriteria){
      next.rounds=rounds(size);
      if(changedSize)tournament.rounds[0].flatMap(m=>m.teams).filter(Boolean).slice(0,size).forEach((id,n)=>next.rounds[0][Math.floor(n/2)].teams[n%2]=id);
      else next.rounds[0].forEach((m,i)=>{m.teams=[...tournament.rounds[0][i].teams];m.date=tournament.rounds[0][i].date;m.note=tournament.rounds[0][i].note;});
      setModal({type:'reset',data:next});
    }else{commitTournament(next);setModal(null);}
  }
  function confirm(){perform(()=>{
    if(modal.type==='unsaved'){setDirty(false);setRevision(r=>r+1);setModal(null);modal.action();return;}
    if(modal.type==='deleteCafe')commitTournament(removeCafe(tournament,modal.cafe.id));
    if(modal.type==='deleteTournament'){const remaining=library.tournaments.filter(t=>t.id!==modal.tournament.id);commit({...library,tournaments:remaining,activeId:library.activeId===modal.tournament.id?remaining[0]?.id||null:library.activeId});setSelected([0,0]);}
    if(modal.type==='deleteVisit')commit({...library,visits:library.visits.filter(v=>v.id!==modal.visit.id)});
    if(modal.type==='reset'){commitTournament(modal.data);setSelected([0,0]);}
    if(modal.type==='import'){commit(modal.data,{restore:true});setSelected([0,0]);setScreen('Torneos');}
    if(modal.type==='importLegacy'){if(library.tournaments.length>=100)throw Error('No se pueden importar más de 100 torneos.');commit({...library,tournaments:[...library.tournaments,modal.data],activeId:modal.data.id},{restore:true});setSelected([0,0]);setScreen('Fixture');setTab('Cuadro');}
    setModal(null);
  });}
  const heading=screen==='Fixture'&&tournament?tournament.title:{Torneos:'Torneos',Lugares:'Visitas',Perfil:'Perfil',Fixture:'Torneos'}[screen];
  const modalTitle=modal&&({slot:'Elegir lugar',cafe:modal.cafe?'Editar lugar':'Agregar lugar',tournament:modal.tournament?'Editar torneo':'Crear torneo',visit:modal.visit?'Editar visita':'Anotar una visita',unsaved:'Hay una visita sin guardar',reset:'Reiniciar resultados',deleteCafe:'Quitar lugar',deleteTournament:'Eliminar torneo',deleteVisit:'Eliminar visita',import:'Restaurar respaldo',importLegacy:'Importar mundial de café'}[modal.type]);

  return <div className="app" style={{'--accent':screen==='Fixture'&&theme?theme.accent:'#ae5036'}}>
    <header className="masthead"><div><h1>{heading}</h1>{screen==='Fixture'&&tournament?.city&&<p>{tournament.city}</p>}</div><div className="header-art"><ThemeArt theme={screen==='Fixture'?tournament?.theme:'cafe'}/></div></header>
    <div className="toolbar global-toolbar"><nav aria-label="Navegación principal">{NAV.map(([name,Icon])=><button key={name} aria-current={screen===name?'page':undefined} className={screen===name?'current':''} onClick={()=>go(name)}><Icon size={21}/>{name}</button>)}</nav>
      {screen==='Fixture'&&tournament&&<div className="actions"><button onClick={()=>guard(()=>setModal({type:'tournament',tournament}))}><Pencil size={17}/>Editar torneo</button><button className="primary" onClick={()=>guard(()=>setModal({type:'cafe'}))}><Plus size={19}/>Agregar {theme.singular}</button></div>}
    </div>
    <main>
      {screen==='Fixture'&&tournament?<>
        <button className="switch-tournament" onClick={()=>go('Torneos')}><ArrowLeft size={14}/>Mis torneos<span>{tournament.title}</span><ChevronDown size={14}/></button>
        <TournamentView tournament={tournament} tab={tab} onTab={t=>guard(()=>setTab(t))} selected={selected} onSelect={selectMatch} onPick={pick} revision={revision} onDirty={setDirty} onSave={(values,tie)=>commitTournament(saveMatch(tournament,...selected,values,tie))} onDraft={values=>commitTournament(saveDraft(tournament,...selected,values))} onBye={()=>guard(()=>perform(()=>commitTournament(advanceBye(tournament,...selected))))} onAdd={()=>setModal({type:'cafe'})} onEdit={cafe=>setModal({type:'cafe',cafe})} onDelete={cafe=>setModal({type:'deleteCafe',cafe})}/>
      </>:screen==='Torneos'||screen==='Fixture'?<Tournaments library={library} onOpen={openTournament} onCreate={()=>setModal({type:'tournament'})} onDelete={t=>setModal({type:'deleteTournament',tournament:t})}/>:screen==='Lugares'?<Visits visits={library.visits} onAdd={()=>setModal({type:'visit'})} onEdit={visit=>setModal({type:'visit',visit})} onDelete={visit=>setModal({type:'deleteVisit',visit})}/>:<Profile profile={library.profile} onSave={profile=>perform(()=>commit({...library,profile}))} onExport={download} onImport={()=>file.current.click()}/>}
    </main>
    <footer className="app-foot"><span role="status" className={blocked?'error':''}>{notice||'Datos guardados en este navegador.'}</span><button onClick={download}>Exportar respaldo</button></footer>
    <nav className="bottom-nav" aria-label="Navegación móvil">{NAV.map(([name,Icon])=><button key={name} aria-current={screen===name?'page':undefined} className={screen===name?'current':''} onClick={()=>go(name)}><Icon size={21}/><span>{name}</span></button>)}</nav>
    <input type="file" accept=".json,application/json" hidden ref={file} onChange={importFile}/>
    {modal&&<Dialog key={`${modal.type}-${modal.visit?.id||modal.tournament?.id||modal.cafe?.id||''}`} title={modalTitle} onClose={()=>setModal(null)}>
      {modal.type==='slot'?<SlotPicker tournament={tournament} index={modal.index} side={modal.side} onChoose={id=>perform(()=>{commitTournament(assignSlot(tournament,modal.index,modal.side,id));setModal(null);})} onAdd={()=>setModal({type:'cafe',slot:{index:modal.index,side:modal.side}})}/>
      :modal.type==='tournament'?<TournamentForm tournament={modal.tournament} profile={library.profile} onSubmit={saveSettings}/>
      :modal.type==='visit'?<VisitForm visit={modal.visit} profile={library.profile} knownPlaces={knownPlaces} onSubmit={visit=>{commit({...library,visits:modal.visit?library.visits.map(v=>v.id===visit.id?visit:v):[...library.visits,visit]});setModal(null);}}/>
      :modal.type==='cafe'?<form onSubmit={saveCafe}><label>Nombre<input name="name" required maxLength={80} autoFocus defaultValue={modal.cafe?.name} placeholder={`Nombre del lugar`} list="previous-places"/></label><datalist id="previous-places">{knownPlaces.map(name=><option key={name} value={name}/>)}</datalist><label>Dirección o barrio<input name="address" maxLength={160} defaultValue={modal.cafe?.address} placeholder={tournament.city}/></label><p className="hint">{modal.slot?'Se agrega al espacio que seleccionaste.':'Queda disponible para elegir tocando “Por definir” en el fixture.'}</p>{modal.error&&<p className="error" role="alert">{modal.error}</p>}<button className="primary form-submit">Guardar lugar</button></form>
      :<><p>{modal.type==='unsaved'?'Guardá el resultado o el borrador antes de cambiar de vista. También podés descartar estas últimas ediciones.':modal.type==='deleteCafe'?`Se quitará ${modal.cafe.name} de este torneo, junto con sus resultados y los avances dependientes.`:modal.type==='deleteTournament'?`Se eliminará “${modal.tournament.title}” con sus participantes y resultados. Los otros torneos y las visitas sueltas se conservan.`:modal.type==='deleteVisit'?`Se eliminará la visita a ${modal.visit.place}.`:modal.type==='reset'?'Cambiaste el tamaño o los criterios. Se reiniciarán los puntajes y avances de este torneo. Sus lugares se conservan.':modal.type==='importLegacy'?'Este respaldo se agregará como un torneo más. Se conservarán los otros torneos y las visitas.':'El respaldo reemplazará todos los torneos, visitas y el perfil de este navegador.'}</p><div className="confirm-actions">{modal.type==='unsaved'?<button onClick={()=>setModal(null)}>Volver a guardar</button>:<button onClick={download}>Exportar antes</button>}<button className="primary" onClick={confirm}>{modal.type==='unsaved'?'Descartar cambios':'Confirmar'}</button></div></>}
    </Dialog>}
  </div>;
}


