import {resourceOverlap,serviceInstant} from './service-time';
import {requirementsReady,automaticRequestProblem} from './request-validation';
import { Assignment, Barrier, District, Facility, Patient, Slot, Vehicle, committedStages, fresh, liveStages, routeKey, travel, estimatedTravel, distance, underwayStages, activeRequest, appointmentDate, appointmentZone, allocationSlot, serviceClock, canonicalZone, requestTimeProblem } from "./domain";

export interface Option {accessMinutes?:number;start?:number;date?:string;timeZone?:string;requestKind?:"treatment"|"transport"|"both";patient: string; slot: string; vehicle: string; pickup: number; arrival: number; tripStart: number; tripEnd: number; duration: number; fare: number}
export function facilityReasons(d: District, p: Patient, f: Facility, s: Slot, allowStale=false): string[] {
  const r: string[]=[];
  if(f.demo&&(!p.episode||p.demoEpisode!==p.episode))r.push("Demo hospitals require explicit demo setup for this appointment");
  if(!f.demo&&p.episode&&p.demoEpisode===p.episode)r.push("This demo appointment uses simulated hospitals only");
  if(!activeRequest(p))r.push("No approved membership with an active appointment request");
  if(p.requiresLocation&&!p.requestDate)r.push("Ask the patient to submit an appointment date");
  if((s.date??d.date)!==appointmentDate(d,p)||canonicalZone(s.timeZone??'Asia/Kolkata')!==appointmentZone(p))r.push("Slot date or timezone does not match the request");
  if(s.start-d.checkin<serviceClock(d,appointmentDate(d,p),appointmentZone(p)))r.push("Slot check-in time has already passed");
  if ((p.requiresLocation&&!p.location)||(f.requiresLocation&&!f.location)) r.push("Add a map pin for the pickup and facility to estimate travel");
  if (!requirementsReady(p)) r.push("Request checks or flagged clinical review are missing");
  if (!p.consent) r.push("Patient agreement is missing");
  if (!f.open || !f.utilities) r.push("Facility is closed or essential utilities are unavailable");
  if (!s.active || !s.staffed || f.staffCapacity===0) r.push("Slot lacks a working machine or confirmed staffing");
  if (!allowStale && !fresh(d,f)) r.push("Facility capacity report requires verification");
  if (!f.capabilities.includes(p.capability)) r.push("Staff-specified treatment capability is unavailable");
  if ((p.wheelchair || p.occupiedWheelchair || p.transportNeed==="wheelchair") && (f.entrance!==true || f.treatmentRoute!==true || !f.lift)) r.push("Accessible entrance and operational route to treatment are not confirmed");
  if (s.start < p.earliest || s.start+p.duration > p.deadline || s.start+p.duration+d.turnaround > s.end) r.push("Treatment and turnaround do not fit the supplied slot and completion deadline");
  if (d.blockedRoutes.includes(routeKey(p.zone,f.id))) r.push("Pickup-to-facility route is blocked or unverified");
  if (d.rejectedPairs.includes(`${p.id}:${s.id}`)) r.push("Facility rejected this patient for this slot");
  return r;
}
export function vehicleReasons(p: Patient, v: Vehicle): string[] {
  const r: string[]=[];
  if(v.demo&&(!p.episode||p.demoEpisode!==p.episode))r.push("Demo transport requires explicit demo setup for this appointment");
  if(!v.demo&&p.episode&&p.demoEpisode===p.episode)r.push("This demo appointment uses simulated transport only");
  if(v.requiresLocation&&!v.location) r.push("Vehicle base needs a map pin");
  if (!v.active || !v.confirmed) r.push("Vehicle availability is not confirmed");
  if ((p.occupiedWheelchair || p.transportNeed==="wheelchair") && !(v.wheelchairSpace ?? v.type==="wheelchair")) r.push("An occupied-wheelchair vehicle is required");
  if (p.transportNeed==="medical" && v.type!=="medical") r.push("Staff-specified medical transport is required");
  if (p.assistance && !v.assistance) r.push("Boarding assistance is not confirmed");
  if (v.seats < (p.caregiver?2:1)) r.push("There is no seat for the accompanying caregiver");
  if (v.cost > p.budget || !v.payer.trim()) r.push("Fare exceeds the approved budget or payment is unconfirmed");
  return r;
}
export function makeOption(d: District,p: Patient,f: Facility,s: Slot,v: Vehicle): Option | null {
  const boarding=p.assistance?15:8;
  const drive=estimatedTravel(p,f), deadhead=estimatedTravel(v,p);
  const arrival=s.start-d.checkin;
  const pickup=arrival-d.delay-drive-boarding;
  const tripStart=pickup-deadhead;
  // Return to the declared vehicle base is included, so successive trips have a known origin.
  const tripEnd=arrival+estimatedTravel(f,v);
  if(tripStart < Math.max(serviceClock(d,appointmentDate(d,p),appointmentZone(p)),v.available) || tripEnd>v.until)return null;
  return {patient:p.id,slot:s.id,vehicle:v.id,pickup,arrival,tripStart,tripEnd,duration:p.duration,fare:v.cost,accessMinutes:deadhead,start:s.start,date:appointmentDate(d,p),timeZone:appointmentZone(p),requestKind:p.requestKind??'both'};
}
export function enumerate(d: District,p: Patient,allowStale=false): Option[] {
  const options: Option[]=[];
  if(!activeRequest(p)||p.requiresLocation&&!p.requestDate)return options;
  if(p.requestKind==='transport'){
    if(!requirementsReady(p)||!p.consent||!p.location||!p.destination)return options;
    const target={zone:p.zone,location:p.destination},at=p.preferredTime??p.earliest;
    for(const v of d.vehicles){if(vehicleReasons(p,v).length||(v.date??d.date)!==appointmentDate(d,p)||canonicalZone(v.timeZone??'Asia/Kolkata')!==appointmentZone(p))continue;
      const pickup=at,tripStart=pickup-estimatedTravel(v,p),arrival=pickup+estimatedTravel(p,target)+(p.assistance?15:8),tripEnd=arrival+estimatedTravel(target,v);
      if(tripStart<Math.max(serviceClock(d,appointmentDate(d,p),appointmentZone(p)),v.available)||tripEnd>v.until||arrival>p.deadline)continue;
      options.push({patient:p.id,slot:`transport:${p.id}`,vehicle:v.id,pickup,arrival,tripStart,tripEnd,duration:0,fare:v.cost,accessMinutes:estimatedTravel(v,p),date:appointmentDate(d,p),timeZone:appointmentZone(p),requestKind:'transport'});
    }
    return options.sort((a,b)=>estimatedTravel(d.vehicles.find(v=>v.id===a.vehicle)!,p)-estimatedTravel(d.vehicles.find(v=>v.id===b.vehicle)!,p)||a.fare-b.fare||a.vehicle.localeCompare(b.vehicle));
  }
  for(const reported of d.slots){
    const latest=Math.min(p.deadline-p.duration,reported.end-p.duration-d.turnaround);
    const start=p.preferredTime==null?reported.start:Math.max(reported.start,p.earliest,Math.min(p.preferredTime,latest));
    const starts=new Set([start]);
    if(p.requestDate&&p.preferredTime!=null){const first=Math.max(reported.start,p.earliest);starts.add(first);starts.add(latest);for(let t=Math.ceil(first/15)*15;t<=latest;t+=15)starts.add(t);}
    for(const candidateStart of starts){
    const s={...reported,start:candidateStart};
    const f=d.facilities.find(f=>f.id===s.facility)!;
    if(facilityReasons(d,p,f,s,allowStale).length)continue;
    if(p.requestKind==='treatment'){options.push({patient:p.id,slot:s.id,vehicle:'',pickup:s.start-d.checkin,arrival:s.start-d.checkin,tripStart:s.start,tripEnd:s.start+p.duration,duration:p.duration,fare:0,start:s.start,date:appointmentDate(d,p),timeZone:appointmentZone(p),requestKind:'treatment'});continue;}
    for(const v of d.vehicles){
      if((v.date??d.date)!==appointmentDate(d,p)||canonicalZone(v.timeZone??'Asia/Kolkata')!==appointmentZone(p))continue;
      if(vehicleReasons(p,v).length)continue;
      const o=makeOption(d,p,f,s,v);if(o)options.push(o);
    }
  }
  }
  const km=(o:Option)=>{const f=d.facilities.find(f=>f.id===d.slots.find(s=>s.id===o.slot)?.facility);return p.location&&f?.location?distance(p.location,f.location):0;};
  const deviation=(o:Option)=>p.preferredTime==null?0:Math.abs((o.start??d.slots.find(s=>s.id===o.slot)!.start)-p.preferredTime);
  return options.sort((a,b)=>deviation(a)-deviation(b)||km(a)-km(b)||(a.accessMinutes??0)-(b.accessMinutes??0)||a.fare-b.fare || a.tripEnd-a.tripStart-(b.tripEnd-b.tripStart) || a.slot.localeCompare(b.slot));
}
function interval(d:District,o:Option,start:number,end:number){return {date:o.date??d.date,zone:canonicalZone(o.timeZone??'Asia/Kolkata'),start,end};}
export function conflicts(d: District,a: Option,b: Option): boolean {
 if(a.patient===b.patient)return true;
 const sa=allocationSlot(d,a),sb=allocationSlot(d,b);
 if(a.requestKind!=='transport'&&b.requestKind!=='transport'&&sa&&sb&&sa.facility===sb.facility&&sa.machine===sb.machine&&resourceOverlap(interval(d,a,sa.start,sa.start+a.duration+d.turnaround),interval(d,b,sb.start,sb.start+b.duration+d.turnaround)))return true;
 return !!a.vehicle&&a.vehicle===b.vehicle&&resourceOverlap(interval(d,a,a.tripStart,a.tripEnd),interval(d,b,b.tripStart,b.tripEnd));
}
export function fits(d:District,o:Option,chosen:Option[]):boolean{
 if(chosen.some(x=>conflicts(d,o,x)))return false;
 if(o.requestKind==='transport')return true;
 const slot=allocationSlot(d,o),facility=d.facilities.find(f=>f.id===slot?.facility);if(!slot||!facility)return false;
 const same=chosen.filter(x=>x.requestKind!=='transport'&&allocationSlot(d,x)?.facility===slot.facility);
 const intervals=[...same,o].map(x=>{const s=allocationSlot(d,x)!;return {start:serviceInstant(x.date??d.date,x.timeZone??'Asia/Kolkata',s.start),end:serviceInstant(x.date??d.date,x.timeZone??'Asia/Kolkata',s.start+x.duration)};});
 if(intervals.some(i=>i.start==null||i.end==null||i.end<=i.start))return false;
 return intervals.every(i=>intervals.filter(j=>j.start!<=i.start!&&j.end!>i.start!).length<=facility.staffCapacity);
}
export function validCommitment(d:District,a:Assignment):boolean{
 const p=d.patients.find(p=>p.id===a.patient);if(!p||!activeRequest(p))return false;
 const copy={...d,now:0,currentTimeMs:undefined,date:a.date??d.date};
 const option=enumerate(copy,{...p,preferredTime:a.start??p.preferredTime},true).find(o=>o.slot===a.slot&&o.vehicle===a.vehicle);
 return !!option&&a.duration===option.duration&&a.fare===option.fare&&a.tripStart===option.tripStart&&a.tripEnd===option.tripEnd&&a.pickup===option.pickup&&a.arrival===option.arrival&&(a.start??allocationSlot(d,a)?.start)===(option.start??allocationSlot(d,option)?.start)&&(a.date??d.date)===(option.date??d.date);
}
function explain(d: District,p: Patient,options: Option[],chosen: Option[]): Barrier {
  const timing=requestTimeProblem(d,p);if(timing)return {patient:p.id,code:'request_time',reason:timing,action:'Open the request and confirm a new appointment date and time with the patient.',candidates:[]};
  if(p.requiresLocation&&!p.requestDate)return {patient:p.id,code:'request_date',reason:'This older request has no appointment date.',action:'Ask the patient to submit a dated request before matching.',candidates:[]};
  if(p.requestKind==='transport')return {patient:p.id,code:'transport',reason:!requirementsReady(p)?'Transport request checks or flagged staff review are required.':!p.destination?'A confirmed destination is required.':'No suitable dated vehicle can make the trip within the arrival deadline and budget.',action:'Verify the destination, request and dated driver availability.',candidates:[]};
  const candidates=d.slots.filter(s=>!facilityReasons(d,p,d.facilities.find(f=>f.id===s.facility)!,s,true).length).map(s=>s.facility);
  if(!requirementsReady(p))return {patient:p.id,code:"clinical_verification",reason:automaticRequestProblem(d,p)??'Request checks are incomplete.',action:"Use Suggest or Choose manually for automatic request checks. Flagged clinical requirements need staff review.",candidates:[]};
  if(!p.consent)return {patient:p.id,code:"patient_agreement",reason:"The patient has not agreed to the proposed transfer.",action:"Confirm patient or caregiver agreement before arranging a transfer.",candidates:[]};
  if(p.requiresLocation&&!p.location)return {patient:p.id,code:"location",reason:"The pickup needs a map pin to estimate a real journey.",action:"Ask the patient to save their live location or a manual map pin.",candidates:[]};
  const potential=enumerate(d,p,true);
  if(potential.length && !options.some(o=>fits(d,o,chosen)) && potential.some(o=>!fresh(d,d.facilities.find(f=>f.id===d.slots.find(s=>s.id===o.slot)!.facility)!) && fits(d,o,chosen)))
    return {patient:p.id,code:"verification",reason:"Potentially suitable capacity has an outdated or unverified report.",action:"Reconfirm the named facility's capacity and accessibility; then replan.",candidates:[...new Set(potential.filter(o=>!fresh(d,d.facilities.find(f=>f.id===d.slots.find(s=>s.id===o.slot)!.facility)!)&&fits(d,o,chosen)).map(o=>d.slots.find(s=>s.id===o.slot)!.facility))]};
  if(!candidates.length){
    const accessibility=p.wheelchair && !d.facilities.some(f=>f.open&&f.utilities&&f.entrance===true&&f.treatmentRoute===true&&f.lift);
    return {patient:p.id,code:accessibility?"accessibility":"slot",reason:accessibility?"No open facility has a confirmed accessible route to treatment.":"No suitable staffed slot meets the capability, accessibility, route and treatment completion constraints.",action:accessibility?"Verify an accessible treatment route at an operational facility.":"Ask a facility to confirm an appropriate staffed slot or verify a usable route.",candidates:[]};
  }
  if(!options.length)return {patient:p.id,code:"transport",reason:"No confirmed suitable vehicle can reach a compatible verified slot within time and budget constraints.",action:`Confirm ${p.transportNeed==="wheelchair"?"occupied-wheelchair":p.transportNeed==="medical"?"medical":"suitable"} transport, assistance and payment, then replan.`,candidates:[...new Set(candidates)]};
  return {patient:p.id,code:"capacity",reason:options.every(o=>!fits(d,o,chosen))?"Compatible options exist, but their slot, staffing or vehicle intervals conflict with other assignments.":"A compatible option remains outside the best plan found within the search limit.",action:"Test additional transport or a facility-confirmed staffed slot. A counterfactual is not a resource commitment.",candidates:[...new Set(candidates)]};
}
export function violations(d: District,assignments: Assignment[]): string[] {
  const errors: string[]=[]; const chosen: Assignment[]=[];
  for(const a of assignments.filter(a=>liveStages.includes(a.stage))) {
    if(a.stage==="completed")continue;
    if(a.escalation && underwayStages.includes(a.stage)){chosen.push(a);continue;}
    if(!validCommitment(d,a))errors.push(`${a.patient}: incompatible resource`);
    const f=d.facilities.find(f=>f.id===d.slots.find(s=>s.id===a.slot)?.facility);
    if(a.stage==="proposed" && f && !fresh(d,f))errors.push(`${a.patient}: unverified capacity`);
    if(!fits(d,a,chosen))errors.push(`${a.patient}: double allocation or staffing conflict`);
    chosen.push(a);
  }
  return errors;
}
export function solve(d: District, preserve=true, maxNodes=40000): {assignments: Assignment[]; barriers: Barrier[]; metrics: NonNullable<District["metrics"]>} {
  const started=performance.now();
  const fixed: Assignment[]=[], archive=d.assignments.filter(a=>!liveStages.includes(a.stage));
  const oldLive=d.assignments.filter(a=>liveStages.includes(a.stage));
  for(const a of oldLive){
    if(a.stage==="completed"){if(d.patients.find(p=>p.id===a.patient)?.episode===a.episode)fixed.push(a);else archive.push(a);}
    else if(underwayStages.includes(a.stage))fixed.push(validCommitment(d,a)&&fits(d,a,fixed)?a:{...a,escalation:"Resources changed after departure. Coordinator must intervene; destination is frozen."});
    else if(preserve && (committedStages.includes(a.stage) || a.stage==="proposed" && !!a.adminApprovedAt && (a.expiresAt?a.expiresAt>Date.now():a.expires>d.now) && a.tripStart>=serviceClock(d,a.date,a.timeZone) && enumerate(d,d.patients.find(p=>p.id===a.patient)!).some(o=>o.slot===a.slot&&o.vehicle===a.vehicle&&(o.start??allocationSlot(d,o)?.start)===(a.start??allocationSlot(d,a)?.start))) && validCommitment(d,a) && fits(d,a,fixed))fixed.push(a);
    else if(committedStages.includes(a.stage) || a.stage==="proposed" && !!a.adminApprovedAt)archive.push({...a,stage:"cancelled",history:[...a.history,{stage:"cancelled",at:d.now,recordedAt:Date.now(),actor:"Replanner"}]});
  }
  const patients=d.patients.filter(p=>activeRequest(p)&&!fixed.some(a=>a.patient===p.id));
  const allOptions=new Map(patients.map(p=>[p.id,enumerate(d,p)]));
  const order=[...patients].sort((a,b)=>b.urgency-a.urgency || a.deadline-b.deadline || allOptions.get(a.id)!.length-allOptions.get(b.id)!.length || a.id.localeCompare(b.id));
  let greedy: Option[]=[...fixed];
  for(const p of order){const o=allOptions.get(p.id)!.find(o=>fits(d,o,greedy));if(o)greedy.push(o);}
  const incumbent: Option[]=[...fixed];
  for(const p of order){const old=oldLive.find(a=>a.patient===p.id&&a.stage==="proposed");const option=old&&allOptions.get(p.id)!.find(o=>o.slot===old.slot&&o.vehicle===old.vehicle);if(option&&fits(d,option,incumbent))incumbent.push(option);}
  for(const p of order){if(incumbent.some(o=>o.patient===p.id))continue;const o=allOptions.get(p.id)!.find(o=>fits(d,o,incumbent));if(o)incumbent.push(o);}
  // Coverage first; among equally sized plans protect urgent, then time-sensitive requests.
  // Distance, fare and occupied vehicle time are separate tie-breakers, never mixed units.
  const score=(plan: Option[])=>[plan.length,
    plan.filter(o=>d.patients.find(p=>p.id===o.patient)!.urgency===3).length,
    plan.filter(o=>d.patients.find(p=>p.id===o.patient)!.urgency===2).length,
    -plan.reduce((n,o)=>{const p=d.patients.find(p=>p.id===o.patient)!;return n+(p.preferredTime==null||p.requestKind==='transport'?0:Math.abs((allocationSlot(d,o)?.start??p.preferredTime)-p.preferredTime));},0),
    -plan.reduce((n,o)=>{const p=d.patients.find(p=>p.id===o.patient)!,f=p.requestKind==='transport'?d.vehicles.find(v=>v.id===o.vehicle):d.facilities.find(f=>f.id===allocationSlot(d,o)?.facility);return n+(p.location&&f?.location?distance(p.location,f.location):f?travel(p.zone,f.zone):0);},0),
    -plan.reduce((n,o)=>n+(o.accessMinutes??0),0),
    -plan.reduce((n,o)=>n+o.fare,0),-plan.reduce((n,o)=>n+o.tripEnd-o.tripStart,0)];
  const better=(a:number[],b:number[])=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;};
  let best=better(score(incumbent),score(greedy))?[...incumbent]:[...greedy],nodes=0,limited=false,bestScore=score(best);
  const searchOrder=[...patients].sort((a,b)=>allOptions.get(a.id)!.length-allOptions.get(b.id)!.length || b.urgency-a.urgency || a.id.localeCompare(b.id));
  function search(i: number,chosen: Option[]) {
    nodes++;
    if(nodes>maxNodes || performance.now()-started>180){limited=true;return;}
    if(chosen.length+(searchOrder.length-i)<best.length)return;
    if(i===searchOrder.length){
      const candidate=score(chosen);
      if(better(candidate,bestScore)){best=[...chosen];bestScore=candidate;}
      return;
    }
    const p=searchOrder[i];
    for(const o of allOptions.get(p.id)!){if(fits(d,o,chosen)){chosen.push(o);search(i+1,chosen);chosen.pop();}if(limited)return;}
    search(i+1,chosen);
  }
  search(0,[...fixed]);
  const freshAssignments: Assignment[]=best.filter(o=>!fixed.some(a=>a.patient===o.patient)).map(o=>{
    const existing=oldLive.find(a=>a.stage==="proposed" && !a.adminApprovedAt && a.patient===o.patient && a.slot===o.slot && a.vehicle===o.vehicle&&(a.start??allocationSlot(d,a)?.start)===(o.start??allocationSlot(d,o)?.start));
    return existing??{...o,episode:d.patients.find(p=>p.id===o.patient)?.episode,id:crypto.randomUUID(),stage:"proposed",patientAgreed:d.patients.find(p=>p.id===o.patient)!.consent,expires:Math.min(d.now+60,o.tripStart),expiresAt:d.patients.find(p=>p.id===o.patient)?.requestDate?Date.now()+3600000:undefined,history:[{stage:"proposed",at:d.now,recordedAt:Date.now(),actor:"CareRelay planner"}]};
  });
  const assignments=[...archive,...fixed,...freshAssignments];
  const barriers=patients.filter(p=>!best.some(a=>a.patient===p.id)).map(p=>explain(d,p,allOptions.get(p.id)!,best));
  // Baselines receive identical compatibility, time, staffing and transport constraints.
  const nearest: Option[]=[...fixed];
  for(const p of order){
    const options=allOptions.get(p.id)!;
    const o=options.find(o=>fits(d,o,nearest));if(o)nearest.push(o);
  }
  // Naive nearest centre ignores shared-resource conflicts, but never counts them as feasible.
  const naive=order.map(p=>allOptions.get(p.id)![0]).filter((o):o is Option=>!!o);
  let naiveViolations=0;const seen: Option[]=[];
  for(const o of naive){if(!fits(d,o,seen))naiveViolations++;seen.push(o);}
  const live=assignments.filter(a=>liveStages.includes(a.stage));
  return {assignments,barriers,metrics:{feasible:live.filter(a=>!a.escalation).length,accepted:live.filter(a=>committedStages.includes(a.stage)).length,transportConfirmed:live.filter(a=>["transport_confirmed",...underwayStages].includes(a.stage)).length,completed:live.filter(a=>a.stage==="completed"&&a.requestKind!=='transport').length,unresolved:barriers.length,violations:violations(d,assignments).length,runtimeMs:Math.round((performance.now()-started)*10)/10,status:limited?"Feasible plan · search limit reached":"Optimal for this discrete model",baseline:nearest.length,nearestViolations:naiveViolations,changedCommitments:oldLive.filter(a=>committedStages.includes(a.stage)&&!fixed.some(x=>x.id===a.id)).length}};
}
export function replan(d: District): void {const result=solve(d);Object.assign(d,result);}
export function intervention(d: District,kind: string) {
  const before=solve(structuredClone(d)); const copy=structuredClone(d);
  if(kind==="vehicle")copy.vehicles.push({id:"WHATIF-V",name:"Hypothetical accessible vehicle",provider:"Scenario only",type:"wheelchair",seats:3,wheelchairSpace:true,assistance:true,available:d.now,until:1140,active:true,confirmed:true,zone:3,cost:850,payer:"Hypothetical approved fund"});
  else if(kind==="slot"){
    const f=copy.facilities.find(f=>f.open&&f.utilities&&fresh(copy,f));
    if(f){f.staffCapacity++;copy.slots.push({id:"WHATIF-S",facility:f.id,machine:"Additional staffed machine",start:870,end:1110,staffed:true,active:true});}
  }else if(kind==="verify")copy.facilities.filter(f=>f.open).forEach(f=>{f.verifiedAt=copy.now;f.reportedAt=copy.currentTimeMs??Date.now();f.provenance="Hypothetical verification";});
  else throw new Error("Unknown intervention");
  copy.assignments=before.assignments;
  const after=solve(copy);
  return {kind,before:before.metrics.feasible,after:after.metrics.feasible,delta:after.metrics.feasible-before.metrics.feasible,patients:after.assignments.filter(a=>liveStages.includes(a.stage)&&!before.assignments.some(b=>liveStages.includes(b.stage)&&a.patient===b.patient)).map(a=>a.patient),status:after.metrics.status,disclaimer:"Simulated upper-bound resource assumption. A provider or facility must confirm the actual resource before it can be used."};
}

