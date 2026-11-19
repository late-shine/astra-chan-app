import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, Palette, X } from 'lucide-react';
import type { ThemeId, StudyTheme } from '../themeIds';
import { appearanceLabel, LEGACY_THEMES, STUDY_LABELS, STUDY_PALETTES, STUDY_THEMES, studyTokens, themeThumbnail } from '../appearance';

const AppearanceContext = createContext<{theme:StudyTheme; open?:()=>void}>({theme:'rainy-atelier'});
export const useAppearance = () => useContext(AppearanceContext);

/** One chooser, reused by Profile and the dock/study shortcut. No storage or room writes here. */
export function AppearancePicker({theme,onChange}:{theme:string;onChange:(id:StudyTheme)=>void}) {
  return <div className="appearance-picker" style={studyTokens(theme) as CSSProperties}>
    <p>One aesthetic for Practice and duels. Your choice stays yours in a shared match.</p>
    <div className="appearance-grid" role="group" aria-label="Study aesthetics">
      {STUDY_THEMES.map(id => { const p = STUDY_PALETTES[id]; const selected = theme === id;
        return <button key={id} type="button" className="appearance-card" aria-pressed={selected} onClick={()=>onChange(id)}
          style={{background:p.panel,color:p.ink,borderColor:selected ? p.accent : p.border}}>
          <img src={themeThumbnail(id)} alt="" loading="lazy" decoding="async" />
          <span className="appearance-card__title">{STUDY_LABELS[id].title}{selected && <Check aria-label="Selected" />}</span>
          <span>{STUDY_LABELS[id].description}</span>
          <span className="appearance-swatches" aria-hidden="true">{[p.header,p.primary,p.selected,p.frame].map((c,i)=><i key={i} style={{background:c,borderColor:p.border}} />)}</span>
        </button>;
      })}
    </div>
    <p className="appearance-current">Current: {appearanceLabel(theme)}</p>

  </div>;
}

function AppearanceDialog({theme,onChange,onClose}:{theme:StudyTheme;onChange:(id:StudyTheme)=>void;onClose:()=>void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{ const dialog=ref.current; const opener=document.activeElement as HTMLElement|null; dialog?.showModal(); return ()=>{dialog?.close(); if(opener?.isConnected) opener.focus({preventScroll:true});}; },[]);
  return <dialog ref={ref} className="appearance-dialog" style={studyTokens(theme) as CSSProperties} aria-labelledby="appearance-title" onCancel={onClose}
    onKeyDown={e=>{e.stopPropagation(); if(e.key==='Escape') {e.preventDefault(); onClose();}}}
    onClick={e=>{if(e.target===e.currentTarget) onClose();}}>
    <div className="appearance-dialog__head"><h2 id="appearance-title">Quiz appearance</h2><button type="button" onClick={onClose} aria-label="Close quiz appearance"><X /></button></div>
    <p className="appearance-clock-note">Changes apply immediately. Match clocks keep running.</p>
    <AppearancePicker theme={theme} onChange={onChange}/>
    <button type="button" className="appearance-done" onClick={onClose}>Done</button>
  </dialog>;
}

export function AppearanceProvider({theme,onChange,children}:{theme:StudyTheme;onChange:(id:StudyTheme)=>void;children:ReactNode}) {
  const [open,setOpen]=useState(false);
  return <AppearanceContext.Provider value={{theme,open:()=>setOpen(true)}}>
    {children}
    {open && <AppearanceDialog theme={theme} onChange={onChange} onClose={()=>setOpen(false)}/>}
  </AppearanceContext.Provider>;
}
export function AppearanceShortcut({className}:{className?:string}) {
  const {theme,open}=useAppearance();
  return open ? <button type="button" className={className} onClick={open} aria-label={`Quiz appearance: ${appearanceLabel(theme)}`} title={`Quiz appearance: ${appearanceLabel(theme)}`}><Palette aria-hidden="true"/><span className="quiz-sr">Quiz appearance</span></button> : null;
}

/** The original application palette is independent of Practice/duel appearance. */
export function AppThemePicker({theme,onChange}:{theme:string;onChange:(id:ThemeId)=>void}) {
  return <div className="app-theme-picker" role="group" aria-label="App theme">
    {LEGACY_THEMES.map(p=><button key={p.id} type="button" aria-pressed={theme===p.id} onClick={()=>onChange(p.id)}>{p.title}{theme===p.id && <Check aria-label="Selected"/>}</button>)}
  </div>;
}
