import {z} from 'zod';
import {District,canonicalZone} from './domain';
import {command,Actor,DomainError,serviceDate,timeZoneSchema} from './commands';
const clock=z.number().int().min(0).max(1439);
export const machineFields={machineCount:z.number().int().min(0).max(120).default(0),machineIdentifiers:z.array(z.string().trim().min(1).max(40)).max(120).default([]),machineSchedule:z.array(z.object({id:z.string().optional(),machine:z.string().trim().min(1).max(40),date:serviceDate,timeZone:timeZoneSchema,start:clock,end:clock,active:z.boolean().default(true),staffed:z.boolean().default(false)}).refine(s=>s.end>s.start,'Slot end must be later than its start.')).max(120).default([])};
export const machineSchema=z.object(machineFields).superRefine((p,ctx)=>{
 if(p.machineCount!==p.machineIdentifiers.length)ctx.addIssue({code:'custom',message:'Machine count must match the number of unique identifiers.'});
 if(new Set(p.machineIdentifiers).size!==p.machineIdentifiers.length)ctx.addIssue({code:'custom',message:'Machine identifiers must be unique.'});
 if(p.machineSchedule.some(s=>!p.machineIdentifiers.includes(s.machine)))ctx.addIssue({code:'custom',message:'Every slot must use a registered machine identifier.'});
 const ids=p.machineSchedule.flatMap(s=>s.id?[s.id]:[]);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Each reported slot must have a unique record.'});
});
export function saveMachineSchedule(d:District,input:unknown,actor:Actor){
 const details=machineSchema.parse(input),owned=d.slots.filter(s=>s.facility===actor.entity);
 if(actor.role!=='facility'||!d.facilities.some(f=>f.id===actor.entity))throw new DomainError('Approved hospital access required.',403);
 for(const row of details.machineSchedule){
  if(row.id&&!owned.some(s=>s.id===row.id))throw new DomainError('This slot belongs to another hospital.',403);
  const found=owned.find(s=>s.id===row.id),old=found?{...found,date:found.date??d.date,timeZone:canonicalZone(found.timeZone??'Asia/Kolkata')}:undefined,payload={...row,facility:actor.entity};
  if(old&&(['machine','date','timeZone','start','end','active','staffed'] as const).every(k=>old[k]===row[k]))continue;
  command({type:'slot',payload},d,actor);
 }
 for(const old of owned.filter(s=>!details.machineSchedule.some(row=>row.id===s.id))){
  if(d.assignments.some(a=>a.slot===old.id&&['departed','arrived','treatment_started'].includes(a.stage)))throw new DomainError('An underway treatment slot cannot be removed.',409);
  if(d.assignments.some(a=>a.slot===old.id&&a.stage==='completed')){old.active=false;continue;}
  if(old.active)command({type:'slot',payload:{...old,active:false}},d,actor);
 }
 return details;
}
