import {z} from 'zod';
import {District,serviceClock} from './domain';
import {command,DomainError,serviceDate,timeZoneSchema} from './commands';

// These actions operate only after /api/demo resolves its session-owned fictional district.
export function judgeRoleAction(d:District,input:unknown):District{
 const b=z.object({action:z.enum(['role_command','demo_request']),payload:z.record(z.string(),z.unknown())}).parse(input);
 if(b.action==='role_command'){
  const p=z.object({role:z.enum(['patient','facility','transport']),entity:z.string(),type:z.enum(['transition','patient_progress']),data:z.record(z.string(),z.unknown())}).parse(b.payload);
  const person=p.role==='patient'?d.patients.find(x=>x.id===p.entity):p.role==='facility'?d.facilities.find(x=>x.id===p.entity):d.vehicles.find(x=>x.id===p.entity);
  if(!person)throw new DomainError('Choose a demo participant.',404);
  if((p.role==='patient')!==(p.type==='patient_progress'))throw new DomainError('This action is not available for this perspective.',403);
  return command({type:p.type,payload:p.data},d,{role:p.role,entity:p.entity,label:`Demo ${p.role}: ${person.name}`});
 }
 const p=z.object({entity:z.string(),note:z.string().trim().min(3).max(1000),kind:z.enum(['treatment','transport','both']),date:serviceDate,timeZone:timeZoneSchema,preferredTime:z.number().int().min(0).max(1439),earliest:z.number().int().min(0).max(1439),deadline:z.number().int().min(0).max(1439),availabilityAcknowledged:z.literal(true),destinationId:z.string().optional()}).parse(b.payload);
 const patient=d.patients.find(x=>x.id===p.entity);
 if(!patient||patient.archived||patient.memberApproved===false)throw new DomainError('Choose an approved demo patient.',403);
 if(d.assignments.some(a=>a.patient===patient.id&&(a.stage==='proposed'&&a.adminApprovedAt||['accepted','transport_confirmed','departed','arrived','treatment_started'].includes(a.stage))))throw new DomainError('Complete the current arrangement before requesting another.',409);
 const clock=serviceClock(d,p.date,p.timeZone);
 if(clock>=1440||p.preferredTime<clock||p.deadline<=clock)throw new DomainError('Choose an available time on the simulated scheduling day.');
 if(p.earliest>p.preferredTime||p.preferredTime>=p.deadline||p.kind!=='transport'&&p.earliest+patient.duration>p.deadline)throw new DomainError('The treatment duration must fit the requested window.');
 const destination=d.facilities.find(f=>f.id===p.destinationId);
 if(p.kind==='transport'&&!destination?.location)throw new DomainError('Choose the existing appointment destination.');
 const episode=crypto.randomUUID();
 Object.assign(patient,{requestActive:true,requestKind:p.kind,requestDate:p.date,timeZone:p.timeZone,preferredTime:p.preferredTime,earliest:p.earliest,deadline:p.deadline,requestNote:p.note,verified:false,consent:true,episode,demoEpisode:episode,destination:p.kind==='transport'?destination?.location:undefined,destinationAddress:p.kind==='transport'?destination?.address:undefined,destinationName:p.kind==='transport'?destination?.name:undefined});
 for(const a of d.assignments.filter(a=>a.patient===patient.id&&a.stage==='proposed')){a.stage='cancelled';a.history.push({stage:'cancelled',at:d.now,recordedAt:Date.now(),actor:'Demo patient request'});}
 d.audit.unshift({id:crypto.randomUUID(),at:d.now,recordedAt:Date.now(),actor:patient.name,text:`${patient.id}: demo ${p.kind} request submitted for ${p.date}; staff review required.`});
 return d;
}
