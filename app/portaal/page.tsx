'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

/* ─── Types ──────────────────────────────────────────────── */
interface Afspraak {
  id: string; code: string; naam: string; telefoon: string; email: string
  service: string; prijs: number; duur: number; datum: string; tijd: string
  created_at: string; notities?: string; no_show?: boolean
}
interface WachtlijstEntry { id: string; naam: string; telefoon: string; email: string; datum: string; service: string; created_at: string }
interface GebandEmail { id: string; email: string; reden: string; created_at: string }
interface Klant { email: string; naam: string; bezoeken: number; totaalBesteed: number; lastDate: string; lastService: string; afspraken: {code:string;service:string;prijs:number;datum:string;tijd:string}[] }
interface Session { id: string; naam: string; slug: string; email: string; exp: number }
interface Stats { vandaag: number; week: number; weekOmzet: number; totaalKlanten: number; maandKlanten: number; vandaagAfspraken: Afspraak[] }
type BreakSlot = { start: string; end: string }
type DayConfig = { open: boolean; start: string; end: string; breaks: BreakSlot[] }
const DEFAULT_SCHEDULE: Record<string, DayConfig> = {
  '0':{open:false,start:'09:00',end:'17:00',breaks:[]},
  '1':{open:true, start:'09:00',end:'17:00',breaks:[]},
  '2':{open:true, start:'09:00',end:'17:00',breaks:[]},
  '3':{open:true, start:'09:00',end:'17:00',breaks:[]},
  '4':{open:true, start:'09:00',end:'17:00',breaks:[]},
  '5':{open:true, start:'09:00',end:'17:00',breaks:[]},
  '6':{open:false,start:'09:00',end:'17:00',breaks:[]},
}

/* ─── Helpers ────────────────────────────────────────────── */
const NL_MONTHS_SHORT = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
const NL_MONTHS_LONG  = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
const NL_DAYS_SHORT   = ['Ma','Di','Wo','Do','Vr','Za','Zo']
const NL_DAYS_LONG    = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
const NL_DAY_LABELS: Record<string,string> = {'0':'Zondag','1':'Maandag','2':'Dinsdag','3':'Woensdag','4':'Donderdag','5':'Vrijdag','6':'Zaterdag'}

function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatShortDate(ds: string) { const d=new Date(ds+'T12:00:00'); return `${NL_DAYS_SHORT[(d.getDay()+6)%7]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` }
function formatLongDate(ds: string) { const d=new Date(ds+'T12:00:00'); return `${NL_DAYS_LONG[d.getDay()]} ${d.getDate()} ${NL_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` }
function formatMedDate(ds: string) { const d=new Date(ds+'T12:00:00'); return `${NL_DAYS_SHORT[(d.getDay()+6)%7]} ${d.getDate()} ${NL_MONTHS_SHORT[d.getMonth()]}` }
function getStatus(date: string): 'today'|'upcoming'|'past' { const t=new Date().toISOString().split('T')[0]; if(date===t)return'today'; return date>t?'upcoming':'past' }
function serviceInitial(s: string) { if(s.toLowerCase().includes('baard')&&s.toLowerCase().includes('knip'))return'KB'; if(s.toLowerCase().includes('baard'))return'B'; return'K' }
function toMins(t: string) { const[h,m]=t.split(':').map(Number); return h===0&&m===0?1440:h*60+m }
function generateWorkSlots(start='09:00',end='17:00') {
  const s=toMins(start),e=toMins(end),slots:string[]=[]
  for(let m=s;m<e;m+=15) slots.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`)
  return slots
}
function isBreak(slot: string, breaks: BreakSlot[]) {
  const[sh,sm]=slot.split(':').map(Number); const sMin=sh*60+sm
  return breaks.some(b=>{ const[bsh,bsm]=b.start.split(':').map(Number),[beh,bem]=b.end.split(':').map(Number); return sMin>=bsh*60+bsm&&sMin<beh*60+bem })
}

type View = 'dashboard'|'calendar'|'appointments'|'customers'|'services'|'management'|'settings'

const NAV_ICONS: Record<string,React.ReactNode> = {
  dashboard:    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>,
  calendar:     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>,
  appointments: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  services:     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>,
  customers:    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>,
  management:   <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>,
  settings:     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
}
const NAV: {id:View;label:string}[] = [
  {id:'dashboard',label:'Dashboard'},{id:'calendar',label:'Agenda'},{id:'appointments',label:'Afspraken'},
  {id:'customers',label:'Klanten'},{id:'services',label:'Diensten'},{id:'management',label:'Beheer'},{id:'settings',label:'Instellingen'},
]

function AnimatedNumber({value}:{value:number|string}) {
  const[display,setDisplay]=useState<number|string>(typeof value==='number'?0:value)
  useEffect(()=>{
    if(typeof value!=='number'){setDisplay(value);return}
    let cur=0; const step=Math.max(1,Math.ceil(value/25))
    const t=setInterval(()=>{ cur=Math.min(cur+step,value); setDisplay(cur); if(cur>=value)clearInterval(t) },40)
    return()=>clearInterval(t)
  },[value])
  return<>{display}</>
}

function CalendarSubscribeButton() {
  const[url,setUrl]=useState<string|null>(null)
  const[laden,setLaden]=useState(true)
  useEffect(()=>{
    fetch('/api/portaal/calendar-url').then(r=>r.json()).then(d=>{if(d.url)setUrl(d.url)}).catch(()=>{}).finally(()=>setLaden(false))
  },[])
  if(laden||!url)return null
  return(
    <a href={url.replace(/^https?:\/\//,'webcal://')} className="flex items-center gap-2 px-4 py-2 border border-[#2a2a2a] text-gray-300 rounded-xl font-bold text-sm hover:border-[#2176d4] hover:text-[#2176d4] transition-colors">
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
      Agenda abonneren
    </a>
  )
}

/* ─── Login ──────────────────────────────────────────────── */
function LoginScreen({onLogin}:{onLogin:()=>void}) {
  const[email,setEmail]=useState('');const[ww,setWw]=useState('');const[error,setError]=useState('');const[loading,setLoading]=useState(false);const[show,setShow]=useState(false)
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');setLoading(true)
    try{
      const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,wachtwoord:ww})})
      const d=await r.json()
      if(!r.ok){setError(d.error??'Inloggen mislukt');return}
      onLogin()
    }catch{setError('Netwerkfout')}finally{setLoading(false)}
  }
  return(
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#141414] rounded-xl shadow-xl border border-[#2a2a2a] overflow-hidden">
        <div className="bg-[#111] px-8 py-8 text-center border-b border-[#1e1e1e]">
          <div className="w-16 h-16 rounded-full bg-[#2176d4]/15 border border-[#2176d4]/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-[#2176d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
          </div>
          <h1 className="text-white font-[family-name:var(--font-bebas)] tracking-widest text-xl">Schuurtje</h1>
          <p className="text-gray-500 text-xs mt-0.5">Kapper Portaal</p>
        </div>
        <form onSubmit={submit} className="p-8">
          <h2 className="text-lg font-black text-white mb-6 text-center">Inloggen</h2>
          {error&&<div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm font-semibold">{error}</div>}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-400 mb-1">E-mailadres</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-3 font-medium focus:outline-none focus:border-[#2176d4] transition-colors"/>
          </div>
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-400 mb-1">Wachtwoord</label>
            <div className="relative">
              <input type={show?'text':'password'} value={ww} onChange={e=>setWw(e.target.value)} required className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-3 pr-12 font-medium focus:outline-none focus:border-[#2176d4] transition-colors"/>
              <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium hover:text-gray-300">{show?'Verberg':'Toon'}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-[#2176d4] text-white font-bold hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-50 transition-all duration-200">{loading?'Bezig...':'Inloggen'}</button>
        </form>
      </div>
    </div>
  )
}

/* ─── Shell ──────────────────────────────────────────────── */
function PortalShell({session,onLogout}:{session:Session;onLogout:()=>void}) {
  const[view,setView]=useState<View>('dashboard')
  const[moreOpen,setMoreOpen]=useState(false)
  const[notifications,setNotifications]=useState<(Afspraak&{_type:string})[]>([])
  const[unreadCount,setUnreadCount]=useState(0)
  const[notifOpen,setNotifOpen]=useState(false)
  const[toast,setToast]=useState<string|null>(null)
  const[waitlistCount,setWaitlistCount]=useState(0)
  const lastCheckedRef=useRef('')
  const notifBtnRef=useRef<HTMLButtonElement>(null)
  const[panelStyle,setPanelStyle]=useState<React.CSSProperties>({top:56,right:16})

  useEffect(()=>{
    const stored=localStorage.getItem('sch_notif_last_checked')
    lastCheckedRef.current=stored??new Date(Date.now()-60*60*1000).toISOString()
    const poll=async()=>{
      try{
        const r=await fetch(`/api/afspraken?since=${encodeURIComponent(lastCheckedRef.current)}`)
        lastCheckedRef.current=new Date().toISOString()
        localStorage.setItem('sch_notif_last_checked',lastCheckedRef.current)
        if(!r.ok)return
        const d=await r.json()
        const now=new Date()
        const todayStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        const nowMins=now.getHours()*60+now.getMinutes()
        const nieuwen=(d.afspraken??[]).filter((b:Afspraak)=>{
          if(b.datum>todayStr)return true
          if(b.datum===todayStr){const[h,m]=b.tijd.split(':').map(Number);return h*60+m>nowMins}
          return false
        })
        const annuleringen:Afspraak[]=d.annuleringen??[]
        if(nieuwen.length>0){
          setNotifications(prev=>[...nieuwen.map((b:Afspraak)=>({...b,_type:'nieuw'})),...prev])
          setUnreadCount(prev=>prev+nieuwen.length)
          setToast(nieuwen.length===1?`Nieuwe afspraak: ${nieuwen[0].naam} – ${nieuwen[0].service}`:`${nieuwen.length} nieuwe afspraken`)
        }
        if(annuleringen.length>0){
          setNotifications(prev=>[...annuleringen.map((b:Afspraak)=>({...b,_type:'geannuleerd'})),...prev])
          setUnreadCount(prev=>prev+annuleringen.length)
          setToast(annuleringen.length===1?`Geannuleerd: ${annuleringen[0].naam} – ${annuleringen[0].service}`:`${annuleringen.length} afspraken geannuleerd`)
        }
      }catch{/*ignore*/}
    }
    poll(); const id=setInterval(poll,30_000); return()=>clearInterval(id)
  },[])

  useEffect(()=>{
    const go=async()=>{try{const r=await fetch('/api/wachtlijst');if(!r.ok)return;const d=await r.json();setWaitlistCount((d.wachtlijst??[]).length)}catch{/**/}}
    go(); const id=setInterval(go,60_000); return()=>clearInterval(id)
  },[])

  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(t)},[toast])
  useEffect(()=>{
    if(!notifOpen)return
    const h=(e:MouseEvent)=>{const p=document.getElementById('notif-panel');if(p&&!p.contains(e.target as Node))setNotifOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[notifOpen])

  function openNotifDesktop(){
    if(notifBtnRef.current){const r=notifBtnRef.current.getBoundingClientRect();setPanelStyle({bottom:window.innerHeight-r.top+4,left:r.right+8})}
    setNotifOpen(o=>!o); setUnreadCount(0)
  }
  function openNotifMobile(){setPanelStyle({bottom:72,right:16});setNotifOpen(o=>!o);setUnreadCount(0)}

  return(
    <div className="min-h-screen flex bg-[#0c0c0c] font-[family-name:var(--font-barlow)]">
      {notifOpen&&(
        <div id="notif-panel" style={panelStyle} className="fixed z-50 w-[calc(100vw-32px)] sm:w-72 bg-[#141414] rounded-xl shadow-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#1e1e1e] flex items-center justify-between">
            <span className="font-semibold text-white text-sm">Meldingen</span>
            {notifications.length>0&&<button onClick={()=>{const c=notifications.length;setNotifications([]);setNotifOpen(false);setToast(`${c} melding${c===1?'':'en'} gewist`)}} className="text-xs text-[#2176d4] hover:underline">Wis alles</button>}
          </div>
          {notifications.length===0?<p className="px-4 py-6 text-sm text-gray-500 text-center">Geen nieuwe meldingen</p>:(
            <div className="max-h-72 overflow-y-auto divide-y divide-[#1e1e1e]">
              {notifications.map(n=>(
                <div key={n.id+n._type} className={`px-4 py-3 hover:bg-white/5 border-l-2 ${n._type==='geannuleerd'?'border-red-500':'border-[#2176d4]'}`}>
                  <p className="font-semibold text-sm text-white">{n.naam}</p>
                  <p className="text-xs text-gray-500">{n.service} · {formatMedDate(n.datum)} · {n.tijd}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {toast&&(
        <div className="fixed top-16 right-4 lg:top-4 lg:right-6 z-50 bg-[#2176d4] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-xs">
          <div className="flex-1 min-w-0"><p className="font-bold text-sm">Nieuwe melding</p><p className="text-xs text-white/70 truncate">{toast}</p></div>
          <button onClick={()=>setToast(null)} className="text-white/50 hover:text-white shrink-0 leading-none text-lg">×</button>
        </div>
      )}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0e0e0e] min-h-screen fixed left-0 top-0 z-30 border-r border-[#1e1e1e]">
        <div className="px-6 py-5 border-b border-[#1e1e1e] flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#2176d4]/15 border border-[#2176d4]/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#2176d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
          </div>
          <div>
            <div className="text-white font-[family-name:var(--font-bebas)] tracking-widest text-lg leading-none">{session.naam}</div>
            <p className="text-gray-600 text-[10px] mt-0.5 tracking-wider uppercase">Kapper Portaal</p>
          </div>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-3">
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} className={['flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200',view===n.id?'bg-[#2176d4]/12 text-[#2176d4] font-semibold shadow-[inset_0_0_0_1px_rgba(33,118,212,0.2)]':'text-gray-500 hover:bg-white/4 hover:text-gray-200'].join(' ')}>
              <span className={view===n.id?'text-[#2176d4]':'text-gray-600'}>{NAV_ICONS[n.id]}</span>{n.label}
            </button>
          ))}
          <button ref={notifBtnRef} onClick={openNotifDesktop} className={['flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200',notifOpen?'bg-[#2176d4]/12 text-[#2176d4] font-semibold shadow-[inset_0_0_0_1px_rgba(33,118,212,0.2)]':'text-gray-500 hover:bg-white/4 hover:text-gray-200'].join(' ')}>
            <span className={`relative ${notifOpen?'text-[#2176d4]':'text-gray-600'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
              {unreadCount>0&&<span className="animate-pulse-ring absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 opacity-70"/>}
            </span>
            <span className="flex-1 text-left">Meldingen</span>
            {unreadCount>0&&<span className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 leading-none">{unreadCount>9?'9+':unreadCount}</span>}
          </button>
        </nav>
        <div className="px-3 pb-4">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-[#1e1e1e] text-gray-500 text-sm hover:bg-white/4 hover:text-gray-300 hover:border-[#2a2a2a] transition-all duration-200">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
            Uitloggen
          </button>
        </div>
      </aside>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0e0e0e] px-4 h-14 flex items-center justify-between border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#2176d4]/15 border border-[#2176d4]/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#2176d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
          </div>
          <span className="text-white font-[family-name:var(--font-bebas)] tracking-widest text-base">{session.naam}</span>
        </div>
        <button onClick={openNotifMobile} className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
          {unreadCount>0&&<span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[#0e0e0e]"/>}
        </button>
      </div>
      {moreOpen&&(
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 animate-fade-in" onClick={()=>setMoreOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-[#0e0e0e] rounded-t-2xl border-t border-[#1e1e1e] px-4 pt-4 pb-6 animate-fade-up" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-[#333] mx-auto mb-5"/>
            <div className="space-y-0.5">
              {(['services','management','settings'] as View[]).map(id=>{
                const n=NAV.find(n=>n.id===id)!
                return <button key={id} onClick={()=>{setView(id);setMoreOpen(false)}} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm transition-all ${view===id?'bg-[#2176d4]/12 text-[#2176d4] font-semibold':'text-gray-400 hover:bg-white/5 hover:text-white'}`}><span className={view===id?'text-[#2176d4]':'text-gray-600'}>{NAV_ICONS[id]}</span>{n.label}</button>
              })}
              <div className="my-2 border-t border-[#1e1e1e]"/>
              <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-900/10 transition-all">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      )}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0e0e0e] border-t border-[#1e1e1e] flex flex-col" style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        <div className="flex h-16">
          {(['dashboard','calendar','appointments','customers'] as View[]).map(id=>{
            const n=NAV.find(n=>n.id===id)!; const active=view===id
            return <button key={id} onClick={()=>{setView(id);setMoreOpen(false)}} className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${active?'text-[#2176d4]':'text-gray-600 hover:text-gray-400'}`}><span className={active?'text-[#2176d4]':'text-gray-600'}>{NAV_ICONS[id]}</span>{n.label==='Dashboard'?'Home':n.label}</button>
          })}
          <button onClick={()=>setMoreOpen(o=>!o)} className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${moreOpen||['services','management','settings'].includes(view)?'text-[#2176d4]':'text-gray-600 hover:text-gray-400'}`}>
            <span className="relative">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/></svg>
              {waitlistCount>0&&<span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"/>}
            </span>
            Meer
          </button>
        </div>
      </nav>
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen pb-nav-safe">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
          {view==='dashboard'&&<DashboardView onNavigate={setView} session={session}/>}
          {view==='calendar'&&<CalendarView/>}
          {view==='appointments'&&<AppointmentsView session={session}/>}
          {view==='customers'&&<CustomersView/>}
          {view==='services'&&<ServicesView/>}
          {view==='management'&&<ManagementView session={session}/>}
          {view==='settings'&&<SettingsView session={session}/>}
        </div>
      </main>
    </div>
  )
}

/* ─── Dashboard ──────────────────────────────────────────── */
function DashboardView({onNavigate,session}:{onNavigate:(v:View)=>void;session:Session}) {
  const[stats,setStats]=useState<Stats|null>(null)
  const[upcoming,setUpcoming]=useState<Afspraak[]>([])
  const[workSlots,setWorkSlots]=useState<string[]>(generateWorkSlots())
  const[dayBreaks,setDayBreaks]=useState<BreakSlot[]>([])
  const[waitlistCount,setWaitlistCount]=useState<number|null>(null)
  const[lastUpdated,setLastUpdated]=useState('')

  const loadDashboard=useCallback(()=>{
    fetch('/api/portaal/stats').then(r=>r.json()).then(d=>setStats(d))
    fetch('/api/afspraken?filter=upcoming').then(r=>r.json()).then(d=>{
      const now=new Date(); const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      const nowMins=now.getHours()*60+now.getMinutes()
      const filtered=(d.afspraken??[]).filter((b:Afspraak)=>{
        if(b.datum>today)return true
        if(b.datum===today){const[h,m]=b.tijd.split(':').map(Number);return h*60+m>nowMins}
        return false
      })
      setUpcoming(filtered.slice(0,5))
    })
    fetch('/api/wachtlijst').then(r=>r.json()).then(d=>setWaitlistCount((d.wachtlijst??[]).length))
    setLastUpdated(new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}))
  },[])

  useEffect(()=>{
    loadDashboard()
    fetch('/api/instellingen').then(r=>r.json()).then(d=>{
      const s=d.instellingen??{}; const dow=String(new Date().getDay())
      if(s.schema){
        const sched:Record<string,DayConfig>=JSON.parse(s.schema as string); const cfg=sched[dow]
        setWorkSlots(cfg?.open?generateWorkSlots(cfg.start,cfg.end):[])
        setDayBreaks(cfg?.breaks??[])
      } else setWorkSlots(generateWorkSlots())
    })
    const id=setInterval(loadDashboard,60_000); return()=>clearInterval(id)
  },[loadDashboard])

  const today=new Date().toISOString().split('T')[0]
  const nextAppt=(()=>{
    const now=new Date(); const nowMins=now.getHours()*60+now.getMinutes()
    return(stats?.vandaagAfspraken??[]).filter((b:Afspraak)=>{const[h,m]=b.tijd.split(':').map(Number);return h*60+m>nowMins}).sort((a:Afspraak,b:Afspraak)=>a.tijd.localeCompare(b.tijd))[0]??null
  })()
  const minsUntilNext=nextAppt?(()=>{const[h,m]=nextAppt.tijd.split(':').map(Number);const now=new Date();return h*60+m-(now.getHours()*60+now.getMinutes())})():null

  return(
    <div className="animate-fade-up">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{formatLongDate(today)}</p>
        </div>
        {lastUpdated&&<p className="text-[11px] text-gray-700 shrink-0 pb-0.5">Bijgewerkt om {lastUpdated}</p>}
      </div>
      {stats&&(
        <div className={`mb-6 rounded-2xl border p-4 flex items-center gap-4 ${nextAppt?'bg-[#2176d4]/8 border-[#2176d4]/20':'bg-[#141414] border-[#222]'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${nextAppt?'bg-[#2176d4]/15':'bg-[#1e1e1e]'}`}>
            <svg className={`w-5 h-5 ${nextAppt?'text-[#2176d4]':'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          {nextAppt?(
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#2176d4]/70 uppercase tracking-wider">Volgende afspraak</p>
              <p className="text-white font-bold truncate">{nextAppt.naam} <span className="text-gray-400 font-normal">– {nextAppt.service}</span></p>
            </div>
          ):(
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Volgende afspraak</p>
              <p className="text-gray-500 font-medium text-sm">Geen afspraken meer vandaag</p>
            </div>
          )}
          {nextAppt&&minsUntilNext!==null&&(
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-[#2176d4]">{nextAppt.tijd}</p>
              <p className="text-xs text-gray-500">over {minsUntilNext<60?`${minsUntilNext} min`:`${Math.floor(minsUntilNext/60)}u ${minsUntilNext%60}m`}</p>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {label:'Vandaag',value:stats?.vandaag??'—',sub:'afspraken',gold:true,icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>},
          {label:'Deze week',value:stats?.week??'—',sub:'afspraken',gold:false,icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>},
          {label:'Deze maand',value:stats?.maandKlanten??'—',sub:'klanten',gold:false,icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>},
          {label:'Wachtlijst',value:waitlistCount??'—',sub:'openstaand',gold:false,amber:(waitlistCount??0)>0,onClick:()=>onNavigate('management'),icon:<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25H12M3 3.375C3 2.339 3.84 1.5 4.875 1.5H7.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125H4.875A1.875 1.875 0 013 6.375V3.375z"/></svg>},
        ].map((c,i)=>(
          <div key={c.label} style={{animationDelay:`${i*60}ms`}} onClick={(c as {onClick?:()=>void}).onClick}
            className={`animate-fade-up rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${(c as {onClick?:()=>void}).onClick?'cursor-pointer':''} ${c.gold?'bg-gradient-to-br from-[#2176d4]/15 to-[#2176d4]/5 border-[#2176d4]/25 hover:shadow-[#2176d4]/10':(c as {amber?:boolean}).amber?'bg-amber-900/15 border-amber-800/30 hover:shadow-amber-900/20':'bg-[#141414] border-[#222] hover:border-[#2a2a2a] hover:shadow-black/40'}`}>
            <div className="flex items-start justify-between mb-3">
              <p className={`text-[11px] font-bold uppercase tracking-widest ${c.gold?'text-[#2176d4]/60':(c as {amber?:boolean}).amber?'text-amber-500/70':'text-gray-600'}`}>{c.label}</p>
              <span className={c.gold?'text-[#2176d4]/40':(c as {amber?:boolean}).amber?'text-amber-500/50':'text-gray-700'}>{c.icon}</span>
            </div>
            <p className={`text-4xl font-black leading-none ${c.gold?'text-[#2176d4]':(c as {amber?:boolean}).amber?'text-amber-400':'text-white'}`}><AnimatedNumber value={c.value as number|string}/></p>
            <p className={`text-xs mt-2 ${c.gold?'text-[#2176d4]/50':(c as {amber?:boolean}).amber?'text-amber-500/50':'text-gray-600'}`}>{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#141414] rounded-2xl border border-[#222] overflow-hidden transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-black/30">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <div><h2 className="font-bold text-white text-sm">Aankomende afspraken</h2><p className="text-xs text-gray-600 mt-0.5">{upcoming.length} gepland</p></div>
            <span className="w-8 h-8 rounded-xl bg-[#2176d4]/10 flex items-center justify-center text-[#2176d4]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5"/></svg></span>
          </div>
          {upcoming.length===0?<div className="py-10 text-center"><p className="text-gray-600 text-sm">Geen aankomende afspraken</p></div>:(
            <div className="divide-y divide-[#1a1a1a]">
              {upcoming.map(b=>(
                <div key={b.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-[#2176d4]/10 flex flex-col items-center justify-center">
                    <p className="text-[9px] font-bold text-[#2176d4]/70 uppercase leading-none">{formatShortDate(b.datum).split(' ')[0]}</p>
                    <p className="text-sm font-black text-[#2176d4] leading-none mt-0.5">{b.tijd}</p>
                  </div>
                  <div className="min-w-0 flex-1"><p className="font-bold text-white text-sm truncate">{b.naam}</p><p className="text-xs text-gray-500 truncate">{b.service}</p></div>
                  <p className="text-xs text-gray-600 shrink-0">{formatShortDate(b.datum)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#141414] rounded-2xl border border-[#222] overflow-hidden transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-black/30">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <div><h2 className="font-bold text-white text-sm">Schema vandaag</h2><p className="text-xs text-gray-600 mt-0.5 capitalize">{formatLongDate(today)}</p></div>
            <span className="w-8 h-8 rounded-xl bg-[#1e1e1e] flex items-center justify-center text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span>
          </div>
          <div className="overflow-y-auto max-h-72">
            {workSlots.length===0&&<p className="text-center text-gray-600 text-sm py-10">Geen werkrooster vandaag</p>}
            {workSlots.map(slot=>{
              const b=stats?.vandaagAfspraken?.find(b=>b.tijd===slot)
              const isPause=isBreak(slot,dayBreaks)
              return(
                <div key={slot} className={`flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1a1a] transition-colors ${b?'bg-[#2176d4]/4 hover:bg-[#2176d4]/6':isPause?'bg-amber-900/8':'hover:bg-white/2'}`}>
                  <span className={`font-black text-[11px] w-12 text-center shrink-0 px-1.5 py-1 rounded-lg ${b?'bg-[#2176d4] text-white':isPause?'bg-amber-900/30 text-amber-500':'bg-[#1e1e1e] text-gray-500'}`}>{slot}</span>
                  {isPause?<span className="text-amber-500/70 text-xs">Pauze</span>:b?(<><div className="min-w-0 flex-1"><p className="font-bold text-white text-sm truncate">{b.naam}</p><p className="text-xs text-gray-500 truncate">{b.service}</p></div><span className="ml-auto bg-[#2176d4] text-white font-black text-xs px-2.5 py-1 rounded-lg shrink-0">€{b.prijs}</span></>):<span className="text-gray-700 text-xs">Vrij</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface AfspraakFormulierType{id?:string;naam:string;telefoon:string;email:string;service:string;dienstId:string;prijs:number;duur:number;datum:string;tijd:string;notities:string}
const LEEG_FORMULIER:AfspraakFormulierType={naam:'',telefoon:'',email:'',service:'',dienstId:'',prijs:0,duur:30,datum:'',tijd:'',notities:''}

/* ─── Calendar ───────────────────────────────────────────── */
function CalendarView() {
  const today=new Date()
  const[viewMonth,setViewMonth]=useState(new Date(today.getFullYear(),today.getMonth(),1))
  const[selectedDay,setSelectedDay]=useState(toDateStr(today))
  const[monthBookings,setMonthBookings]=useState<Afspraak[]>([])
  const[schedule,setSchedule]=useState<Record<string,DayConfig>>(DEFAULT_SCHEDULE)
  const[blockedDates,setBlockedDates]=useState<string[]>([])
  const dayBookings=useMemo(()=>monthBookings.filter(b=>b.datum===selectedDay),[selectedDay,monthBookings])
  const monthStr=`${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}`

  useEffect(()=>{
    fetch('/api/instellingen').then(r=>r.json()).then(d=>{
      const s=d.instellingen??{}
      if(s.schema){
        const parsed:Record<string,DayConfig>=JSON.parse(s.schema as string)
        for(const k of Object.keys(parsed))parsed[k]={...parsed[k],breaks:parsed[k].breaks??[]}
        setSchedule(parsed)
      }
      if(s.geblokkeerde_datums)setBlockedDates(JSON.parse(s.geblokkeerde_datums))
    })
  },[])

  useEffect(()=>{
    const load=()=>fetch(`/api/afspraken?month=${monthStr}`).then(r=>r.json()).then(d=>setMonthBookings(d.afspraken??[]))
    load(); const id=setInterval(load,60_000); return()=>clearInterval(id)
  },[monthStr])

  const firstDay=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1)
  const lastDay=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0)
  const startOffset=(firstDay.getDay()+6)%7
  const cells:(Date|null)[]=Array(startOffset).fill(null)
  for(let i=1;i<=lastDay.getDate();i++)cells.push(new Date(viewMonth.getFullYear(),viewMonth.getMonth(),i))
  const byDate:Record<string,number>={}
  for(const b of monthBookings)byDate[b.datum]=(byDate[b.datum]??0)+1

  const selectedDow=String(new Date(selectedDay+'T12:00:00').getDay())
  const dayCfg=schedule[selectedDow]
  const slots=dayCfg?.open?generateWorkSlots(dayCfg.start,dayCfg.end):[]

  return(
    <div>
      <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white mb-1">Agenda</h1>
      <p className="text-gray-500 text-sm mb-6">Klik op een dag om het rooster te zien</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#141414] rounded-2xl border border-[#222] p-5 transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-black/30">
          <div className="flex items-center justify-between mb-4">
            <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#2176d4]/10 text-[#2176d4] font-bold text-xl transition-colors">‹</button>
            <span className="font-black text-white capitalize">{viewMonth.toLocaleDateString('nl-NL',{month:'long',year:'numeric'})}</span>
            <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#2176d4]/10 text-[#2176d4] font-bold text-xl transition-colors">›</button>
          </div>
          <div className="grid grid-cols-7 mb-1">{NL_DAYS_SHORT.map(d=><div key={d} className="text-center text-xs font-bold text-gray-500 py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {cells.map((day,i)=>{
              if(!day)return<div key={i}/>
              const ds=toDateStr(day); const count=byDate[ds]??0
              const isSelected=ds===selectedDay; const isToday=ds===toDateStr(today)
              const isBlocked=blockedDates.includes(ds); const isClosed=schedule[String(day.getDay())]?.open===false
              return(
                <button key={i} onClick={()=>setSelectedDay(ds)} className={['flex flex-col items-center py-1.5 rounded-xl m-0.5 transition-colors font-bold text-sm relative',isSelected?'bg-[#2176d4] text-white shadow-md':isBlocked?'bg-red-900/30 text-red-400 hover:bg-red-900/50':isClosed?'bg-[#1a1a1a] text-gray-600 hover:bg-[#222]':isToday?'ring-2 ring-[#2176d4] text-[#2176d4]':'hover:bg-[#2176d4]/10 text-gray-300'].join(' ')}>
                  <span>{day.getDate()}</span>
                  {!isBlocked&&count>0&&<div className="flex gap-0.5 mt-0.5">{Array.from({length:Math.min(count,3)}).map((_,j)=><div key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected?'bg-black':'bg-[#2176d4]'}`}/>)}</div>}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[#1e1e1e] text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#2176d4] inline-block"/>Geselecteerd</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-900/40 inline-block"/>Geblokkeerd</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#1a1a1a] inline-block"/>Gesloten</span>
          </div>
        </div>
        <div className="bg-[#141414] rounded-2xl border border-[#222] overflow-hidden transition-all duration-300 hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-black/30">
          <div className={`px-5 py-4 border-b border-[#1e1e1e] ${blockedDates.includes(selectedDay)?'bg-red-900/10':''}`}>
            <h2 className="font-semibold text-white capitalize text-sm">{formatLongDate(selectedDay)}</h2>
            {blockedDates.includes(selectedDay)?<p className="text-xs text-red-400 font-medium mt-0.5">Geblokkeerd — geen boekingen mogelijk</p>:!dayCfg?.open?<p className="text-xs text-gray-500 font-bold">Gesloten</p>:<p className="text-xs text-gray-500">{dayBookings.length} afspraken · {dayCfg.start}–{dayCfg.end}</p>}
          </div>
          <div className="overflow-y-auto max-h-96">
            {slots.length===0&&<p className="text-center text-gray-600 text-sm font-medium py-10">Geen rooster beschikbaar</p>}
            {slots.map(slot=>{
              const b=dayBookings.find(b=>b.tijd===slot); const isPause=isBreak(slot,dayCfg?.breaks??[])
              return(
                <div key={slot} className={`flex items-center gap-3 px-3 py-2.5 border-b border-[#1e1e1e] ${b?'bg-[#2176d4]/5':isPause?'bg-amber-900/10':'bg-[#161616]'}`}>
                  <span className={`font-black text-xs w-14 text-center shrink-0 px-2 py-1 rounded-lg ${b?'bg-[#2176d4] text-white':isPause?'bg-amber-900/30 text-amber-400':'bg-[#1e1e1e] text-[#2176d4] border border-[#2176d4]/20'}`}>{slot}</span>
                  {isPause?<span className="text-amber-400 text-xs font-medium">Pauze</span>:b?<div className="min-w-0 flex-1"><p className="font-bold text-white text-sm truncate">{b.naam}</p><p className="text-xs text-gray-400">{b.service} · €{b.prijs}</p></div>:<span className="text-gray-600 text-xs font-medium">Vrij</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── DatePicker ─────────────────────────────────────────── */
function DatePicker({value,onChange}:{value:string;onChange:(d:string)=>void}) {
  const[open,setOpen]=useState(false)
  const[viewDate,setViewDate]=useState(()=>{const base=value?new Date(value+'T12:00:00'):new Date();return new Date(base.getFullYear(),base.getMonth(),1)})
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)},[])
  useEffect(()=>{if(value){const d=new Date(value+'T12:00:00');setViewDate(new Date(d.getFullYear(),d.getMonth(),1))}},[value])
  const year=viewDate.getFullYear(),month=viewDate.getMonth()
  const todayStr=new Date().toISOString().split('T')[0]
  const startOffset=(new Date(year,month,1).getDay()+6)%7
  const daysInMonth=new Date(year,month+1,0).getDate()
  const cells:(number|null)[]=[...Array(startOffset).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)]
  while(cells.length%7!==0)cells.push(null)
  function selectDay(day:number){const str=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;onChange(str);setOpen(false)}
  return(
    <div ref={ref} className="relative">
      <button type="button" onClick={()=>setOpen(o=>!o)} className={`w-full bg-[#0e0e0e] border rounded-xl px-3 py-2.5 text-sm text-left flex items-center justify-between transition-colors ${open?'border-[#2176d4]':'border-[#2a2a2a] hover:border-[#333]'}`}>
        <span className={value?'text-white':'text-gray-700'}>{value?formatLongDate(value):'Kies een datum'}</span>
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
      </button>
      {open&&(
        <div className="absolute top-full left-0 mt-2 z-50 w-full bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl p-4 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={()=>setViewDate(new Date(year,month-1,1))} className="w-8 h-8 rounded-lg bg-[#1e1e1e] hover:bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg></button>
            <span className="text-white font-bold text-sm capitalize">{NL_MONTHS_LONG[month]} {year}</span>
            <button type="button" onClick={()=>setViewDate(new Date(year,month+1,1))} className="w-8 h-8 rounded-lg bg-[#1e1e1e] hover:bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg></button>
          </div>
          <div className="grid grid-cols-7 mb-1">{['Ma','Di','Wo','Do','Vr','Za','Zo'].map(d=><div key={d} className="text-center text-xs font-bold text-gray-600 py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day,i)=>{
              if(!day)return<div key={i}/>
              const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const isSelected=ds===value,isToday=ds===todayStr,isPast=ds<todayStr
              return<button key={i} type="button" onClick={()=>!isPast&&selectDay(day)} disabled={isPast} className={`aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center ${isPast?'text-gray-700 cursor-not-allowed':''} ${isSelected&&!isPast?'bg-[#2176d4] text-white shadow-[0_0_12px_rgba(33,118,212,0.35)]':''} ${isToday&&!isSelected?'bg-[#2176d4]/15 text-[#2176d4] font-bold ring-1 ring-[#2176d4]/30':''} ${!isSelected&&!isToday&&!isPast?'text-gray-400 hover:bg-[#1e1e1e] hover:text-white':''}`}>{day}</button>
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-[#1e1e1e] flex justify-end"><button type="button" onClick={()=>{onChange(todayStr);setOpen(false)}} className="text-xs font-bold text-[#2176d4] hover:text-[#3080e0] transition-colors">Vandaag</button></div>
        </div>
      )}
    </div>
  )
}

/* ─── AfspraakFormModal ──────────────────────────────────── */
function AfspraakFormModal({initial,slug,onClose,onSaved}:{initial:AfspraakFormulierType;slug:string;onClose:()=>void;onSaved:()=>void}) {
  const[form,setForm]=useState<AfspraakFormulierType>(initial)
  const[diensten,setDiensten]=useState<{id:string;naam:string;prijs:number;duur:number}[]>([])
  const[slots,setSlots]=useState<string[]>([])
  const[loadingSlots,setLoadingSlots]=useState(false)
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const isEdit=!!initial.id

  useEffect(()=>{
    fetch('/api/instellingen').then(r=>r.json()).then(d=>{
      const s=d.instellingen??{}
      if(s.diensten){
        const list=JSON.parse(s.diensten)
        setDiensten(list)
        if(isEdit&&!form.dienstId&&form.service){
          const svc=list.find((x:{naam:string;id:string})=>x.naam===form.service)
          if(svc)setForm(f=>({...f,dienstId:svc.id}))
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    if(!form.datum||!form.dienstId){setSlots([]);return}
    setLoadingSlots(true)
    fetch(`/api/slots/${slug}?datum=${form.datum}&dienst=${form.dienstId}`)
      .then(r=>r.json()).then(d=>{
        const fetched:string[]=d.slots??[]
        if(isEdit&&initial.tijd&&!fetched.includes(initial.tijd))fetched.unshift(initial.tijd)
        setSlots(fetched)
        if(!isEdit&&form.tijd&&!fetched.includes(form.tijd))setForm(f=>({...f,tijd:''}))
      }).finally(()=>setLoadingSlots(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[form.datum,form.dienstId])

  function pickDienst(naam:string){
    const s=diensten.find(s=>s.naam===naam)
    setForm(f=>({...f,service:naam,dienstId:s?.id??'',prijs:s?.prijs??f.prijs,duur:s?.duur??f.duur,tijd:''}))
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');setSaving(true)
    try{
      const{dienstId:_,...rest}=form
      const method=isEdit?'PATCH':'POST'
      const r=await fetch('/api/afspraken',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(isEdit?{id:initial.id,...rest}:rest)})
      const d=await r.json()
      if(!r.ok){setError(d.error??'Fout');return}
      onSaved()
    }catch{setError('Netwerkfout')}finally{setSaving(false)}
  }

  return(
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-[#141414] rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#2a2a2a] w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[#1e1e1e] flex items-center justify-between sticky top-0 bg-[#141414] z-10">
          <h2 className="font-bold text-white text-lg">{isEdit?'Afspraak bewerken':'Afspraak toevoegen'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all flex items-center justify-center text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          {error&&<div className="bg-red-900/30 border border-red-700/40 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Naam *</label><input required value={form.naam} onChange={e=>setForm(f=>({...f,naam:e.target.value}))} placeholder="Ahmed El Mansouri" className="w-full bg-[#0e0e0e] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/></div>
            <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Telefoon</label><input value={form.telefoon} onChange={e=>setForm(f=>({...f,telefoon:e.target.value}))} placeholder="06 12345678" className="w-full bg-[#0e0e0e] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/></div>
          </div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">E-mail <span className="text-gray-700 normal-case font-normal">(optioneel — klant ontvangt bevestiging)</span></label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="klant@email.com" className="w-full bg-[#0e0e0e] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/></div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Dienst *</label>
            {diensten.length>0?(
              <div className="grid grid-cols-1 gap-2">
                {diensten.map(s=>(
                  <button key={s.id} type="button" onClick={()=>pickDienst(s.naam)} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${form.service===s.naam?'border-[#2176d4] bg-[#2176d4]/10 text-white':'border-[#2a2a2a] bg-[#0e0e0e] text-gray-400 hover:border-[#333] hover:text-white'}`}>
                    <span>{s.naam}</span>
                    <span className={`font-black ${form.service===s.naam?'text-[#2176d4]':'text-gray-600'}`}>€{s.prijs} · {s.duur}min</span>
                  </button>
                ))}
              </div>
            ):(
              <input required value={form.service} onChange={e=>setForm(f=>({...f,service:e.target.value}))} className="w-full bg-[#0e0e0e] border border-[#2a2a2a] text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/>
            )}
          </div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Datum *</label><DatePicker value={form.datum} onChange={d=>setForm(f=>({...f,datum:d,tijd:''}))} /></div>
          {form.datum&&(
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Tijd *</label>
              {loadingSlots?<div className="flex items-center gap-2 py-3 text-gray-500 text-sm"><div className="w-4 h-4 border-2 border-[#2176d4] border-t-transparent rounded-full animate-spin"/>Tijdsloten laden...</div>:!form.dienstId?<div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-4 py-3 text-gray-500 text-sm">Kies eerst een dienst</div>:slots.length===0?<div className="bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl px-4 py-3 text-gray-500 text-sm">Geen beschikbare tijdsloten op deze dag</div>:(
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(s=><button key={s} type="button" onClick={()=>setForm(f=>({...f,tijd:s}))} className={`py-2.5 rounded-xl text-sm font-bold transition-all ${form.tijd===s?'bg-[#2176d4] text-white shadow-[0_0_15px_rgba(33,118,212,0.3)]':'bg-[#0e0e0e] border border-[#2a2a2a] text-gray-400 hover:border-[#2176d4]/50 hover:text-white'}`}>{s}</button>)}
                </div>
              )}
            </div>
          )}
          <div><label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Notities <span className="text-gray-700 normal-case font-normal">(intern)</span></label><textarea value={form.notities} onChange={e=>setForm(f=>({...f,notities:e.target.value}))} rows={2} placeholder="bijv. altijd kort aan zijkanten" className="w-full bg-[#0e0e0e] border border-[#2a2a2a] text-white placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors resize-none"/></div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-gray-400 text-sm font-medium hover:border-[#333] hover:text-white transition-all">Annuleren</button>
            <button type="submit" disabled={saving||!form.datum||!form.tijd} className="flex-1 py-2.5 rounded-xl bg-[#2176d4] text-white text-sm font-bold hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-40 transition-all duration-200">{saving?'Opslaan...':isEdit?'Bijwerken':'Toevoegen'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Appointments ───────────────────────────────────────── */
function AppointmentsView({session}:{session:Session}) {
  const[filter,setFilter]=useState<'upcoming'|'today'|'all'|'past'>('upcoming')
  const[search,setSearch]=useState('')
  const[bookings,setBookings]=useState<Afspraak[]>([])
  const[loading,setLoading]=useState(false)
  const[deleting,setDeleting]=useState<string|null>(null)
  const[noShowLoading,setNoShowLoading]=useState<string|null>(null)
  const[formBooking,setFormBooking]=useState<AfspraakFormulierType|null>(null)
  const[confirmDel,setConfirmDel]=useState<string|null>(null)

  const load=useCallback(async()=>{
    setLoading(true)
    try{const r=await fetch(`/api/afspraken?filter=${filter}&search=${encodeURIComponent(search)}`);const d=await r.json();setBookings(d.afspraken??[])}finally{setLoading(false)}
  },[filter,search])

  useEffect(()=>{load();const id=setInterval(load,60_000);return()=>clearInterval(id)},[load])

  async function del(id:string){
    setDeleting(id)
    await fetch('/api/afspraken',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setDeleting(null);setConfirmDel(null);load()
  }
  async function toggleNoShow(id:string,current:boolean){
    setNoShowLoading(id)
    await fetch('/api/afspraken',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,no_show:!current})})
    setNoShowLoading(null);load()
  }

  const statusBadge={
    today:<span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400">VANDAAG</span>,
    upcoming:<span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#2176d4]/10 text-[#2176d4]">AANKOMEND</span>,
    past:<span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#1e1e1e] text-gray-500">VERLEDEN</span>,
  }
  const noShowBadge=<span className="text-xs font-black px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-400">NO-SHOW</span>
  const filters=[{id:'upcoming',label:'Aankomend'},{id:'today',label:'Vandaag'},{id:'all',label:'Alle'},{id:'past',label:'Verleden'}] as const

  return(
    <div>
      {formBooking&&<AfspraakFormModal initial={formBooking} slug={session.slug} onClose={()=>setFormBooking(null)} onSaved={()=>{setFormBooking(null);load()}}/>}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Afspraken</h1>
        <div className="flex gap-2">
          <CalendarSubscribeButton/>
          <button onClick={()=>setFormBooking({...LEEG_FORMULIER})} className="px-4 py-2 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] transition-all duration-200">+ Toevoegen</button>
        </div>
      </div>
      <div className="flex flex-col gap-3 mb-6">
        <input type="text" placeholder="Zoeken op naam, e-mail of code..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#2176d4] transition-colors"/>
        <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1 border border-[#2a2a2a] overflow-x-auto">
          {filters.map(f=><button key={f.id} onClick={()=>setFilter(f.id)} className={['flex-1 min-w-fit px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',filter===f.id?'bg-[#2176d4] text-white shadow-sm':'text-gray-500 hover:text-gray-300'].join(' ')}>{f.label}</button>)}
        </div>
      </div>
      {loading?<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/></div>:bookings.length===0?<div className="text-center py-12 text-gray-500 font-medium">Geen afspraken gevonden</div>:(
        <div className="space-y-3">
          {bookings.map(b=>{
            const status=getStatus(b.datum)
            return(
              <div key={b.id} className="bg-[#141414] rounded-2xl border border-[#222] overflow-hidden transition-all duration-200 hover:border-[#2a2a2a] hover:-translate-y-px hover:shadow-md hover:shadow-black/30">
                <div className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2176d4]/20 to-[#2176d4]/5 flex items-center justify-center text-xs font-black text-[#2176d4] shrink-0 border border-[#2176d4]/10">{serviceInitial(b.service)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-white truncate">{b.naam}</p>
                        <p className="text-sm text-gray-400 truncate">{b.service} · {formatMedDate(b.datum)} · {b.tijd}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          <a href={`tel:${b.telefoon}`} className="text-xs text-[#2176d4] hover:underline">{b.telefoon}</a>
                          <a href={`mailto:${b.email}`} className="text-xs text-[#2176d4] hover:underline truncate">{b.email}</a>
                        </div>
                        {b.notities&&<p className="text-xs text-gray-500 italic mt-1 truncate">📝 {b.notities}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">{b.no_show?noShowBadge:statusBadge[status]}</div>
                      </div>
                      <div className="text-right shrink-0"><p className="font-black text-white">€{b.prijs}</p><p className="text-xs text-gray-500 font-mono">{b.code}</p></div>
                    </div>
                  </div>
                </div>
                {confirmDel===b.id?(
                  <div className="border-t border-[#1e1e1e] px-4 py-3 flex gap-2">
                    <button onClick={()=>del(b.id)} disabled={deleting===b.id} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform">{deleting===b.id?'…':'Ja, verwijder'}</button>
                    <button onClick={()=>setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400 font-bold text-sm active:scale-95 transition-transform">Annuleren</button>
                  </div>
                ):(
                  <div className="border-t border-[#1e1e1e] grid grid-cols-3 divide-x divide-[#1e1e1e]">
                    <button onClick={()=>setFormBooking({id:b.id,naam:b.naam,telefoon:b.telefoon,email:b.email,service:b.service,dienstId:'',prijs:b.prijs,duur:b.duur,datum:b.datum,tijd:b.tijd,notities:b.notities??''})} className="py-3 text-sm font-bold text-[#2176d4] hover:bg-[#2176d4]/5 active:bg-[#2176d4]/10 transition-colors">Bewerken</button>
                    <button onClick={()=>toggleNoShow(b.id,!!b.no_show)} disabled={noShowLoading===b.id} className={`py-3 text-sm font-bold transition-colors disabled:opacity-50 hover:bg-white/5 active:bg-white/10 ${b.no_show?'text-gray-500':'text-orange-400'}`}>{noShowLoading===b.id?'…':b.no_show?'Herstel':'No-show'}</button>
                    <button onClick={()=>setConfirmDel(b.id)} className="py-3 text-sm font-bold text-red-400 hover:bg-red-500/5 active:bg-red-500/10 transition-colors">Verwijder</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Customers ──────────────────────────────────────────── */
function CustomersView() {
  const[klanten,setKlanten]=useState<Klant[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const[expanded,setExpanded]=useState<string|null>(null)
  useEffect(()=>{fetch('/api/klanten').then(r=>r.json()).then(d=>{setKlanten(d.klanten??[]);setLoading(false)})},[])
  const filtered=klanten.filter(c=>c.email.includes(search.toLowerCase())||c.naam.toLowerCase().includes(search.toLowerCase()))
  return(
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Klanten</h1><p className="text-gray-500 text-sm mt-0.5">{klanten.length} unieke klanten</p></div>
      </div>
      <div className="mb-5"><input type="text" placeholder="Zoeken op naam of e-mail..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/></div>
      {loading?<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/></div>:filtered.length===0?<p className="text-center text-gray-500 py-12">Geen klanten gevonden</p>:(
        <div className="space-y-2">
          {filtered.map(c=>(
            <div key={c.email} className="bg-[#141414] rounded-2xl border border-[#222] overflow-hidden transition-all duration-200 hover:border-[#2a2a2a]">
              <button onClick={()=>setExpanded(expanded===c.email?null:c.email)} className="w-full flex items-center gap-4 px-5 py-4 text-left">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2176d4]/20 to-[#2176d4]/5 flex items-center justify-center text-sm font-black text-[#2176d4] shrink-0 border border-[#2176d4]/10">{c.naam.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="font-bold text-white truncate">{c.naam}</p><p className="text-xs text-gray-500 truncate">{c.email}</p></div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div className="hidden sm:block"><p className="text-xs text-gray-600">bezoeken</p><p className="font-black text-white">{c.bezoeken}</p></div>
                  <div><p className="text-xs text-gray-600">laatste bezoek</p><p className="font-bold text-white text-sm">{formatShortDate(c.lastDate)}</p></div>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${expanded===c.email?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </button>
              {expanded===c.email&&(
                <div className="border-t border-[#1e1e1e] divide-y divide-[#1a1a1a]">
                  <div className="px-5 py-3 flex gap-6 sm:hidden"><div><p className="text-xs text-gray-600">bezoeken</p><p className="font-black text-white">{c.bezoeken}</p></div></div>
                  {c.afspraken.map((b,i)=>(
                    <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-[#1e1e1e] flex items-center justify-center text-[10px] font-black text-gray-500 shrink-0">{serviceInitial(b.service)}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{b.service}</p><p className="text-xs text-gray-500">{formatMedDate(b.datum)} · {b.tijd}</p></div>
                      <div className="text-right shrink-0"><p className="text-[10px] text-gray-600 font-mono">{b.code}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Services ───────────────────────────────────────────── */
interface DienstItem{id:string;naam:string;prijs:number;duur:number;beschrijving:string}
const DEFAULT_DIENSTEN:DienstItem[]=[
  {id:'knipbeurt',naam:'Knipbeurt',prijs:20,duur:30,beschrijving:'30 minuten'},
  {id:'knipbeurt-baard',naam:'Knipbeurt met baard',prijs:25,duur:45,beschrijving:'45 minuten'},
  {id:'baard-trimmen',naam:'Baard trimmen',prijs:10,duur:15,beschrijving:'15 minuten'},
  {id:'contouren',naam:'Contouren',prijs:5,duur:15,beschrijving:'15 minuten'},
]

function ServicesView() {
  const[diensten,setDiensten]=useState<DienstItem[]>([])
  const[form,setForm]=useState<DienstItem|null>(null)
  const[saving,setSaving]=useState(false)
  const[msg,setMsg]=useState('')
  const[confirmRemove,setConfirmRemove]=useState<string|null>(null)
  const durations=[15,20,30,45,60,75,90]

  useEffect(()=>{
    fetch('/api/instellingen').then(r=>r.json()).then(d=>{
      const s=d.instellingen??{}
      setDiensten(s.diensten?JSON.parse(s.diensten):DEFAULT_DIENSTEN)
    })
  },[])

  async function persist(updated:DienstItem[]){
    setSaving(true)
    await fetch('/api/instellingen',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'diensten',value:JSON.stringify(updated)})})
    setSaving(false);setMsg('Opgeslagen');setTimeout(()=>setMsg(''),3000)
  }
  function saveForm(){
    if(!form||!form.naam)return
    const updated=diensten.find(s=>s.id===form.id)?diensten.map(s=>s.id===form.id?form:s):[...diensten,form]
    setDiensten(updated);persist(updated);setForm(null)
  }
  function remove(id:string){const updated=diensten.filter(s=>s.id!==id);setDiensten(updated);persist(updated);setConfirmRemove(null)}

  return(
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Diensten</h1>
        <button onClick={()=>setForm({id:Date.now().toString(),naam:'',prijs:0,duur:30,beschrijving:''})} className="px-4 py-2 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.35)] transition-all duration-200">+ Toevoegen</button>
      </div>
      {msg&&<div className="mb-4 bg-[#2176d4]/10 border border-[#2176d4]/20 text-[#2176d4] text-sm font-bold px-4 py-3 rounded-xl">{msg}</div>}
      {form&&(
        <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5 mb-6">
          <h2 className="font-semibold text-white mb-4">{diensten.find(s=>s.id===form.id)?'Dienst bewerken':'Nieuwe dienst'}</h2>
          <div className="space-y-3">
            <div><label className="block text-xs font-bold text-gray-400 mb-1">Naam</label><input value={form.naam} onChange={e=>setForm({...form,naam:e.target.value})} placeholder="bijv. Normale Knipbeurt" className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-bold text-gray-400 mb-1">Prijs (€)</label><input type="number" min="0" value={form.prijs} onChange={e=>setForm({...form,prijs:Number(e.target.value)})} className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1">Duur</label><select value={form.duur} onChange={e=>setForm({...form,duur:Number(e.target.value)})} className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-[#2176d4] transition-colors">{durations.map(d=><option key={d} value={d}>{d} min</option>)}</select></div>
            </div>
            <div><label className="block text-xs font-bold text-gray-400 mb-1">Omschrijving</label><input value={form.beschrijving} onChange={e=>setForm({...form,beschrijving:e.target.value})} placeholder="bijv. 30 minuten" className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={()=>setForm(null)} className="px-4 py-2 border-2 border-[#333] rounded-xl font-bold text-gray-400 text-sm hover:border-[#444] transition-colors">Annuleren</button>
            <button onClick={saveForm} disabled={!form.naam||saving} className="px-6 py-2 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-50 transition-all duration-200">{saving?'Opslaan...':'Opslaan'}</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {diensten.map(s=>(
          <div key={s.id} className="bg-[#141414] rounded-2xl border border-[#222] p-4 flex items-center gap-4 transition-all duration-200 hover:border-[#2a2a2a] hover:-translate-y-px hover:shadow-md hover:shadow-black/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2176d4]/20 to-[#2176d4]/5 flex items-center justify-center text-xs font-black text-[#2176d4] shrink-0 border border-[#2176d4]/10">{serviceInitial(s.naam)}</div>
            <div className="flex-1 min-w-0"><p className="font-black text-white">{s.naam}</p><p className="text-sm text-gray-400">{s.beschrijving} · {s.duur} min</p></div>
            <div className="text-right shrink-0">
              <p className="font-black text-[#2176d4] text-lg">€{s.prijs}</p>
              <div className="flex gap-3 mt-1 justify-end">
                <button onClick={()=>setForm({...s})} className="text-xs text-[#2176d4] hover:underline">Bewerken</button>
                {confirmRemove===s.id?<span className="flex gap-1"><button onClick={()=>remove(s.id)} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-lg font-bold">Ja</button><button onClick={()=>setConfirmRemove(null)} className="text-xs border border-[#333] text-gray-400 px-2 py-0.5 rounded-lg font-bold">Nee</button></span>:<button onClick={()=>setConfirmRemove(s.id)} className="text-xs text-red-400 hover:text-red-500">Verwijder</button>}
              </div>
            </div>
          </div>
        ))}
        {diensten.length===0&&<p className="text-center text-gray-500 py-8 font-medium">Geen diensten</p>}
      </div>
    </div>
  )
}

/* ─── Toggle ─────────────────────────────────────────────── */
function Toggle({value,onChange}:{value:boolean;onChange:(v:boolean)=>void}){
  return(
    <button onClick={()=>onChange(!value)}
      className={`relative inline-flex w-12 h-6 rounded-full transition-colors ${value?'bg-[#2176d4]':'bg-[#333]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value?'translate-x-6':'translate-x-0.5'}`}/>
    </button>
  )
}

/* ─── BlockedCalendar ────────────────────────────────────── */
function BlockedCalendar({blocked,onChange}:{blocked:string[];onChange:(v:string[])=>void}){
  const today=new Date();today.setHours(0,0,0,0)
  const[viewMonth,setViewMonth]=useState(new Date(today.getFullYear(),today.getMonth(),1))
  const firstDay=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1)
  const lastDay=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0)
  const startOffset=(firstDay.getDay()+6)%7
  const cells:(Date|null)[]=Array(startOffset).fill(null)
  for(let i=1;i<=lastDay.getDate();i++)cells.push(new Date(viewMonth.getFullYear(),viewMonth.getMonth(),i))
  function toggle(ds:string){onChange(blocked.includes(ds)?blocked.filter(d=>d!==ds):[...blocked,ds].sort())}
  return(
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-gray-400 font-bold text-lg transition-colors">‹</button>
        <span className="font-bold text-white capitalize text-sm">{viewMonth.toLocaleDateString('nl-NL',{month:'long',year:'numeric'})}</span>
        <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-gray-400 font-bold text-lg transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">{NL_DAYS_SHORT.map(d=><div key={d} className="text-center text-xs font-bold text-gray-500 py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day,i)=>{
          if(!day)return<div key={i}/>
          const ds=toDateStr(day);const isPast=day<today;const isBlocked=blocked.includes(ds);const isToday=day.getTime()===today.getTime()
          return<button key={i} disabled={isPast} onClick={()=>toggle(ds)}
            className={['aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all',isPast?'text-gray-700 cursor-not-allowed':isBlocked?'bg-red-600 text-white shadow hover:bg-red-700 scale-105':isToday?'ring-2 ring-[#2176d4] text-[#2176d4] hover:bg-red-900/20 hover:text-red-400 hover:ring-red-500':'text-gray-300 hover:bg-red-900/20 hover:text-red-400'].join(' ')}>
            {day.getDate()}
          </button>
        })}
      </div>
    </div>
  )
}

/* ─── PortalDatePicker ───────────────────────────────────── */
function PortalDatePicker({value,onChange,min}:{value:string;onChange:(v:string)=>void;min?:string}){
  const today=new Date()
  const initDate=value?new Date(value+'T12:00:00'):today
  const[ym,setYm]=useState(`${initDate.getFullYear()}-${String(initDate.getMonth()+1).padStart(2,'0')}`)
  const[yr,mo]=ym.split('-').map(Number)
  const first=new Date(yr,mo-1,1)
  const totalDays=new Date(yr,mo,0).getDate()
  const startDow=(first.getDay()+6)%7
  const minStr=min??toDateStr(today)
  const cells:React.ReactNode[]=[]
  for(let i=0;i<startDow;i++)cells.push(<div key={`e${i}`}/>)
  for(let d=1;d<=totalDays;d++){
    const ds=`${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const disabled=ds<minStr
    const selected=ds===value
    cells.push(
      <button key={ds} type="button" disabled={disabled} onClick={()=>onChange(ds)}
        className={`aspect-square rounded-lg text-sm font-medium transition-colors ${disabled?'opacity-30 cursor-not-allowed text-gray-600':selected?'bg-[#2176d4] text-white':'bg-[#1a1a1a] text-gray-300 hover:bg-[#2176d4]/30 hover:text-white'}`}>
        {d}
      </button>
    )
  }
  return(
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={()=>{const d=new Date(yr,mo-2,1);setYm(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}}
          className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] flex items-center justify-center text-lg">&lt;</button>
        <span className="text-white font-bold text-sm capitalize">{NL_MONTHS_LONG[mo-1]} {yr}</span>
        <button type="button" onClick={()=>{const d=new Date(yr,mo,1);setYm(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)}}
          className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] flex items-center justify-center text-lg">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {NL_DAYS_SHORT.map(d=><div key={d} className="aspect-square flex items-center justify-center text-xs text-gray-500 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
    </div>
  )
}

/* ─── WaitlistSection ────────────────────────────────────── */
function WaitlistSection({slug}:{slug:string}){
  const[list,setList]=useState<WachtlijstEntry[]>([])
  const[loading,setLoading]=useState(true)
  const[removing,setRemoving]=useState<string|null>(null)
  const[confirmRemove,setConfirmRemove]=useState<string|null>(null)
  const[assignEntry,setAssignEntry]=useState<WachtlijstEntry|null>(null)
  const[diensten,setDiensten]=useState<{id:string;naam:string;prijs:number;duur:number}[]>([])
  const[assignDate,setAssignDate]=useState('')
  const[assignDienst,setAssignDienst]=useState('')
  const[assignPrijs,setAssignPrijs]=useState(0)
  const[assignDuur,setAssignDuur]=useState(30)
  const[assignTijd,setAssignTijd]=useState('')
  const[assignSlots,setAssignSlots]=useState<string[]>([])
  const[assignSlotsLoading,setAssignSlotsLoading]=useState(false)
  const[assignLoading,setAssignLoading]=useState(false)
  const[assignError,setAssignError]=useState('')
  const[assignDone,setAssignDone]=useState(false)
  const[filterDatum,setFilterDatum]=useState<string|null>(null)

  async function loadList(){
    const r=await fetch('/api/wachtlijst');const d=await r.json();setList(d.wachtlijst??[]);setLoading(false)
  }
  useEffect(()=>{
    loadList()
    fetch('/api/instellingen').then(r=>r.json()).then(d=>{
      const raw=d.instellingen?.diensten;setDiensten(raw?JSON.parse(raw):[])
    })
  },[])

  async function fetchSlots(datum:string,duur:number){
    if(!datum){setAssignSlots([]);return}
    setAssignSlotsLoading(true);setAssignTijd('')
    const svc=diensten.find(d=>d.duur===duur)??diensten[0]
    if(!svc){setAssignSlotsLoading(false);return}
    const r=await fetch(`/api/slots/${slug}?datum=${datum}&dienst=${svc.id}`)
    const data=await r.json();setAssignSlots(data.slots??[]);setAssignSlotsLoading(false)
  }

  function openAssign(w:WachtlijstEntry){
    const svc=diensten.find(s=>s.naam===w.service)??diensten[0]
    setAssignEntry(w);setAssignDate(w.datum??'');setAssignDienst(svc?.naam??'')
    setAssignPrijs(svc?.prijs??0);setAssignDuur(svc?.duur??30)
    setAssignTijd('');setAssignError('');setAssignDone(false)
    if(w.datum&&svc)fetchSlots(w.datum,svc.duur)
    else setAssignSlots([])
  }

  async function remove(id:string){
    setRemoving(id)
    await fetch('/api/wachtlijst',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setRemoving(null);setConfirmRemove(null);loadList()
  }

  async function assign(){
    if(!assignEntry||!assignDate||!assignTijd||!assignDienst){setAssignError('Kies een datum en tijdslot');return}
    setAssignLoading(true);setAssignError('')
    const r=await fetch('/api/wachtlijst',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      wachtlijst_id:assignEntry.id,datum:assignDate,tijd:assignTijd,
      service:assignDienst,prijs:assignPrijs,duur:assignDuur,
    })})
    const d=await r.json();setAssignLoading(false)
    if(!r.ok){setAssignError(d.error??'Fout bij inplannen');return}
    setAssignDone(true)
    setTimeout(()=>{setAssignEntry(null);setAssignDone(false);loadList()},2000)
  }

  const uniqueDatums=useMemo(()=>[...new Set(list.map(w=>w.datum??''))].filter(Boolean).sort(),[list])
  const grouped=useMemo(()=>{
    const m=new Map<string,WachtlijstEntry[]>()
    for(const w of list){const k=w.datum??'';const a=m.get(k)??[];a.push(w);m.set(k,a)}
    return m
  },[list])
  const visibleDatums=filterDatum?[filterDatum]:uniqueDatums

  return(
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-[family-name:var(--font-bebas)] tracking-widest text-white">Wachtlijst</h2>
          <p className="text-xs text-gray-500">Klanten die willen boeken maar geen slot hadden</p>
        </div>
        <button onClick={loadList} className="text-xs text-[#2176d4] hover:underline">Vernieuwen</button>
      </div>
      {!loading&&list.length>0&&(
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={()=>setFilterDatum(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${filterDatum===null?'bg-[#2176d4] border-[#2176d4] text-white':'border-[#2a2a2a] text-gray-400 hover:border-[#2176d4] hover:text-white'}`}>
            Alle ({list.length})
          </button>
          {uniqueDatums.map(datum=>(
            <button key={datum} onClick={()=>setFilterDatum(datum===filterDatum?null:datum)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${filterDatum===datum?'bg-[#2176d4] border-[#2176d4] text-white':'border-[#2a2a2a] text-gray-400 hover:border-[#2176d4] hover:text-white'}`}>
              {formatMedDate(datum)} ({(grouped.get(datum)?.length??0)})
            </button>
          ))}
        </div>
      )}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] overflow-hidden">
        {loading?<div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/></div>
        :list.length===0?<p className="text-center text-gray-500 font-medium py-8">Geen wachtlijst inschrijvingen</p>:(
          <div>
            {visibleDatums.map(datum=>(
              <div key={datum}>
                <div className="px-5 py-2.5 bg-[#0e0e0e] border-b border-[#1e1e1e] flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{formatLongDate(datum)}</span>
                  <span className="text-xs text-gray-600">· {grouped.get(datum)?.length??0} {(grouped.get(datum)?.length??0)===1?'persoon':'personen'}</span>
                </div>
                <div className="divide-y divide-[#1e1e1e]">
                  {(grouped.get(datum)??[]).map(w=>(
                    <div key={w.id} className="px-5 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{w.naam}</p>
                          {w.service&&<span className="text-xs bg-[#1e1e1e] text-gray-400 px-2 py-0.5 rounded-full">{w.service}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {w.telefoon&&<a href={`tel:${w.telefoon}`} className="text-xs text-[#2176d4] hover:underline">{w.telefoon}</a>}
                          {w.email&&<a href={`mailto:${w.email}`} className="text-xs text-[#2176d4] hover:underline">{w.email}</a>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={()=>openAssign(w)}
                          className="px-3 py-1.5 bg-[#2176d4] text-white rounded-lg text-xs font-bold hover:bg-[#3080e0] transition-colors">
                          Inplannen
                        </button>
                        {confirmRemove===w.id?(
                          <div className="flex gap-1">
                            <button onClick={()=>remove(w.id)} disabled={removing===w.id} className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg font-bold disabled:opacity-50">{removing===w.id?'...':'Ja'}</button>
                            <button onClick={()=>setConfirmRemove(null)} className="text-xs border border-[#333] text-gray-400 px-2 py-1 rounded-lg font-bold">Nee</button>
                          </div>
                        ):(
                          <button onClick={()=>setConfirmRemove(w.id)} className="px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg text-xs font-medium hover:bg-white/5 transition-colors">Verwijder</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {assignEntry&&(
        <div className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" onClick={()=>{if(!assignLoading)setAssignEntry(null)}}>
          <div className="bg-[#141414] rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#2a2a2a] w-full sm:max-w-md shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[#1e1e1e] flex items-center justify-between sticky top-0 bg-[#141414] z-10">
              <div>
                <h2 className="font-bold text-white text-base">Inplannen</h2>
                <p className="text-xs text-gray-500 mt-0.5">{assignEntry.naam} · voorkeur {assignEntry.datum?formatShortDate(assignEntry.datum):''}</p>
              </div>
              <button onClick={()=>setAssignEntry(null)} disabled={assignLoading}
                className="w-8 h-8 rounded-lg bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-all flex items-center justify-center text-lg leading-none">×</button>
            </div>
            <div className="p-6 space-y-5">
              {assignDone?(
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <p className="font-bold text-white text-lg">Ingepland!</p>
                  <p className="text-sm text-gray-400 mt-1">{assignEntry.email?'Bevestigingsmail verstuurd':'Afspraak aangemaakt'}</p>
                </div>
              ):(
                <>
                  {assignError&&<div className="bg-red-900/30 border border-red-700/40 text-red-400 text-sm px-4 py-3 rounded-xl">{assignError}</div>}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Datum</label>
                    <PortalDatePicker value={assignDate} onChange={d=>{setAssignDate(d);fetchSlots(d,assignDuur)}}/>
                  </div>
                  {assignDienst&&(
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Dienst</label>
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#2a2a2a] bg-[#0e0e0e]">
                        <span className="text-sm text-white font-medium">{assignDienst}</span>
                        <span className="text-sm font-black text-[#2176d4]">€{assignPrijs} · {assignDuur}min</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Tijdslot</label>
                    {assignSlotsLoading?<div className="flex justify-center py-4"><div className="w-5 h-5 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/></div>
                    :!assignDate?<p className="text-xs text-gray-600 py-2">Kies eerst een datum</p>
                    :assignSlots.length===0?<p className="text-xs text-orange-400 py-2">Geen beschikbare slots op deze dag</p>:(
                      <div className="grid grid-cols-4 gap-1.5">
                        {assignSlots.map(s=>(
                          <button key={s} type="button" onClick={()=>setAssignTijd(s)}
                            className={`py-2 rounded-lg text-sm font-bold transition-all border ${assignTijd===s?'bg-[#2176d4] border-[#2176d4] text-white':'border-[#2a2a2a] text-gray-400 hover:border-[#2176d4] hover:text-white'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={assign} disabled={assignLoading||!assignTijd||!assignDate||!assignDienst}
                    className="w-full py-3 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {assignLoading?'Bezig...':'Inplannen & bevestiging sturen'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ManagementView ─────────────────────────────────────── */
function ManagementView({session}:{session:Session}){
  const[banned,setBanned]=useState<GebandEmail[]>([])
  const[newEmail,setNewEmail]=useState('');const[reden,setReden]=useState('')
  const[loading,setLoading]=useState(false);const[actionLoading,setActionLoading]=useState<string|null>(null)
  const[showForm,setShowForm]=useState(false)
  const[banMsg,setBanMsg]=useState('')
  const[confirmUnban,setConfirmUnban]=useState<string|null>(null)

  async function load(){
    const r=await fetch('/api/ban');const d=await r.json();setBanned(d.gebanned??[])
  }
  useEffect(()=>{load()},[])

  async function ban(e:React.FormEvent){
    e.preventDefault();setLoading(true);setBanMsg('')
    const r=await fetch('/api/ban',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:newEmail,reden})})
    const d=await r.json()
    setNewEmail('');setReden('');setShowForm(false);setLoading(false)
    if(d.afspraken_geannuleerd>0)setBanMsg(`Geband — ${d.afspraken_geannuleerd} afspraak${d.afspraken_geannuleerd>1?'en':''} automatisch geannuleerd`)
    else setBanMsg('Geband')
    setTimeout(()=>setBanMsg(''),5000)
    load()
  }

  async function unban(id:string){
    setActionLoading(id)
    await fetch('/api/ban',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setActionLoading(null);setConfirmUnban(null);load()
  }

  return(
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Beheer</h1>
        <button onClick={()=>setShowForm(f=>!f)} className="px-4 py-2 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.35)] transition-all duration-200">
          Email bannen
        </button>
      </div>
      {banMsg&&<div className="mb-4 bg-[#2176d4]/10 border border-[#2176d4]/20 text-[#2176d4] text-sm font-bold px-4 py-3 rounded-xl">{banMsg}</div>}
      {showForm&&(
        <form onSubmit={ban} className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5 mb-6">
          <h2 className="font-semibold text-white mb-4">Nieuw ban</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">E-mailadres</label>
              <input type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="email@example.com"
                className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Reden (optioneel)</label>
              <input type="text" value={reden} onChange={e=>setReden(e.target.value)} placeholder="Reden voor ban"
                className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 border-2 border-[#333] rounded-xl font-bold text-gray-400 text-sm hover:border-[#444] transition-colors">Annuleren</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50">
              {loading?'Bezig...':'Bannen'}
            </button>
          </div>
        </form>
      )}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e1e1e]">
          <h2 className="font-semibold text-white text-sm">Gebande e-mails ({banned.length})</h2>
        </div>
        {banned.length===0?(
          <p className="text-center text-gray-500 font-medium py-10">Geen gebande e-mails</p>
        ):(
          <div className="divide-y divide-[#1e1e1e]">
            {banned.map(b=>(
              <div key={b.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{b.email}</p>
                  {b.reden&&<p className="text-xs text-gray-500 mt-0.5">{b.reden}</p>}
                </div>
                {confirmUnban===b.id?(
                  <div className="flex gap-1 shrink-0">
                    <button onClick={()=>unban(b.id)} disabled={actionLoading===b.id} className="text-xs bg-[#2176d4] text-white px-2 py-1 rounded-lg font-bold disabled:opacity-50">{actionLoading===b.id?'...':'Ja'}</button>
                    <button onClick={()=>setConfirmUnban(null)} className="text-xs border border-[#333] text-gray-400 px-2 py-1 rounded-lg font-bold">Nee</button>
                  </div>
                ):(
                  <button onClick={()=>setConfirmUnban(b.id)}
                    className="shrink-0 px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg text-xs font-medium hover:bg-white/5 transition-colors">
                    Ontbannen
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <WaitlistSection slug={session.slug}/>
    </div>
  )
}

/* ─── SettingsView ───────────────────────────────────────── */
function SettingsView({session}:{session:Session}){
  const[daySchedule,setDaySchedule]=useState<Record<string,DayConfig>>(DEFAULT_SCHEDULE)
  const[blockedDates,setBlockedDates]=useState<string[]>([])
  const[currentPw,setCurrentPw]=useState('');const[newPw,setNewPw]=useState('');const[confirmPw,setConfirmPw]=useState('')
  const[msgs,setMsgs]=useState<Record<string,string>>({})
  const[errs,setErrs]=useState<Record<string,string>>({})
  const[saving,setSaving]=useState<Record<string,boolean>>({})

  useEffect(()=>{
    fetch('/api/instellingen').then(r=>r.json()).then(d=>{
      const s=d.instellingen??{}
      if(s.schema){
        const parsed:Record<string,DayConfig>=JSON.parse(s.schema as string)
        for(const day of Object.keys(parsed))parsed[day]={...parsed[day],breaks:parsed[day].breaks??[]}
        setDaySchedule(parsed)
      }
      if(s.geblokkeerde_datums)setBlockedDates(JSON.parse(s.geblokkeerde_datums as string) as string[])
    })
  },[])

  async function save(key:string,value:string,section:string){
    setSaving(s=>({...s,[section]:true}))
    setMsgs(m=>({...m,[section]:''}));setErrs(e=>({...e,[section]:''}))
    await fetch('/api/instellingen',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value})})
    setSaving(s=>({...s,[section]:false}));setMsgs(m=>({...m,[section]:'Opgeslagen'}))
    setTimeout(()=>setMsgs(m=>({...m,[section]:''})),3000)
  }

  async function changePw(e:React.FormEvent){
    e.preventDefault();setErrs(x=>({...x,pw:''}));setMsgs(m=>({...m,pw:''}))
    if(newPw!==confirmPw){setErrs(x=>({...x,pw:'Wachtwoorden komen niet overeen'}));return}
    if(newPw.length<6){setErrs(x=>({...x,pw:'Minimaal 6 tekens'}));return}
    setSaving(s=>({...s,pw:true}))
    const lr=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:session.email,wachtwoord:currentPw})})
    if(!lr.ok){setErrs(x=>({...x,pw:'Huidig wachtwoord onjuist'}));setSaving(s=>({...s,pw:false}));return}
    await fetch('/api/instellingen',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'wachtwoord',value:newPw})})
    setSaving(s=>({...s,pw:false}));setMsgs(m=>({...m,pw:'Wachtwoord gewijzigd'}))
    setCurrentPw('');setNewPw('');setConfirmPw('')
    setTimeout(()=>setMsgs(m=>({...m,pw:''})),3000)
  }

  function updateDay(day:string,patch:Partial<DayConfig>){
    setDaySchedule(s=>({...s,[day]:{...s[day],...patch}}))
  }
  function addBreak(day:string){
    setDaySchedule(s=>({...s,[day]:{...s[day],breaks:[...(s[day].breaks??[]),{start:'12:00',end:'13:00'}]}}))
  }
  function removeBreak(day:string,i:number){
    setDaySchedule(s=>({...s,[day]:{...s[day],breaks:(s[day].breaks??[]).filter((_,j)=>j!==i)}}))
  }
  function updateBreak(day:string,i:number,patch:Partial<BreakSlot>){
    setDaySchedule(s=>({...s,[day]:{...s[day],breaks:(s[day].breaks??[]).map((b,j)=>j===i?{...b,...patch}:b)}}))
  }

  const timeOptions:string[]=[]
  for(let h=6;h<=23;h++)for(let m=0;m<60;m+=30)
    timeOptions.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  const timeOptions15:string[]=[]
  for(let h=6;h<=23;h++)for(let m=0;m<60;m+=15)
    timeOptions15.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)

  const dayOrder=['1','2','3','4','5','6','0']

  return(
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-[family-name:var(--font-bebas)] tracking-widest text-white">Instellingen</h1>

      {/* Beschikbaarheid & Werktijden */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5">
        <h2 className="font-semibold text-white mb-1">Beschikbaarheid &amp; Werktijden</h2>
        <p className="text-xs text-gray-500 mb-4">Zet dagen aan/uit en stel per dag uw begin- en eindtijd in</p>
        <div className="space-y-2 mb-4">
          {dayOrder.map(day=>{
            const cfg=daySchedule[day]
            const dayBreakList=cfg.breaks??[]
            return(
              <div key={day} className={`rounded-xl border-2 transition-colors ${cfg.open?'border-[#2176d4]/20 bg-[#2176d4]/5':'border-[#1e1e1e] bg-[#111]'}`}>
                <div className="flex items-center gap-3 p-3">
                  <Toggle value={cfg.open} onChange={v=>updateDay(day,{open:v})}/>
                  <span className={`font-bold text-sm w-20 shrink-0 ${cfg.open?'text-white':'text-gray-600'}`}>{NL_DAY_LABELS[day]}</span>
                  {cfg.open?(
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <select value={cfg.start} onChange={e=>updateDay(day,{start:e.target.value})}
                        className="bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-[#2176d4] transition-colors">
                        {timeOptions.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-gray-500 font-bold text-sm">→</span>
                      <select value={cfg.end} onChange={e=>updateDay(day,{end:e.target.value})}
                        className="bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-[#2176d4] transition-colors">
                        {[...timeOptions.filter(t=>t>cfg.start),'00:00'].map(t=><option key={t} value={t}>{t==='00:00'?'00:00 (middernacht)':t}</option>)}
                      </select>
                    </div>
                  ):(
                    <span className="text-gray-600 text-sm font-medium italic flex-1">Gesloten</span>
                  )}
                  {cfg.open&&(
                    <button onClick={()=>addBreak(day)}
                      className="shrink-0 px-2.5 py-1 bg-amber-900/20 border border-amber-700/30 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-900/30 transition-colors">
                      + Pauze
                    </button>
                  )}
                </div>
                {cfg.open&&dayBreakList.length>0&&(
                  <div className="px-3 pb-3 space-y-2">
                    {dayBreakList.map((brk,i)=>(
                      <div key={i} className="flex items-center gap-2 ml-7">
                        <span className="text-amber-400/60 text-xs font-bold shrink-0">Pauze</span>
                        <select value={brk.start} onChange={e=>updateBreak(day,i,{start:e.target.value})}
                          className="bg-[#1a1a1a] border-2 border-amber-700/30 text-white rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-amber-500 transition-colors">
                          {timeOptions15.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-gray-500 font-bold text-sm">→</span>
                        <select value={brk.end} onChange={e=>updateBreak(day,i,{end:e.target.value})}
                          className="bg-[#1a1a1a] border-2 border-amber-700/30 text-white rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-amber-500 transition-colors">
                          {timeOptions15.filter(t=>t>brk.start).map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={()=>removeBreak(day,i)}
                          className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors text-lg leading-none">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={()=>save('schema',JSON.stringify(daySchedule),'schedule')} disabled={saving.schedule}
            className="px-5 py-2 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-50 transition-all duration-200">
            {saving.schedule?'Opslaan...':'Opslaan'}
          </button>
          {msgs.schedule&&<span className="text-[#2176d4] text-sm">{msgs.schedule}</span>}
        </div>
      </div>

      {/* Vrije dagen / Vakantie */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5">
        <h2 className="font-semibold text-white mb-1">Vrije dagen / Vakantie</h2>
        <p className="text-xs text-gray-500 mb-4">Klik op meerdere datums om ze te blokkeren — klik opnieuw om te deblokkeren</p>
        <BlockedCalendar blocked={blockedDates} onChange={setBlockedDates}/>
        {blockedDates.length>0&&(
          <div className="mt-4 flex flex-wrap gap-2">
            {blockedDates.map(d=>(
              <span key={d} className="inline-flex items-center gap-1 bg-red-900/20 border border-red-800/40 text-red-400 text-xs px-3 py-1.5 rounded-lg">
                {formatShortDate(d)}
                <button onClick={()=>setBlockedDates(prev=>prev.filter(x=>x!==d))}
                  className="ml-1 text-red-500 hover:text-red-300 font-black leading-none">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <button onClick={()=>save('geblokkeerde_datums',JSON.stringify(blockedDates),'blocked')} disabled={saving.blocked}
            className="px-5 py-2 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-50 transition-all duration-200">
            {saving.blocked?'Opslaan...':'Opslaan'}
          </button>
          {msgs.blocked&&<span className="text-[#2176d4] text-sm">{msgs.blocked}</span>}
        </div>
      </div>

      {/* Exporteren */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5">
        <h2 className="font-semibold text-white mb-1">Exporteren</h2>
        <p className="text-xs text-gray-500 mb-4">Download uw agenda als kalenderbestand</p>
        <div className="flex items-center justify-between py-3 border border-[#2a2a2a] rounded-xl px-4">
          <div>
            <p className="font-bold text-white text-sm">Exporteer alle afspraken</p>
            <p className="text-xs text-[#2176d4] font-medium">Download als .ics kalenderbestand</p>
          </div>
          <a href="/api/portaal/export" download className="bg-[#2176d4] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#3080e0] transition-colors">Downloaden</a>
        </div>
        <div className="mt-3">
          <CalendarSubscribeButton/>
        </div>
      </div>

      {/* Wachtwoord */}
      <div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-5">
        <h2 className="font-semibold text-white mb-4">Wachtwoord wijzigen</h2>
        <form onSubmit={changePw} className="space-y-4">
          {errs.pw&&<div className="bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm font-semibold">{errs.pw}</div>}
          {msgs.pw&&<div className="bg-[#2176d4]/10 border border-[#2176d4]/20 text-[#2176d4] rounded-xl px-4 py-3 text-sm font-semibold">{msgs.pw}</div>}
          {[{label:'Huidig wachtwoord',val:currentPw,set:setCurrentPw},{label:'Nieuw wachtwoord',val:newPw,set:setNewPw},{label:'Bevestig nieuw',val:confirmPw,set:setConfirmPw}].map(f=>(
            <div key={f.label}>
              <label className="block text-sm font-bold text-gray-400 mb-1">{f.label}</label>
              <input type="password" required value={f.val} onChange={e=>f.set(e.target.value)}
                className="w-full bg-[#1a1a1a] border-2 border-[#333] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2176d4] transition-colors"/>
            </div>
          ))}
          <button type="submit" disabled={saving.pw}
            className="px-5 py-2 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] hover:shadow-[0_0_20px_rgba(33,118,212,0.3)] disabled:opacity-50 transition-all duration-200">
            {saving.pw?'Opslaan...':'Wachtwoord wijzigen'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Root ───────────────────────────────────────────────── */
export default function PortaalPage() {
  const[checking,setChecking]=useState(true)
  const[session,setSession]=useState<Session|null>(null)
  const[authError,setAuthError]=useState(false)

  useEffect(()=>{
    const timer=setTimeout(()=>{setChecking(false);setAuthError(true)},8000)
    fetch('/api/auth/me').then(r=>r.json()).then(d=>{
      clearTimeout(timer); setChecking(false); if(d.session)setSession(d.session)
    }).catch(()=>{clearTimeout(timer);setChecking(false)})
    return()=>clearTimeout(timer)
  },[])

  async function logout(){await fetch('/api/auth/logout',{method:'POST'});setSession(null)}

  if(checking)return(<div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0c0c0c]"><div className="w-10 h-10 border-4 border-[#2176d4] border-t-transparent rounded-full animate-spin"/><p className="text-gray-500 text-sm font-medium">Even geduld...</p></div>)
  if(authError)return(<div className="min-h-screen flex items-center justify-center bg-[#0c0c0c] px-4"><div className="bg-[#141414] rounded-xl border border-[#2a2a2a] p-8 max-w-sm w-full text-center"><p className="font-bold text-white mb-2">Verbinding mislukt</p><p className="text-gray-500 text-sm mb-4">De server reageert niet.</p><button onClick={()=>window.location.reload()} className="w-full py-2.5 bg-[#2176d4] text-white rounded-xl font-bold text-sm hover:bg-[#3080e0] transition-colors">Opnieuw proberen</button></div></div>)
  if(!session)return<LoginScreen onLogin={()=>{ fetch('/api/auth/me').then(r=>r.json()).then(d=>{if(d.session)setSession(d.session)}) }}/>
  return<PortalShell session={session} onLogout={logout}/>
}
