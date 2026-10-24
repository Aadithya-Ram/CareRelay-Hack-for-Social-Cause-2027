import {District,Geo,activeRequest,appointmentZone,requestTimeProblem} from './domain';
import {Actor,DomainError} from './commands';

// Move from the patient's pin by a known distance, including near poles/dateline.
function nearby(origin:Geo,km:number,bearing:number):Geo {
 const rad=Math.PI/180,lat=origin.lat*rad,lng=origin.lng*rad,arc=km/6371,angle=bearing*rad;
 const nextLat=Math.asin(Math.sin(lat)*Math.cos(arc)+Math.cos(lat)*Math.sin(arc)*Math.cos(angle));
 const nextLng=lng+Math.atan2(Math.sin(angle)*Math.sin(arc)*Math.cos(lat),Math.cos(arc)-Math.sin(lat)*Math.sin(nextLat));
 return {lat:nextLat/rad,lng:((nextLng/rad+540)%360)-180};
}

/** Explicit, admin-only fixtures; never create accounts or approve memberships. */
export function loadDemoProviders(d:District,id:string,actor:Actor){
 if(actor.role!=='coordinator')throw new DomainError('Admin access required.',403);
 const p=d.patients.find(x=>x.id===id);
 if(!p||!activeRequest(p)||!p.requestActive||!p.episode||!p.requestDate)throw new DomainError('Choose an approved patient with a submitted appointment request.',409);
 if(!p.location||!Number.isFinite(p.location.lat)||!Number.isFinite(p.location.lng)||Math.abs(p.location.lat)>90||Math.abs(p.location.lng)>180)throw new DomainError('Add the patient’s pickup map pin first.',409);
 const zone=appointmentZone(p);
 const timing=requestTimeProblem(d,p);if(timing)throw new DomainError(timing,409);
 // The complete key prevents duplicates while leaving earlier dated reservations intact.
 const key=`DEMO:${p.requestDate}:${zone}:${p.location.lat}:${p.location.lng}`;
 const existing=d.facilities.some(f=>f.id===`${key}:H1`);
 if(!existing&&(d.vehicles.length+3>30||d.slots.length+6>120))throw new DomainError('Demo resource limit reached. Reuse an existing demo request or remove unused resources before adding more.',409);
 const names=['Demo · Riverside Dialysis Hospital','Demo · Greenfield Kidney Centre','Demo · Horizon Renal Hospital'];
 const facilities=names.map((name,i)=>({id:`${key}:H${i+1}`,name,zone:p.zone,demo:true,location:nearby(p.location!,[1.2,3.5,7][i],45+i*100),address:`Simulated hospital ${i+1} near ${p.city||'the selected pickup'}`,city:p.city,country:p.country,requiresLocation:true,open:true,entrance:true,treatmentRoute:true,lift:true,utilities:true,capabilities:i===1?['standard']:['standard','isolation'],verifiedAt:d.now,reportedAt:Date.now(),provenance:'Simulated availability for project demonstration; not a real provider',staffCapacity:2}));
 if(!existing){
  d.facilities.push(...facilities);
  d.slots.push(...facilities.flatMap(f=>[1,2].map(n=>({id:`${f.id}:M${n}`,facility:f.id,machine:`Demo M${n}`,start:0,end:1439,date:p.requestDate,timeZone:zone,staffed:true,active:true}))));
  d.vehicles.push(...(['car','wheelchair','medical'] as const).map((type,i)=>({id:`${key}:V${i+1}`,name:['Demo · Community Car','Demo · Accessible Van','Demo · Medical Transport'][i],provider:'Demo transport partner · simulated',type,seats:4,wheelchairSpace:type!=='car',assistance:true,available:0,until:1439,active:true,confirmed:true,zone:p.zone,cost:0,payer:'Simulated demo funding — no real payment',date:p.requestDate,timeZone:zone,demo:true,location:nearby(p.location!,[0.4,0.8,1.2][i],220+i*30),address:`Simulated vehicle base near ${p.city||'the selected pickup'}`,city:p.city,country:p.country,requiresLocation:true})));
 }else{
  // Repeated clicks refresh the simulated report, without moving resources,
  // changing bookings, reversing closures, or duplicating vehicles/machines.
  for(const f of d.facilities.filter(f=>facilities.some(x=>x.id===f.id))){f.verifiedAt=d.now;f.reportedAt=Date.now();}
 }
 p.demoEpisode=p.episode;
 d.audit.unshift({id:crypto.randomUUID(),at:d.now,recordedAt:Date.now(),actor:actor.label,text:`${p.id}: ${existing?'refreshed':'loaded'} demo providers for ${p.requestDate} (${zone}); this appointment may use simulated hospitals and transport.`});
 return d;
}
