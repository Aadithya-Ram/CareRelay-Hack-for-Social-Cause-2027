import {District,Patient,Assignment,Role} from './domain';

type Viewer={role:Role;entity:string};
const activeStages=['proposed','accepted','transport_confirmed','departed','arrived','treatment_started'];
const owns=(d:District,a:Assignment,v:Viewer)=>v.role==='facility'?d.slots.find(s=>s.id===a.slot)?.facility===v.entity:a.vehicle===v.entity;
const publicPatient=(p:Patient):Patient=>{const {operationalCheck:_,...visible}=p;return visible;};
// An explicit allowlist prevents new internal/clinical fields leaking to drivers.
export function transportPatient(p:Patient):Patient{
 return {id:p.id,name:p.name,home:'not_shared',zone:p.zone,location:p.location,address:p.address,houseNumber:p.houseNumber,city:p.city,country:p.country,phone:p.phone,episode:p.episode,requestActive:p.requestActive,requestKind:p.requestKind,requestDate:p.requestDate,timeZone:p.timeZone,preferredTime:p.preferredTime,destination:p.destination,destinationAddress:p.destinationAddress,destinationName:p.destinationName,wheelchair:p.wheelchair,occupiedWheelchair:p.occupiedWheelchair,transportNeed:p.transportNeed,assistance:p.assistance,caregiver:p.caregiver,consent:p.consent,memberApproved:p.memberApproved,demo:p.demo,duration:0,earliest:0,deadline:0,urgency:1,capability:'not_shared',budget:0,verified:false};
}
export function scopedDistrict(d:District,v:Viewer):District{
 if(v.role==='coordinator')return {...d,patients:d.patients.map(publicPatient),supportThreads:(d.supportThreads??[]).filter(t=>!t.partner)};
 const assignments=d.assignments.filter(a=>a.stage!=='proposed'||!!a.adminApprovedAt).filter(a=>v.role==='patient'?a.patient===v.entity:owns(d,a,v));
 const patients=d.patients.filter(p=>v.role==='patient'?p.id===v.entity:assignments.some(a=>a.patient===p.id&&a.episode===p.episode&&!!a.adminApprovedAt&&activeStages.includes(a.stage))).map(p=>v.role==='transport'?transportPatient(p):publicPatient(p));
 return {...d,patients,assignments: v.role==='transport'?assignments.map(a=>({...a,completion:a.completion?{...a.completion,reason:''}:undefined,duration:0,history:a.history.filter(h=>['accepted','transport_confirmed','departed','arrived','completed'].includes(h.stage))})):assignments,
  supportThreads:(d.supportThreads??[]).filter(t=>v.role==='patient'?t.patient===v.entity:t.partner?.role===v.role&&t.partner.entity===v.entity),
  facilities:d.facilities.filter(f=>v.role==='facility'?f.id===v.entity:assignments.some(a=>d.slots.find(s=>s.id===a.slot)?.facility===f.id)),
  vehicles:d.vehicles.filter(x=>v.role==='transport'?x.id===v.entity:assignments.some(a=>a.vehicle===x.id)),
  slots:d.slots.filter(s=>v.role==='facility'?s.facility===v.entity:assignments.some(a=>a.slot===s.id)),
  barriers:d.barriers.filter(b=>v.role==='patient'&&b.patient===v.entity),audit:[],messages:d.messages.filter(m=>v.role==='facility'&&m.facility===v.entity),incidents:[],blockedRoutes:[],rejectedPairs:[],metrics:null};
}
