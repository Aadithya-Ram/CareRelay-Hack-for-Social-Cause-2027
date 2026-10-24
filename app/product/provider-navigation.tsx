'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {CalendarDays,Building2,CarFront,MessageCircle,History,UserRound,FileText} from 'lucide-react';
import {District,threadUnread} from '@/lib/domain';
export default function ProviderNavigation({role}:{role:'facility'|'transport'}){
 const path=usePathname(),section=path.split('/')[2]??'',[unread,setUnread]=useState(0),[work,setWork]=useState(0);
 useEffect(()=>{const load=async()=>{const r=await fetch('/api/district',{cache:'no-store'});if(!r.ok)return;const body=await r.json() as {data:District};setUnread((body.data.supportThreads??[]).filter(t=>threadUnread(t,role)).length);setWork(body.data.assignments.filter(a=>!['completed','cancelled','rejected','expired'].includes(a.stage)).length);};const changed=()=>void load().catch(()=>{});void load().catch(()=>{});window.addEventListener('carerelay:inbox-changed',changed);const timer=setInterval(()=>{if(!document.hidden)void load().catch(()=>{});},15000);return()=>{clearInterval(timer);window.removeEventListener('carerelay:inbox-changed',changed);};},[role]);
 const nav=role==='facility'?[['','Treatment requests',CalendarDays],['machines','Machines & slots',Building2],['readiness','Readiness',Building2],['inbox','Inbox',MessageCircle],['history','History',History],['profile','Profile',UserRound],['documents','Documents',FileText]] as const:[['','Your trips',CarFront],['availability','Availability',CalendarDays],['inbox','Inbox',MessageCircle],['history','History',History],['profile','Profile',UserRound],['documents','Documents',FileText]] as const;
 return <nav className="provider-navigation" aria-label="Provider pages">{nav.map(([id,label,Icon])=><a className={section===id?'selected':''} key={id} aria-current={section===id?'page':undefined} href={'/dashboard'+(id?'/'+id:'')}><Icon size={17}/>{label}{id==='inbox'&&unread>0?` (${unread})`:id===''&&work>0?` (${work})`:''}</a>)}</nav>;
}
