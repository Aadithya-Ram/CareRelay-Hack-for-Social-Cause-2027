import {z} from 'zod';
import {District,Assignment,Stage,allocationSlot,serviceClock,nextPatientStage,canMessagePartner} from './domain';
import {Actor,DomainError} from './commands';

export const closedStages=['completed','cancelled','rejected','expired'];
export function finishEpisode(d:District,a:Assignment,reportedBy:string){
  const patient=d.patients.find(p=>p.id===a.patient);if(!patient)return;
  const slot=allocationSlot(d,a),facility=d.facilities.find(f=>f.id===slot?.facility),vehicle=d.vehicles.find(v=>v.id===a.vehicle);
  a.completion??={patientName:patient.name,facilityName:facility?.name??'',vehicleName:vehicle?.name??'',destination:facility?.address??patient.destinationAddress??'',reason:patient.requestNote??'',completedAt:Date.now(),reportedBy};
  if(a.episode===patient.episode){patient.requestActive=false;patient.verified=false;d.barriers=d.barriers.filter(b=>b.patient!==patient.id);}
}
export function patientAction(type:string,p:Record<string,unknown>,d:District,actor:Actor):boolean {
  if(type==='patient_progress'){
    const input=z.object({id:z.string(),stage:z.enum(['departed','arrived','treatment_started','completed']),confirmed:z.literal(true)}).parse(p);
    const a=d.assignments.find(a=>a.id===input.id);
    if(actor.role!=='patient'||!a||a.patient!==actor.entity)throw new DomainError('Only the patient assigned to this arrangement can report its progress.',403);
    if(nextPatientStage(a)!==input.stage)throw new DomainError('Complete the next milestone in order. Provider confirmations update automatically.',409);
    const patient=d.patients.find(p=>p.id===a.patient)!;
    if(!patient||patient.archived||patient.memberApproved===false||a.episode!==patient.episode)throw new DomainError('This is not your current approved request.',409);
    const slot=allocationSlot(d,a),facility=d.facilities.find(f=>f.id===slot?.facility),vehicle=d.vehicles.find(v=>v.id===a.vehicle);
    const demo=Boolean(facility?.demo||vehicle?.demo);
    let at=serviceClock(d,a.date,a.timeZone);
    if(!demo){
      if(a.date&&a.date>(d.currentTimeMs?new Intl.DateTimeFormat('en-CA',{timeZone:a.timeZone??'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d.currentTimeMs):d.date))throw new DomainError('Report progress on the appointment date, after the step has happened.',409);
      if(input.stage==='departed'&&at<a.tripStart)throw new DomainError('The reserved journey has not started yet.',409);
      if(input.stage==='treatment_started'&&at<(slot?.start??0))throw new DomainError('The treatment appointment time has not arrived yet.',409);
      const began=a.history.find(h=>h.stage==='treatment_started');
      if(input.stage==='completed'&&began&&at<began.at+a.duration)throw new DomainError('Your recorded treatment duration has not elapsed. Contact the care team if treatment ended early.',409);
    }else{
      const previous=a.history.at(-1)?.at??0;
      at=Math.max(previous,input.stage==='departed'?a.tripStart:input.stage==='arrived'?a.arrival:input.stage==='treatment_started'?slot?.start??a.arrival:(a.history.find(h=>h.stage==='treatment_started')?.at??a.arrival)+(a.requestKind==='transport'?0:a.duration));
    }
    const now=Date.now();a.stage=input.stage;
    a.history.push({stage:input.stage,at,recordedAt:now,actor:`${actor.label} · patient reported${demo?' · simulated demo':''}`});
    if(input.stage==='completed'){
      finishEpisode(d,a,'patient');
      if(d.metrics)d.metrics.completed=d.assignments.filter(x=>x.stage==='completed').length;
    }
    d.audit.unshift({id:crypto.randomUUID(),at:d.now,recordedAt:now,actor:actor.label,text:`${patient.id}: patient reported ${input.stage.replaceAll('_',' ')}${input.stage==='completed'?'; request closed and retained in history':''}${demo?' (simulated demo)':''}`});
    return true;
  }

  if(!['support_create','support_reply','support_status','support_read'].includes(type))return false;
  const now=Date.now(),threads=d.supportThreads??(d.supportThreads=[]);
  if(type==='support_create'){
    const input=z.object({subject:z.string().trim().min(3).max(100),text:z.string().trim().min(3).max(3000),patient:z.string().optional(),partnerRole:z.enum(['facility','transport']).optional(),partnerEntity:z.string().optional()}).parse(p);
    const patient=actor.role==='patient'?actor.entity:input.patient;
    if(!patient||!d.patients.some(p=>p.id===patient))throw new DomainError('Choose an authorized patient contact.',403);
    let partner;
    if(actor.role==='facility'||actor.role==='transport'){
      if(!canMessagePartner(d,patient,actor.role,actor.entity))throw new DomainError('Messaging requires an approved assignment with this patient.',403);
      partner={role:actor.role,entity:actor.entity,name:actor.role==='facility'?d.facilities.find(f=>f.id===actor.entity)?.name??actor.label:d.vehicles.find(v=>v.id===actor.entity)?.name??actor.label};
    }else if(input.partnerRole){
      if(actor.role!=='patient'||!input.partnerEntity||!canMessagePartner(d,patient,input.partnerRole,input.partnerEntity))throw new DomainError('You can message only providers assigned to your care.',403);
      const provider=input.partnerRole==='facility'?d.facilities.find(f=>f.id===input.partnerEntity):d.vehicles.find(v=>v.id===input.partnerEntity);
      if(!provider||provider.demo)throw new DomainError('Simulated providers cannot receive messages. Contact the care team.',403);
      partner={role:input.partnerRole,entity:input.partnerEntity,name:provider.name};
    }
    if(threads.filter(t=>t.patient===patient&&t.status==='open').length>=20)throw new DomainError('There are 20 open conversations. Please reply to an existing one.');
    threads.unshift({id:crypto.randomUUID(),patient,partner,status:'open',subject:input.subject,createdAt:now,updatedAt:now,patientReadAt:actor.role==='patient'?now:0,adminReadAt:actor.role==='coordinator'?now:0,providerReadAt:actor.role==='facility'||actor.role==='transport'?now:0,messages:[{id:crypto.randomUUID(),text:input.text,sender:actor.role,name:actor.label,at:now}]});return true;
  }
  const id=z.string().parse(p.id),thread=threads.find(t=>t.id===id);
  const participant=thread&&(actor.role==='patient'?thread.patient===actor.entity:actor.role==='coordinator'?!thread.partner:thread.partner?.role===actor.role&&thread.partner.entity===actor.entity);
  if(!thread||!participant)throw new DomainError('Conversation not found.',404);
  if(type==='support_reply'){
    if(thread.partner&&!canMessagePartner(d,thread.patient,thread.partner.role,thread.partner.entity))throw new DomainError('This provider relationship is no longer active. Contact the care team.',403);
    const text=z.string().trim().min(1).max(3000).parse(p.text);
    if(thread.messages.length>=200)throw new DomainError('This conversation is full. Start a new help request.');
    thread.messages.push({id:crypto.randomUUID(),text,sender:actor.role,name:actor.label,at:now});thread.updatedAt=now;thread.status='open';
  }
  if(type==='support_status'){
    if(actor.role==='patient')throw new DomainError('Only the care team or provider can close a conversation.',403);
    thread.status=z.enum(['open','closed']).parse(p.status);thread.updatedAt=now;
  }
  if(actor.role==='patient')thread.patientReadAt=now;else if(actor.role==='coordinator')thread.adminReadAt=now;else thread.providerReadAt=now;
  return true;
}
