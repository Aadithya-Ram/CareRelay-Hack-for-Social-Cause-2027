import {distance, type District, type Patient} from './domain';
import type {Option} from './solver';

export const manualOptionKey=(o:Option)=>JSON.stringify([o.patient,o.slot,o.start??null,o.vehicle,o.date??null,o.timeZone??null]);
export const manualSlotKey=(d:District,o:Option)=>JSON.stringify([o.slot,o.start??d.slots.find(s=>s.id===o.slot)?.start]);

// Work only with the server's eligible candidates. Grouping never invents a combination.
export function manualHospitals(d:District,options:Option[]){
  const seen=new Set<string>();
  return options.flatMap(o=>{
    const slot=d.slots.find(s=>s.id===o.slot),facility=d.facilities.find(f=>f.id===slot?.facility);
    if(!facility||seen.has(facility.id))return [];
    seen.add(facility.id);
    const eligible=options.filter(x=>d.slots.find(s=>s.id===x.slot)?.facility===facility.id);
    return [{facility,options:eligible,slotCount:new Set(eligible.map(x=>manualSlotKey(d,x))).size,best:eligible[0]}];
  });
}

export function manualSlots(d:District,options:Option[],facilityId:string){
  const seen=new Set<string>();
  return options.flatMap(o=>{
    const slot=d.slots.find(s=>s.id===o.slot),key=manualSlotKey(d,o);
    if(slot?.facility!==facilityId||seen.has(key))return [];
    seen.add(key);
    return [{key,slot,start:o.start??slot.start,options:options.filter(x=>manualSlotKey(d,x)===key)}];
  });
}

export function manualVehicles(d:District,patient:Patient,options:Option[]){
  const seen=new Set<string>();
  return options.flatMap(o=>{
    const vehicle=d.vehicles.find(v=>v.id===o.vehicle);
    if(!vehicle||seen.has(vehicle.id))return [];
    seen.add(vehicle.id);
    return [{vehicle,option:o,km:vehicle.location&&patient.location?distance(vehicle.location,patient.location):null}];
  }).sort((a,b)=>(a.option.accessMinutes??Infinity)-(b.option.accessMinutes??Infinity)||(a.km??Infinity)-(b.km??Infinity)||a.option.fare-b.option.fare||a.vehicle.name.localeCompare(b.vehicle.name));
}
