export type Role = "coordinator" | "facility" | "transport" | "patient";
export type TransportNeed = "car" | "wheelchair" | "medical";
export type Stage = "proposed" | "accepted" | "transport_confirmed" | "departed" | "arrived" | "treatment_started" | "completed" | "cancelled" | "rejected" | "expired";
export interface Geo {lat:number;lng:number}
export interface Located {demo?:boolean;location?:Geo;address?:string;houseNumber?:string;city?:string;country?:string;phone?:string;requiresLocation?:boolean}
export interface Patient extends Located {
  operationalCheck?:string;
  demoEpisode?:string;
  archived?:boolean;episode?:string; memberApproved?:boolean;requestActive?:boolean; requestKind?:"treatment"|"transport"|"both"; requestDate?:string; preferredTime?:number; timeZone?:string; requestNote?:string; destination?:Geo; destinationAddress?:string; destinationName?:string;
  id: string; name: string; home: string; zone: number; duration: number;
  earliest: number; deadline: number; urgency: number; capability: string;
  wheelchair: boolean; occupiedWheelchair: boolean; transportNeed: TransportNeed; assistance: boolean;
  caregiver: boolean; budget: number; consent: boolean; verified: boolean;
}
export interface Facility extends Located {
  id: string; name: string; zone: number; open: boolean;
  entrance: boolean | null; treatmentRoute: boolean | null; lift: boolean;
  utilities: boolean; capabilities: string[]; verifiedAt: number | null;
  provenance: string; reportedAt?:number; staffCapacity: number;
}
export interface Slot {
  id: string; facility: string; machine: string; start: number; end: number;
  staffed: boolean; active: boolean; date?:string; timeZone?:string;
}
export interface Vehicle extends Located {
  id: string; name: string; provider: string; type: TransportNeed;
  seats: number; wheelchairSpace: boolean; assistance: boolean; available: number; until: number;
  active: boolean; confirmed: boolean; zone: number; cost: number; payer: string; date?:string; timeZone?:string;
}
export interface Assignment {
  completion?:{patientName:string;facilityName:string;vehicleName:string;destination:string;reason:string;completedAt:number;reportedBy:string};
  episode?:string; start?:number;date?:string;timeZone?:string;requestKind?:"treatment"|"transport"|"both";expiresAt?:number;
  id: string; patient: string; slot: string; vehicle: string; stage: Stage;
  pickup: number; arrival: number; tripStart: number; tripEnd: number;
  duration: number; fare: number; facilityAcceptedBy?: string;
  transportConfirmedBy?: string; adminApprovedAt?:number; patientAgreed: boolean; expires: number;
  history: {stage: Stage; at: number; recordedAt?:number; actor: string}[]; escalation?: string;
}
export interface Barrier {patient: string; code: string; reason: string; action: string; candidates: string[]}
export interface Audit {id: string; at: number; recordedAt?:number; actor: string; text: string}
export interface Message {id: string; facility: string; text: string; proposal: {open?: boolean; staffCapacity?: number}; reviewed: boolean; parser: string}
export interface Metrics {
  feasible: number; accepted: number; transportConfirmed: number; completed: number;
  unresolved: number; violations: number; runtimeMs: number; status: string;
  baseline: number; nearestViolations: number; changedCommitments: number;
}
export interface District {
  supportThreads?:SupportThread[];
  version: number; mode: "active" | "practice"; now: number; date: string;
  currentTimeMs?:number;
  freshness: number; turnaround: number; checkin: number; delay: number;
  patients: Patient[]; facilities: Facility[]; slots: Slot[]; vehicles: Vehicle[];
  assignments: Assignment[]; barriers: Barrier[]; audit: Audit[];
  messages: Message[]; blockedRoutes: string[]; rejectedPairs: string[];
  incidents: {id: string; kind: string; target: string; note: string; at: number}[];
  metrics: Metrics | null;
}
export interface SupportThread {
  partner?:{role:'facility'|'transport';entity:string;name:string};providerReadAt?:number;
  id:string;patient:string;subject:string;status:'open'|'closed';createdAt:number;updatedAt:number;patientReadAt:number;adminReadAt:number;
  messages:{id:string;text:string;sender:Role;name:string;at:number}[];
}
export const threadSeenAt=(t:SupportThread,role:Role)=>role==='patient'?t.patientReadAt:role==='coordinator'?t.adminReadAt:t.providerReadAt??0;
export const threadUnread=(t:SupportThread,role:Role)=>t.messages.some(m=>m.sender!==role&&m.at>threadSeenAt(t,role));
export function canMessagePartner(d:District,patient:string,role:'facility'|'transport',entity:string){return d.assignments.some(a=>a.patient===patient&&a.episode===d.patients.find(p=>p.id===patient)?.episode&&!!a.adminApprovedAt&&!['cancelled','expired','rejected'].includes(a.stage)&&(role==='facility'?d.slots.find(s=>s.id===a.slot)?.facility===entity:a.vehicle===entity));}
export const liveStages: Stage[] = ["proposed", "accepted", "transport_confirmed", "departed", "arrived", "treatment_started", "completed"];
export const underwayStages: Stage[] = ["departed", "arrived", "treatment_started", "completed"];
export const committedStages: Stage[] = ["accepted", "transport_confirmed", ...underwayStages];
export const time = (min: number) => `${String(Math.floor(min / 60)).padStart(2,"0")}:${String(min % 60).padStart(2,"0")}`;
export const routeKey = (zone: number, facility: string) => `${zone}:${facility}`;
export function travel(a: number, b: number) { return 12 + Math.abs(a-b)*7; }
export function distance(a:Geo,b:Geo){const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lng-a.lng)*r;return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2)));}
export function estimatedTravel(a:Located&{zone:number},b:Located&{zone:number}){return a.location&&b.location?Math.ceil(12+distance(a.location,b.location)*3):travel(a.zone,b.zone);}
export function fresh(d: District, f: Facility) {
 if(f.verifiedAt===null)return false;
 if(d.currentTimeMs&&!f.demo){const age=d.currentTimeMs-(f.reportedAt??0);return !!f.reportedAt&&age>=0&&age<=d.freshness*60000;}
 return d.now-f.verifiedAt<=d.freshness&&f.verifiedAt<=d.now;
}
export function seed(mode: "active" | "practice" = "active"): District {
  const facilities: Facility[] = [
    {id:"F1",name:"Riverside Dialysis Centre",zone:1,open:true,entrance:true,treatmentRoute:true,lift:true,utilities:true,capabilities:["standard","isolation"],verifiedAt:480,provenance:"Facility staff verified",staffCapacity:5},
    {id:"F2",name:"Northside Renal Care",zone:3,open:true,entrance:true,treatmentRoute:true,lift:true,utilities:true,capabilities:["standard"],verifiedAt:480,provenance:"Facility staff verified",staffCapacity:5},
    {id:"F3",name:"Greenfield Medical Centre",zone:5,open:true,entrance:true,treatmentRoute:true,lift:true,utilities:true,capabilities:["standard","isolation"],verifiedAt:300,provenance:"Phone report awaiting reconfirmation",staffCapacity:5},
  ];
  const names = ["Asha Mehta","Rahul Das","Mira Shah","Arun Nair","Fatima Ali","Dev Patel","Lata Rao","Imran Khan","Priya Sen","Vikram Bose","Nisha Roy","Kiran Jain","Omar Ahmed","Leela Menon","Ravi Kumar","Sana Iqbal","Neha Suri","Anil Gupta","Zoya Mir","Mohan Reddy","Tara Kapoor","Sameer Joshi","Rina Paul","Naveen Bhat","Sara Thomas","Ishaan Rao","Pooja Verma","Kabir Sethi","Anita Dey","Ajay Iyer"];
  const patients: Patient[] = names.map((name,i) => ({id:`P${String(i+1).padStart(2,"0")}`,name,home:`F${Math.floor(i/10)+1}`,zone:1+(i%6),duration:i%5===0?210:180,earliest:600,deadline:i%4===0?840:1140,urgency:i%4===0?3:i%3===0?2:1,capability:i%11===0?"isolation":"standard",wheelchair:i%5===0,occupiedWheelchair:i%5===0&&i%13!==0,transportNeed:i%13===0?"medical":i%5===0?"wheelchair":"car",assistance:i%5===0,caregiver:i%3===0,budget:1500,consent:true,verified:true}));
  const slots = facilities.flatMap(f => [600,870].flatMap((start,shift) => Array.from({length:5},(_,i)=>({id:`${f.id}-M${i+1}-S${shift+1}`,facility:f.id,machine:`M${i+1}`,start,end:start+240,staffed:true,active:true}))));
  const vehicles: Vehicle[] = Array.from({length:12},(_,i)=>({id:`V${i+1}`,name:i<2?`Accessible van ${i+1}`:i===2?"Medical transport 1":`Community car ${i-2}`,provider:i<3?"District transport desk":"Simulated community operator",type:i<2?"wheelchair":i===2?"medical":"car",seats:i<3?3:4,wheelchairSpace:i<2,assistance:true,available:480,until:1140,active:true,confirmed:true,zone:3,cost:i<3?850:350,payer:"District relief fund"}));
  return {version:2,mode,now:480,date:"2026-10-17",freshness:120,turnaround:30,checkin:15,delay:15,patients,facilities,slots,vehicles,assignments:[],barriers:[],audit:[{id:"seed",at:480,actor:"System",text:"Fictional district loaded: 30 patients, 3 centres. Greenfield requires verification."}],messages:[{id:"MSG1",facility:"F3",text:"Greenfield is open. We can staff 5 machines. Please reconfirm our capacity before allocating transfers.",proposal:{open:true,staffCapacity:5},reviewed:false,parser:"Rule-based draft extraction; not an AI model"}],blockedRoutes:[],rejectedPairs:[],incidents:[],metrics:null};
}


const clockFormats=new Map<string,Intl.DateTimeFormat>();
const clockReadings=new Map<string,{at:number;date:string;minute:number}>();
export function serviceClock(d:District,date=d.date,zone='Asia/Kolkata'){
 if(!d.currentTimeMs)return date>d.date?0:date<d.date?1440:d.now;
 let reading=clockReadings.get(zone);
 if(!reading||reading.at!==d.currentTimeMs){let format=clockFormats.get(zone);if(!format){format=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});clockFormats.set(zone,format);}const parts=format.formatToParts(d.currentTimeMs),get=(k:string)=>parts.find(p=>p.type===k)!.value;reading={at:d.currentTimeMs,date:`${get('year')}-${get('month')}-${get('day')}`,minute:Number(get('hour'))*60+Number(get('minute'))};clockReadings.set(zone,reading);}
 return date>reading.date?0:date<reading.date?1440:reading.minute;
}
export const appointmentDate=(d:District,p:Patient)=>p.requestDate??d.date;
const zoneAliases=new Map<string,string>();
export function canonicalZone(zone:string){let result=zoneAliases.get(zone);if(!result){result=new Intl.DateTimeFormat('en',{timeZone:zone}).resolvedOptions().timeZone.replace('Asia/Calcutta','Asia/Kolkata');zoneAliases.set(zone,result);}return result;}
export const appointmentZone=(p:Patient)=>canonicalZone(p.timeZone??'Asia/Kolkata');
export const activeRequest=(p:Patient)=>!p.archived&&p.memberApproved!==false&&p.requestActive!==false;
export function requestTimeProblem(d:District,p:Patient):string|null {
 if(!p.requestDate)return p.requiresLocation?'This request has no appointment date. Confirm a new date and time with the patient.':null;
 const clock=serviceClock(d,p.requestDate,appointmentZone(p));
 if(clock>=1440)return `The requested date (${p.requestDate}) has passed. Confirm a new date and time with the patient before loading providers or matching.`;
 if(clock>=(p.requestKind==='transport'?p.preferredTime??p.earliest:p.deadline-p.duration))return 'The requested appointment window has elapsed. Confirm a new date or time with the patient before matching.';
 return null;
}
export function allocationSlot(d:District,a:{slot:string;patient:string;date?:string;start?:number}){const s=d.slots.find(s=>s.id===a.slot);if(s)return {...s,start:a.start??s.start};const p=d.patients.find(p=>p.id===a.patient);if(p?.requestKind==='transport'&&a.slot===`transport:${p.id}`)return {id:a.slot,facility:`destination:${p.id}`,machine:'Existing appointment',start:p.preferredTime??p.earliest,end:p.deadline,active:true,staffed:true,date:p.requestDate,timeZone:p.timeZone};return undefined;}

export function nextPatientStage(a:Assignment):Stage|null {
  const flow:Stage[]=a.requestKind==='transport'?['transport_confirmed','departed','arrived','completed']:a.requestKind==='treatment'?['accepted','arrived','treatment_started','completed']:['transport_confirmed','departed','arrived','treatment_started','completed'];
  const index=flow.indexOf(a.stage);return index<0?null:flow[index+1]??null;
}
