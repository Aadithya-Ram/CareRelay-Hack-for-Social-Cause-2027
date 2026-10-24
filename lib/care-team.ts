import {checkRequest,underwayArrangement} from './request-validation';
import {z} from 'zod';
import {District,Assignment,committedStages,activeRequest,requestTimeProblem,serviceClock,appointmentZone} from './domain';
import {command,DomainError,Actor,serviceDate} from './commands';
import {solve,enumerate,fits} from './solver';
import {loadDemoProviders} from './demo-providers';
export function careAction(d:District,input:unknown,actor:Actor){const b=z.object({action:z.enum(['prepare_demo','reschedule_request','load_demo_providers','suggest','approve_plan','verify','command','archive_patient','restore_patient','options','suggest_patient']),payload:z.record(z.string(),z.unknown()).default({})}).parse(input),p=b.payload;
 if(actor.role!=='coordinator')throw new DomainError('Admin access required.',403);
 if(b.action==='reschedule_request'){
  const fields=z.object({id:z.string(),date:serviceDate,preferredTime:z.number().int().min(0).max(1439),earliest:z.number().int().min(0).max(1439),deadline:z.number().int().min(0).max(1439),patientAgreed:z.literal(true)}).parse(p);
  const patient=d.patients.find(x=>x.id===fields.id);
  if(!patient||!activeRequest(patient)||!patient.requestActive)throw new DomainError('Choose an approved patient with an active request.',409);
  const previous=d.assignments.filter(a=>a.patient===patient.id&&(a.episode===patient.episode||!a.episode));
  if(previous.some(a=>['departed','arrived','treatment_started','completed'].includes(a.stage)))throw new DomainError('An underway or completed arrangement cannot be rescheduled. Submit a new patient request.',409);
  if(fields.earliest>fields.preferredTime||fields.preferredTime>=fields.deadline||patient.requestKind!=='transport'&&fields.earliest+patient.duration>fields.deadline)throw new DomainError('The preferred time and treatment duration must fit the requested window.');
  const clock=serviceClock(d,fields.date,appointmentZone(patient));
  if(clock>=1440||fields.preferredTime<clock||fields.deadline<=clock)throw new DomainError('Choose a future date and time in the request timezone.');
  const oldDate=patient.requestDate;
  for(const a of previous.filter(a=>['proposed','accepted','transport_confirmed'].includes(a.stage))){a.stage='cancelled';a.history.push({stage:'cancelled',at:d.now,recordedAt:Date.now(),actor:actor.label});}
  Object.assign(patient,{requestDate:fields.date,preferredTime:fields.preferredTime,earliest:fields.earliest,deadline:fields.deadline,episode:crypto.randomUUID(),demoEpisode:undefined,verified:false});
  d.audit.unshift({id:crypto.randomUUID(),at:d.now,recordedAt:Date.now(),actor:actor.label,text:`${patient.id}: patient-agreed request rescheduled from ${oldDate??'undated'} to ${fields.date}; renewed review and provider confirmations required.`});
  return {data:d};
 }
 if(b.action==='prepare_demo'){
  const ids=z.array(z.string()).min(1).max(60).parse(p.ids);
  // Preparation is an explicit simulation, never a claim of clinical review.
  for(const id of new Set(ids)){
   const patient=d.patients.find(x=>x.id===id);
   if(!patient?.consent)throw new DomainError('Patient agreement is required before a demo arrangement.',409);
   const existing=d.assignments.some(a=>a.patient===id&&['accepted','transport_confirmed','departed','arrived','treatment_started'].includes(a.stage));
   if(existing)throw new DomainError('This patient already has an active arrangement.',409);
   loadDemoProviders(d,id,actor);
   patient!.verified=true;
   d.audit.unshift({id:crypto.randomUUID(),at:d.now,recordedAt:Date.now(),actor:actor.label,text:`${id}: simulated requirements review for demo matching only; no clinical verification or real booking performed.`});
  }
  return {data:d};
 }
 if(b.action==='load_demo_providers')return {data:loadDemoProviders(d,z.string().parse(p.id),actor)};
 if(['archive_patient','restore_patient'].includes(b.action)){if(actor.role!=='coordinator')throw new DomainError('Admin access required.',403);const patient=d.patients.find(x=>x.id===p.id);if(!patient)throw new DomainError('Patient not found.',404);if(d.assignments.some(a=>a.patient===patient.id&&['departed','arrived','treatment_started'].includes(a.stage)))throw new DomainError('Resolve the underway journey before removing this patient.',409);patient.archived=b.action==='archive_patient';patient.verified=false;patient.consent=false;for(const a of d.assignments.filter(a=>a.patient===patient.id&&['proposed','accepted','transport_confirmed'].includes(a.stage))){a.stage='cancelled';a.history.push({stage:'cancelled',at:d.now,recordedAt:Date.now(),actor:actor.label});}d.audit.unshift({id:crypto.randomUUID(),at:d.now,recordedAt:Date.now(),actor:actor.label,text:`${patient.id}: patient ${patient.archived?'removed from active list':'restored for a new review'}`});Object.assign(d,solve(d));return {data:d};}
 if(b.action==='options'||b.action==='suggest_patient'){const patient=d.patients.find(x=>x.id===p.id);if(!patient)throw new DomainError('Patient not found.',404);const timing=requestTimeProblem(d,patient);if(timing)throw new DomainError(timing,409);if(!activeRequest(patient)||!patient.requestActive)throw new DomainError('An approved membership and active request are required.',409);if(underwayArrangement(d,patient))throw new DomainError('This patient has a journey in progress. Complete that journey before assigning another.',409);const issue=checkRequest(d,patient);if(issue)throw new DomainError(issue,409);if(!patient.consent)throw new DomainError('Patient agreement is required before matching.',409);const fixed=d.assignments.filter(a=>(a.stage!=='completed'||a.episode===d.patients.find(p=>p.id===a.patient)?.episode)&&(committedStages.includes(a.stage)||a.stage==='proposed'&&!!a.adminApprovedAt));const options=enumerate(d,patient).filter(o=>fits(d,o,fixed));return {data:d,options: b.action==='suggest_patient'?options.slice(0,1):options};}
 if(b.action==='suggest'){const checked=structuredClone(d);for(const patient of checked.patients)if(activeRequest(patient)&&patient.requestActive&&!underwayArrangement(checked,patient))checkRequest(checked,patient);return {data:d,preview:solve(checked)};}
 if(b.action==='verify'){const id=z.string().parse(p.id),patient=d.patients.find(x=>x.id===id);if(!patient||patient.archived)throw new DomainError('Restore this patient before review.',409);if(!activeRequest(patient)||!patient.requestActive)throw new DomainError('An approved membership and active request are required.',409);const timing=requestTimeProblem(d,patient);if(timing)throw new DomainError(timing,409);const edited=command({type:'patient',payload:{...patient,...p,id}},d,actor);return {data:command({type:'verify_patient',payload:{id}},edited,actor)};}
 if(b.action==='command'){const type=z.enum(['facility','slot','vehicle','transition','incident']).parse(p.type);if(type==='transition'&&['accepted','transport_confirmed'].includes(String((p.data as any)?.stage))&&p.providerConfirmed!==true)throw new DomainError('Record provider agreement before confirming.');return {data:command({type,payload:p.data},d,actor)};}
 const selections=z.array(z.object({patient:z.string(),slot:z.string(),vehicle:z.string(),start:z.number().int().min(0).max(1439).optional()})).min(1).max(200).parse(p.selections);for(const selection of selections){const patient=d.patients.find(x=>x.id===selection.patient);if(!patient)throw new DomainError('Patient not found.',404);const issue=checkRequest(d,patient);if(issue)throw new DomainError(issue,409);}const current=solve(structuredClone(d)).assignments,fixed=current.filter(a=>(a.stage!=='completed'||a.episode===d.patients.find(p=>p.id===a.patient)?.episode)&&(committedStages.includes(a.stage)||a.stage==='proposed'&&!!a.adminApprovedAt)),chosen:Assignment[]=[...fixed];
 for(const s of selections){const patient=d.patients.find(x=>x.id===s.patient);if(!patient||chosen.some(a=>a.patient===s.patient))throw new DomainError('A patient is already assigned. Refresh suggestions.',409);const o=enumerate(d,patient).find(x=>x.slot===s.slot&&x.vehicle===s.vehicle&&(s.start==null||x.start===s.start));if(!o||!fits(d,o,chosen))throw new DomainError('Resources changed or a selection conflicts. Generate suggestions again.',409);chosen.push({...o,episode:patient.episode,id:crypto.randomUUID(),stage:'proposed',patientAgreed:patient.consent,expires:Math.min(d.now+60,o.tripStart),expiresAt:patient.requestDate?Date.now()+3600000:undefined,adminApprovedAt:Date.now(),history:[{stage:'proposed',at:d.now,recordedAt:Date.now(),actor:actor.label}]});}
 d.assignments=[...current.filter(a=>a.stage!=='proposed'&&!fixed.some(f=>f.id===a.id)),...chosen];d.audit.unshift({id:crypto.randomUUID(),at:d.now,recordedAt:Date.now(),actor:actor.label,text:`Approved ${selections.length} suggested assignments after request/resource checks; provider confirmations pending. Automatic operational checks are not clinical verification.`});return {data:d};
}
