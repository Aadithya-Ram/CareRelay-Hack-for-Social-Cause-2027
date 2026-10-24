import {z} from 'zod';
import {requireAccount,sameOrigin,district,db} from '@/lib/accounts';
import {DomainError} from '@/lib/commands';
import {saveMachineSchedule} from '@/lib/facility-machines';
export async function POST(req:Request){try{
 sameOrigin(req);const a=await requireAccount(req);if(a.role!=='facility'||a.status!=='active')throw new DomainError('Approved hospital access required.',403);
 const raw=await req.text();if(raw.length>65536)throw new DomainError('Schedule is too large.',413);
 const body=z.object({revision:z.number().int().nonnegative(),schedule:z.unknown()}).parse(JSON.parse(raw)),c=await district('active',a);
 if(body.revision!==c.revision)throw new DomainError('Another update was saved. Refresh before saving the schedule.',409);
 const details=saveMachineSchedule(c.data,body.schedule,{role:'facility',entity:a.entity,label:a.name});
 const saved=await db().prepare('UPDATE districts SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(c.data),c.id,c.revision).run();if(saved.meta.changes!==1)throw new DomainError('Another update was saved. Refresh and retry.',409);
 await db().prepare('UPDATE accounts SET profile=? WHERE id=?').bind(JSON.stringify({...JSON.parse(a.profile),...details}),a.id).run();
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof z.ZodError?e.issues.map(i=>i.message).join(' '):e instanceof DomainError?e.message:'Unable to save machine availability.'},{status:e instanceof DomainError?e.status:400});}}
