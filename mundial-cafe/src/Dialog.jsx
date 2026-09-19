import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export function Dialog({title,onClose,children}){const ref=useRef();useEffect(()=>{ref.current.showModal();},[]);return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}}><div className="dialog-head"><h2>{title}</h2><button aria-label="Cerrar" onClick={onClose}><X size={20}/></button></div>{children}</dialog>}
