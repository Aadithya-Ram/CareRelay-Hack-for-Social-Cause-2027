import { z } from "zod";
import { Assignment, District, Role, Stage, committedStages, fresh, liveStages, seed, underwayStages, allocationSlot, serviceClock, canonicalZone } from "./domain";
import { fits, replan, validCommitment, violations } from "./solver";
import {patientAction,finishEpisode} from './patient-actions';

export class DomainError extends Error {constructor(message: string,public status=400){super(message);}}
export interface Actor {role: Role; entity: string; label: string}
const commandSchema=z.object({type:z.enum(["plan","reset","incident","facility","slot","route","vehicle","patient","verify_patient","transition","message","approve_message","advance","agreement","patient_progress","support_create","support_reply","support_status","support_read"]),payload:z.record(z.unknown()).default({})});
export const serviceDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s,'Choose a valid calendar date');
export const timeZoneSchema=z.string().max(80).refine(s=>{try{new Intl.DateTimeFormat('en',{timeZone:s});return true;}catch{return false;}},'Choose a valid timezone').transform(canonicalZone);
const minute=z.number().int().min(0).max(1439);
const facilitySchema=z.object({id:z.string(),open:z.boolean(),entrance:z.boolean().nullable(),treatmentRoute:z.boolean().nullable(),lift:z.boolean(),utilities:z.boolean(),staffCapacity:z.number().int().min(0).max(30),capabilities:z.array(z.enum(["standard","isolation"])).min(1)});
const geoFields={houseNumber:z.string().max(100).optional(),location:z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)}).optional(),address:z.string().max(240).optional(),city:z.string().max(120).optional(),country:z.string().trim().max(100).optional(),phone:z.string().max(24).optional(),requiresLocation:z.boolean().optional()};
const patientSchema=z.object({...geoFields,requestKind:z.enum(["treatment","transport","both"]).optional(),id:z.string().optional(),name:z.string().trim().min(2).max(80),home:z.string(),zone:z.number().int().min(1).max(6),duration:z.number().int().min(60).max(480),earliest:minute,deadline:minute,urgency:z.number().int().min(1).max(3),capability:z.enum(["standard","isolation"]),wheelchair:z.boolean(),occupiedWheelchair:z.boolean().default(false),transportNeed:z.enum(["car","wheelchair","medical"]),assistance:z.boolean(),caregiver:z.boolean(),budget:z.number().int().min(0).max(100000),consent:z.boolean()}).refine(p=>p.requestKind==="transport"||p.earliest+p.duration<=p.deadline,"Treatment duration does not fit the completion window");
const vehicleSchema=z.object({...geoFields,id:z.string().optional(),name:z.string().trim().min(2).max(100),provider:z.string().trim().min(2).max(100),type:z.enum(["car","wheelchair","medical"]),seats:z.number().int().min(1).max(12),wheelchairSpace:z.boolean().default(false),assistance:z.boolean(),available:minute,until:minute,active:z.boolean(),confirmed:z.boolean(),zone:z.number().int().min(1).max(6),cost:z.number().int().min(0).max(100000),payer:z.string().trim().min(1).max(100),date:serviceDate.optional(),timeZone:timeZoneSchema.optional()}).refine(v=>v.until>v.available,"Vehicle availability must have a positive duration");
function authorize(actor: Actor,roles: Role[],entity?: string){
  if(!roles.includes(actor.role))throw new DomainError("Your account does not have permission for this action.",403);
  if(entity && actor.role!=="coordinator" && actor.entity!==entity)throw new DomainError("This resource belongs to another account.",403);
}
function audit(d: District,actor: Actor,text: string){d.audit.unshift({id:crypto.randomUUID(),at:d.now,actor:actor.label,text,recordedAt:Date.now()});d.audit=d.audit.slice(0,1000);}
function changeStage(d: District,a: Assignment,stage: Stage,actor: Actor){a.stage=stage;if(stage==='completed')finishEpisode(d,a,actor.role);a.history.push({stage,at:serviceClock(d,a.date,a.timeZone),recordedAt:Date.now(),actor:actor.label});audit(d,actor,`${a.patient}: ${stage.replaceAll("_"," ")}`);}
function must<T>(value: T|undefined,message="Record not found"):T {if(!value)throw new DomainError(message,404);return value;}
export function command(input: unknown,d: District,actor: Actor): District {
  const {type,payload:p}=commandSchema.parse(input);
  if(patientAction(type,p,d,actor))return d;
  if(type==="reset") {authorize(actor,["coordinator"]);const n=seed(d.mode);audit(n,actor,"Fictional district reset");return n;}
  if(type==="plan"){authorize(actor,["coordinator"]);replan(d);audit(d,actor,`Plan generated: ${d.metrics!.feasible} feasible arrangements, ${d.barriers.length} unresolved`);return d;}
  if(type==="facility") {
    const f=facilitySchema.parse(p);authorize(actor,["coordinator","facility"],f.id);
    const old=must(d.facilities.find(x=>x.id===f.id));
    Object.assign(old,f,{verifiedAt:d.now,reportedAt:Date.now(),provenance:`Confirmed by ${actor.label}`});
    audit(d,actor,`${old.name}: capability, staffing and accessibility verified`);replan(d);
  }
  if(type==="slot") {
    const slot=z.object({id:z.string().optional(),facility:z.string(),machine:z.string().trim().min(1).max(40),start:minute,end:minute,date:serviceDate.optional(),timeZone:timeZoneSchema.optional(),staffed:z.boolean(),active:z.boolean()}).refine(s=>s.end>s.start+60,"Slot must allow treatment and turnaround").parse(p);
    authorize(actor,["coordinator","facility"],slot.facility);
    const facility=must(d.facilities.find(f=>f.id===slot.facility));
    if(slot.id){const previous=must(d.slots.find(s=>s.id===slot.id));authorize(actor,["coordinator","facility"],previous.facility);if(d.assignments.some(a=>a.slot===slot.id&&underwayStages.includes(a.stage)))throw new DomainError("An underway slot cannot be edited",409);d.assignments.filter(a=>a.slot===slot.id&&liveStages.includes(a.stage)).forEach(a=>changeStage(d,a,"cancelled",actor));Object.assign(previous,slot);}
    else {if(d.slots.length>=120)throw new DomainError("The prototype supports up to 120 discrete slots");d.slots.push({...slot,id:`S-${crypto.randomUUID().slice(0,8)}`});}
    facility.verifiedAt=d.now;facility.reportedAt=Date.now();facility.provenance=`Slot and staffing confirmed by ${actor.label}`;
    audit(d,actor,`${facility.name}: treatment slot and machine availability confirmed`);replan(d);
  }
  if(type==="route") {
    authorize(actor,["coordinator"]);const route=z.string().regex(/^[1-6]:[A-Za-z0-9_-]+$/).parse(p.route);
    if(!d.blockedRoutes.includes(route))throw new DomainError("Route is not awaiting verification");
    d.blockedRoutes=d.blockedRoutes.filter(r=>r!==route);audit(d,actor,`${route}: coordinator confirmed route is usable`);replan(d);
  }
  if(type==="patient") {
    const patient=patientSchema.parse(p);
    authorize(actor,["coordinator","patient"],patient.id);
    if(patient.home!=="unassigned"&&!d.facilities.some(f=>f.id===patient.home))throw new DomainError("Home facility is unknown");
    if(patient.id){const old=must(d.patients.find(x=>x.id===patient.id));if(old.archived)throw new DomainError("Restore this patient before editing.",409);if(d.assignments.some(a=>a.patient===old.id&&['departed','arrived','treatment_started'].includes(a.stage)))throw new DomainError("An underway episode must be reviewed by the coordinator before changing requirements",409);Object.assign(old,patient,{verified:false});}
    else {if(d.patients.length>=60)throw new DomainError("The prototype district supports up to 60 patients");d.patients.push({...patient,id:`P${crypto.randomUUID().slice(0,8)}`,verified:false});}
    audit(d,actor,`Registration saved for ${patient.name}; clinical verification required`);replan(d);
  }
  if(type==="verify_patient") {
    const id=z.string().parse(p.id),patient=must(d.patients.find(x=>x.id===id));
    authorize(actor,["coordinator","facility"],patient.home);if(patient.archived)throw new DomainError("Restore this patient before review.",409);patient.verified=true;
    audit(d,actor,`${id}: staff verified treatment requirements and completion window`);replan(d);
  }
  if(type==="agreement"){
    const id=z.string().parse(p.id);authorize(actor,["coordinator","patient"],id);
    const patient=must(d.patients.find(x=>x.id===id));
    const consent=z.boolean().parse(p.consent);
    if(!consent&&d.assignments.some(a=>a.patient===id&&underwayStages.includes(a.stage)))throw new DomainError("Consent changed after departure: contact the coordinator for immediate review",409);
    patient.consent=consent;d.assignments.filter(a=>a.patient===id).forEach(a=>a.patientAgreed=patient.consent);
    audit(d,actor,`${id}: patient agreement ${patient.consent?"confirmed":"withdrawn"}`);replan(d);
  }
  if(type==="vehicle") {
    const vehicle=vehicleSchema.parse(p);authorize(actor,["coordinator","transport"],vehicle.id);
    if(vehicle.id){Object.assign(must(d.vehicles.find(v=>v.id===vehicle.id)),vehicle);d.assignments.filter(a=>a.vehicle===vehicle.id&&a.stage==="transport_confirmed").forEach(a=>{delete a.transportConfirmedBy;changeStage(d,a,a.requestKind==='transport'?'proposed':'accepted',actor);});}
    else {if(actor.role!=="coordinator")throw new DomainError("Only coordinators can add an external provider",403);if(d.vehicles.length>=30)throw new DomainError("The prototype supports up to 30 vehicles");d.vehicles.push({...vehicle,id:`EXT-${crypto.randomUUID().slice(0,6)}`});}
    audit(d,actor,`${vehicle.name}: transport availability, suitability and payment updated`);replan(d);
  }
  if(type==="incident") {
    authorize(actor,["coordinator"]);
    const incident=z.object({kind:z.enum(["facility_closure","utility_outage","machine_breakdown","staff_shortage","vehicle_cancelled","route_blocked","lift_failure"]),target:z.string(),note:z.string().trim().min(3).max(300)}).parse(p);
    if(incident.kind==="vehicle_cancelled")must(d.vehicles.find(v=>v.id===incident.target)).active=false;
    else if(incident.kind==="route_blocked"){
      if(!/^[1-6]:F[1-3]$/.test(incident.target))throw new DomainError("Select a valid route");
      if(!d.blockedRoutes.includes(incident.target))d.blockedRoutes.push(incident.target);
    } else {
      const f=must(d.facilities.find(f=>f.id===incident.target));
      if(incident.kind==="facility_closure")f.open=false;
      if(incident.kind==="utility_outage")f.utilities=false;
      if(incident.kind==="lift_failure")f.lift=false;
      if(incident.kind==="staff_shortage")f.staffCapacity=Math.max(0,f.staffCapacity-2);
      if(incident.kind==="machine_breakdown")d.slots.filter(s=>s.facility===f.id&&s.machine==="M1").forEach(s=>s.active=false);
    }
    d.incidents.unshift({...incident,id:crypto.randomUUID(),at:d.now});
    audit(d,actor,`${incident.kind.replaceAll("_"," ")}: ${incident.note}`);replan(d);
  }
  if(type==="transition") {
    const c=z.object({id:z.string(),stage:z.enum(["accepted","rejected","transport_confirmed","departed","arrived","treatment_started","completed","cancelled"])}).parse(p);
    const a=must(d.assignments.find(a=>a.id===c.id)),s=must(allocationSlot(d,a));
    const clock=serviceClock(d,a.date,a.timeZone);
    if(a.stage==='proposed'&&['accepted','transport_confirmed'].includes(c.stage)&&d.patients.find(p=>p.id===a.patient)?.memberApproved!==undefined&&!a.adminApprovedAt)throw new DomainError('Admin approval is required before provider confirmation.',409);
    if(a.requestKind==='transport'){
      if(c.stage==='cancelled'){authorize(actor,['coordinator']);if(underwayStages.includes(a.stage))throw new DomainError('Resolve the underway trip first.',409);changeStage(d,a,'cancelled',actor);replan(d);return d;}
      authorize(actor,['coordinator','transport'],a.vehicle);
      const previous:Record<string,Stage>={transport_confirmed:'proposed',departed:'transport_confirmed',arrived:'departed',completed:'arrived',rejected:'proposed'};
      if(a.stage!==previous[c.stage])throw new DomainError('Trip milestones must be completed in order.',409);
      if(c.stage==='transport_confirmed'&&(!validCommitment(d,a)||!a.patientAgreed||!fits(d,a,d.assignments.filter(x=>x.id!==a.id&&liveStages.includes(x.stage)&&(x.stage!=='completed'||x.episode===d.patients.find(p=>p.id===x.patient)?.episode)))||(a.expiresAt?a.expiresAt<=Date.now():a.expires<=d.now)))throw new DomainError('Trip availability or approval expired. Replan.',409);
      if(c.stage==='departed'&&(!validCommitment(d,a)||clock<a.tripStart||clock>a.pickup))throw new DomainError('Record departure within the reserved window on the appointment date.',409);
      if(c.stage==='arrived'&&clock<a.arrival)throw new DomainError('The scheduled arrival has not been reached.',409);
      a.transportConfirmedBy=c.stage==='transport_confirmed'?actor.label:a.transportConfirmedBy;changeStage(d,a,c.stage,actor);return d;
    }
    const f=must(d.facilities.find(f=>f.id===s.facility));
    if(c.stage==="cancelled") {
      authorize(actor,["coordinator"]);
      if(underwayStages.includes(a.stage))throw new DomainError("Underway transfers are frozen. Resolve the escalation with the receiving facility.",409);
      if(!liveStages.includes(a.stage))throw new DomainError("This arrangement is no longer active",409);
      changeStage(d,a,c.stage,actor);replan(d);return d;
    }
    if(c.stage==="rejected"){
      authorize(actor,["coordinator","facility"],f.id);
      if(!["proposed","accepted"].includes(a.stage))throw new DomainError("Rejection is only permitted before transport confirmation",409);
      d.rejectedPairs.push(`${a.patient}:${a.slot}`);changeStage(d,a,c.stage,actor);replan(d);return d;
    }
    const previous: Record<string,Stage>={accepted:"proposed",transport_confirmed:"accepted",departed:"transport_confirmed",arrived:"departed",treatment_started:"arrived",completed:"treatment_started"};
    if(a.requestKind==='treatment'&&c.stage==='arrived')previous.arrived='accepted';
    if(a.stage!==previous[c.stage])throw new DomainError("Milestones must be completed in order",409);
    if(["accepted","treatment_started","completed"].includes(c.stage))authorize(actor,["coordinator","facility"],f.id);
    else if(a.requestKind==='treatment'&&c.stage==='arrived')authorize(actor,['coordinator','facility'],f.id);else authorize(actor,["coordinator","transport"],a.vehicle);
    if(c.stage==="accepted") {
      if(!fresh(d,f)||!validCommitment(d,a))throw new DomainError("Capacity or patient compatibility needs reconfirmation",409);
      if(a.expiresAt?a.expiresAt<=Date.now():a.expires<=d.now)throw new DomainError("This proposal expired; generate a new plan",409);
      if(!fits(d,a,d.assignments.filter(b=>b.id!==a.id&&liveStages.includes(b.stage)&&(b.stage!=='completed'||b.episode===d.patients.find(p=>p.id===b.patient)?.episode))))throw new DomainError("The resource is already allocated",409);
      a.facilityAcceptedBy=actor.label;a.expires=s.start+15;delete a.expiresAt;
    }
    if(c.stage==="transport_confirmed"){
      if(!validCommitment(d,a) || !a.patientAgreed)throw new DomainError("Patient agreement and compatible resources must be confirmed",409);
      a.transportConfirmedBy=actor.label;
    }
    if(c.stage==="departed" && (!validCommitment(d,a) || clock<a.tripStart || clock>a.pickup))throw new DomainError("Confirm compatible resources and set the scenario clock within the departure-to-pickup window",409);
    if(c.stage==="arrived" && clock<a.arrival)throw new DomainError("The scenario clock is earlier than the estimated arrival",409);
    if(c.stage==="treatment_started" && (clock<s.start || clock>s.start+15 || clock+a.duration>must(d.patients.find(p=>p.id===a.patient)).deadline || !validCommitment(d,a)))throw new DomainError("Treatment start requires a suitable facility, reserved start window and completion deadline",409);
    if(c.stage==="completed"){
      const began=a.history.find(h=>h.stage==="treatment_started")!.at;
      if(clock<began+a.duration)throw new DomainError("The supplied treatment duration has not elapsed",409);
      const patient=must(d.patients.find(p=>p.id===a.patient));
      if(clock>patient.deadline)a.escalation="Treatment completion was recorded after the staff-entered deadline.";
    }
    changeStage(d,a,c.stage,actor);
    if(d.metrics){d.metrics.accepted=d.assignments.filter(a=>committedStages.includes(a.stage)).length;d.metrics.transportConfirmed=d.assignments.filter(a=>["transport_confirmed",...underwayStages].includes(a.stage)).length;d.metrics.completed=d.assignments.filter(a=>a.stage==="completed").length;}
  }
  if(type==="message") {
    authorize(actor,["coordinator","facility"],z.string().parse(p.facility));
    const msg=z.object({facility:z.string(),text:z.string().trim().min(5).max(1000)}).parse(p);
    must(d.facilities.find(f=>f.id===msg.facility));
    const capacity=msg.text.match(/(?:staff|staffed|capacity|machines?)\D{0,16}(\d{1,2})/i);
    const isClosed=/\bclosed\b/i.test(msg.text),isOpen=/\bopen\b/i.test(msg.text);
    d.messages.unshift({id:crypto.randomUUID(),...msg,proposal:{...(isClosed?{open:false}:isOpen?{open:true}:{}),...(capacity?{staffCapacity:Math.min(30,Number(capacity[1]))}:{})},reviewed:false,parser:"Rule-based draft extraction; staff approval required"});
    audit(d,actor,"Message received; extracted fields remain unverified");
  }
  if(type==="approve_message") {
    const msg=must(d.messages.find(m=>m.id===z.string().parse(p.id)));authorize(actor,["coordinator","facility"],msg.facility);
    if(msg.reviewed)throw new DomainError("This message has already been reviewed",409);
    if(!Object.keys(msg.proposal).length)throw new DomainError("No reliable fields extracted. Update the facility manually instead.");
    Object.assign(must(d.facilities.find(f=>f.id===msg.facility)),msg.proposal,{verifiedAt:d.now,reportedAt:Date.now(),provenance:`Message confirmed by ${actor.label}`});msg.reviewed=true;
    audit(d,actor,`${msg.facility}: message draft reviewed and confirmed`);replan(d);
  }
  if(type==="advance") {
    authorize(actor,["coordinator"]);const now=minute.parse(p.now);
    if(now<=d.now)throw new DomainError("Scenario time must move forward");d.now=now;
    d.assignments.filter(a=>["proposed","accepted","transport_confirmed"].includes(a.stage)&&(a.expires<=now || a.stage!=="proposed"&&now>a.pickup)).forEach(a=>changeStage(d,a,"expired",actor));
    audit(d,actor,"Scenario clock advanced; stale capacity and expired reservations checked");replan(d);
  }
  const errors=violations(d,d.assignments);
  if(errors.length)throw new DomainError(`Resource validation failed: ${errors[0]}`,409);
  return d;
}

