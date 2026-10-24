import {serviceInstant} from '../lib/service-time';
import {scopedDistrict,transportPatient} from '../lib/visibility';
import {fresh,canMessagePartner} from '../lib/domain';
import {machineSchema,saveMachineSchedule} from '../lib/facility-machines';
import {test} from "node:test";
import assert from "node:assert/strict";
import {seed,liveStages,committedStages,routeKey,distance,requestTimeProblem} from "../lib/domain";
import {solve,replan,enumerate,violations,intervention,vehicleReasons,facilityReasons,conflicts} from "../lib/solver";
import {command,Actor} from "../lib/commands";
import {loadDemoProviders} from "../lib/demo-providers";
const actor:Actor={role:"coordinator",entity:"",label:"Test coordinator"};
const run=(d:ReturnType<typeof seed>,type:string,payload:Record<string,unknown>={})=>command({type,payload},d,actor);
function planned(){const d=seed();replan(d);return d;}
test("seed contains 30 fictional patients across three facilities",()=>{const d=seed();assert.equal(d.patients.length,30);assert.equal(d.facilities.length,3);assert.equal(d.slots.length,30);});
test("planner returns valid capacity and transport allocations",()=>{const d=planned();assert.ok(d.metrics!.feasible>0);assert.equal(violations(d,d.assignments).length,0);assert.equal(d.metrics!.unresolved+d.metrics!.feasible,30);});
test("stale general capacity never becomes a new confirmed candidate",()=>{const d=planned();assert.ok(d.assignments.every(a=>!a.slot.startsWith("F3")));assert.ok(d.barriers.some(b=>b.code==="verification"));});
test("unknown accessibility is excluded for wheelchair patients",()=>{const d=seed();d.facilities.forEach(f=>{f.verifiedAt=d.now;f.entrance=null;});assert.equal(enumerate(d,d.patients.find(p=>p.transportNeed==="wheelchair")!).length,0);});
test("wheelchair transport itself enforces facility accessibility",()=>{const d=seed(),p=d.patients[5];p.wheelchair=false;d.facilities.forEach(f=>{f.treatmentRoute=false;});assert.equal(enumerate(d,p).length,0);});
test("lift failure prevents accessible transfers",()=>{const d=seed();d.facilities.forEach(f=>{f.lift=false;});assert.equal(enumerate(d,d.patients[5]).length,0);});
test("ordinary car cannot substitute for an occupied-wheelchair vehicle",()=>{const d=seed();assert.ok(vehicleReasons(d.patients[5],d.vehicles[3]).length);});
test("clinical monitoring requires medical transport",()=>{const d=seed();assert.ok(vehicleReasons(d.patients[0],d.vehicles[0]).length);});
test("caregiver seats, assistance and affordability are enforced",()=>{const d=seed(),p=d.patients[0],v=d.vehicles[2];v.seats=1;v.assistance=false;v.cost=9000;assert.equal(vehicleReasons(p,v).length,3);});
test("treatment duration is never shortened to fit a slot",()=>{const d=seed();d.patients[0].duration=300;assert.equal(enumerate(d,d.patients[0]).length,0);});
test("deadline means treatment completion, not arrival",()=>{const d=seed(),p=d.patients[1];p.deadline=700;assert.equal(enumerate(d,p).length,0);});
test("blocked routes are excluded",()=>{const d=seed(),p=d.patients[1];d.facilities.forEach(f=>d.blockedRoutes.push(routeKey(p.zone,f.id)));assert.equal(enumerate(d,p).length,0);});
test("slot staffing and essential utilities are mandatory",()=>{const d=seed();d.facilities.forEach(f=>{f.utilities=false;});assert.equal(enumerate(d,d.patients[1]).length,0);});
test("staff capacity limits concurrent treatments",()=>{const d=seed();d.facilities.forEach(f=>{f.staffCapacity=1;f.verifiedAt=d.now;});const r=solve(d);assert.ok(r.metrics.feasible<=6);assert.equal(r.metrics.violations,0);});
test("no resources correctly yields a wholly unresolved queue",()=>{const d=seed();d.facilities.forEach(f=>f.open=false);const r=solve(d);assert.equal(r.metrics.feasible,0);assert.equal(r.barriers.length,30);});
test("facility acceptance reserves and transport confirmation remains separate",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});assert.equal(a.stage,"accepted");assert.equal(d.metrics!.transportConfirmed,0);run(d,"transition",{id:a.id,stage:"transport_confirmed"});assert.equal(a.stage,"transport_confirmed");});
test("skipping milestones is rejected",()=>{const d=planned();assert.throws(()=>run(d,"transition",{id:d.assignments[0].id,stage:"completed"}),/order/);});
test("patient role cannot accept or plan",()=>{const d=planned(),patient:Actor={role:"patient",entity:"P01",label:"Patient"};assert.throws(()=>command({type:"plan"},d,patient),/permission/);assert.throws(()=>command({type:"transition",payload:{id:d.assignments[0].id,stage:"accepted"}},d,patient),/permission/);});
test("facility role is limited to its own resources",()=>{const d=seed();assert.throws(()=>command({type:"approve_message",payload:{id:"MSG1"}},d,{role:"facility",entity:"F1",label:"F1 staff"}),/another account/);});
test("accepted arrangements survive unaffected replanning",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});const id=a.id,slot=a.slot,v=a.vehicle;run(d,"plan");const b=d.assignments.find(a=>a.id===id)!;assert.equal(b.stage,"accepted");assert.equal(b.slot,slot);assert.equal(b.vehicle,v);assert.equal(d.metrics!.changedCommitments,0);});
test("vehicle cancellation releases affected accepted plans",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});const id=a.id;run(d,"incident",{kind:"vehicle_cancelled",target:a.vehicle,note:"Test cancellation"});assert.equal(d.assignments.find(a=>a.id===id)!.stage,"cancelled");assert.equal(d.metrics!.violations,0);});
test("rejection excludes the rejected patient-slot pair",()=>{const d=planned(),a=d.assignments[0],pair=`${a.patient}:${a.slot}`;run(d,"transition",{id:a.id,stage:"rejected"});assert.ok(d.rejectedPairs.includes(pair));assert.ok(!d.assignments.some(b=>liveStages.includes(b.stage)&&`${b.patient}:${b.slot}`===pair));});
test("underway transfer is frozen and escalated on resource failure",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});run(d,"transition",{id:a.id,stage:"transport_confirmed"});run(d,"advance",{now:a.tripStart});run(d,"transition",{id:a.id,stage:"departed"});run(d,"incident",{kind:"vehicle_cancelled",target:a.vehicle,note:"Vehicle interrupted"});const b=d.assignments.find(x=>x.id===a.id)!;assert.equal(b.stage,"departed");assert.equal(b.slot,a.slot);assert.ok(b.escalation);});
test("arrival is not counted as completed treatment",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});run(d,"transition",{id:a.id,stage:"transport_confirmed"});run(d,"advance",{now:a.tripStart});run(d,"transition",{id:a.id,stage:"departed"});run(d,"advance",{now:a.arrival});run(d,"transition",{id:a.id,stage:"arrived"});assert.equal(d.metrics!.completed,0);});
test("end-to-end journey records treatment completion after its duration",()=>{const d=planned(),a=d.assignments.find(a=>a.duration===180)!;run(d,"transition",{id:a.id,stage:"accepted"});run(d,"transition",{id:a.id,stage:"transport_confirmed"});run(d,"advance",{now:a.tripStart});run(d,"transition",{id:a.id,stage:"departed"});run(d,"advance",{now:a.arrival});run(d,"transition",{id:a.id,stage:"arrived"});const slot=d.slots.find(s=>s.id===a.slot)!;run(d,"advance",{now:slot.start});run(d,"transition",{id:a.id,stage:"treatment_started"});assert.throws(()=>run(d,"transition",{id:a.id,stage:"completed"}),/duration/);run(d,"advance",{now:slot.start+a.duration});run(d,"transition",{id:a.id,stage:"completed"});assert.equal(a.stage,"completed");assert.equal(d.metrics!.completed,1);});
test("proposals expire on the forward-only scenario clock",()=>{const d=planned(),id=d.assignments[0].id;run(d,"advance",{now:541});assert.equal(d.assignments.find(a=>a.id===id)!.stage,"expired");assert.throws(()=>run(d,"advance",{now:480}),/forward/);});
test("message extraction stays unverified until staff approves",()=>{const d=seed();run(d,"message",{facility:"F3",text:"We are open. We can staff 4 machines."});assert.equal(d.facilities[2].verifiedAt,300);run(d,"approve_message",{id:d.messages[0].id});assert.equal(d.facilities[2].staffCapacity,4);assert.equal(d.facilities[2].verifiedAt,480);});
test("unparseable message allows manual review without inventing capacity",()=>{const d=seed();run(d,"message",{facility:"F3",text:"Please call back for a status update."});assert.deepEqual(d.messages[0].proposal,{});assert.throws(()=>run(d,"approve_message",{id:d.messages[0].id}),/manually/);});
test("counterfactuals do not mutate records",()=>{const d=planned(),before=JSON.stringify(d);for(const kind of ["vehicle","slot","verify"]){const r=intervention(d,kind);assert.ok(r.after>=r.before);assert.equal(JSON.stringify(d),before);}});
test("practice records are isolated from active records",()=>{const active=planned(),practice=seed("practice"),before=JSON.stringify(active);run(practice,"incident",{kind:"facility_closure",target:"F1",note:"Practice only"});assert.equal(JSON.stringify(active),before);assert.equal(practice.mode,"practice");});
test("patient registration never silently verifies clinical fields",()=>{const d=seed(),p=d.patients[1];run(d,"patient",{...p,name:"Updated Patient"});assert.equal(p.verified,false);assert.ok(d.barriers.some(b=>b.patient===p.id&&b.code==="clinical_verification"));});
test("withdrawn patient agreement blocks a new plan",()=>{const d=planned();run(d,"agreement",{id:"P02",consent:false});assert.ok(!d.assignments.some(a=>a.patient==="P02"&&liveStages.includes(a.stage)));});
test("all demonstration disruptions preserve invariants",()=>{for(const kind of ["machine_breakdown","facility_closure","utility_outage","staff_shortage","lift_failure"]){const d=planned();run(d,"incident",{kind,target:"F1",note:"Invariant test"});assert.equal(d.metrics!.violations,0);assert.ok(d.metrics!.feasible+d.barriers.length===30);}});
test("combined medical and occupied-wheelchair needs require both capabilities",()=>{const d=seed(),p=d.patients[0];p.occupiedWheelchair=true;assert.ok(vehicleReasons(p,d.vehicles[2]).length);d.vehicles[2].wheelchairSpace=true;assert.equal(vehicleReasons(p,d.vehicles[2]).length,0);});
test("new overlapping machine slots cannot double-book the same machine",()=>{const d=seed();run(d,"slot",{facility:"F1",machine:"M1",start:600,end:840,active:true,staffed:true});assert.equal(d.metrics!.violations,0);const concurrent=d.assignments.filter(a=>liveStages.includes(a.stage)&&d.slots.find(s=>s.id===a.slot)?.facility==="F1"&&d.slots.find(s=>s.id===a.slot)?.machine==="M1"&&d.slots.find(s=>s.id===a.slot)?.start===600);assert.ok(concurrent.length<=1);});
test("broken machine slots can be restored with staff confirmation",()=>{const d=seed();run(d,"incident",{kind:"machine_breakdown",target:"F1",note:"Machine failure"});const slot=d.slots[0];assert.equal(slot.active,false);run(d,"slot",{...slot,active:true});assert.equal(slot.active,true);});
test("route verification restores the coordinator-reported route",()=>{const d=seed();run(d,"incident",{kind:"route_blocked",target:"1:F1",note:"Road unverified"});assert.ok(d.blockedRoutes.includes("1:F1"));run(d,"route",{route:"1:F1"});assert.ok(!d.blockedRoutes.includes("1:F1"));});
test("a constrained case improves on greedy without breaking eligibility",()=>{const d=seed();d.patients=[{...d.patients[1],zone:1,urgency:3,deadline:900},{...d.patients[11],zone:1,urgency:1,deadline:900}];d.facilities=d.facilities.slice(0,2);d.facilities.forEach(f=>f.verifiedAt=d.now);d.facilities[1].zone=5;d.slots=[d.slots[0],d.slots[10]];d.vehicles=d.vehicles.slice(3,5);const r=solve(d);assert.equal(r.metrics.feasible,2);assert.equal(r.metrics.baseline,1);assert.equal(r.metrics.violations,0);});
test("editing an accepted slot requires renewed acceptance",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});const slot=d.slots.find(s=>s.id===a.slot)!;run(d,"slot",{...slot});assert.equal(a.stage,"cancelled");});
test("editing confirmed transport requires a new provider commitment",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});run(d,"transition",{id:a.id,stage:"transport_confirmed"});const vehicle=d.vehicles.find(v=>v.id===a.vehicle)!;run(d,"vehicle",{...vehicle});assert.equal(d.assignments.find(x=>x.id===a.id)!.stage,"accepted");assert.equal(a.transportConfirmedBy,undefined);});
test("missed pickup expires an unstarted arrangement",()=>{const d=planned(),a=d.assignments[0];run(d,"transition",{id:a.id,stage:"accepted"});run(d,"advance",{now:a.pickup+1});assert.equal(a.stage,"expired");});


test("geographic distance crosses city boundaries without service-zone restrictions",()=>{assert.ok(distance({lat:13.0827,lng:80.2707},{lat:12.9716,lng:77.5946})>280);assert.equal(distance({lat:0,lng:0},{lat:0,lng:0}),0);});
test("registered locations require pins rather than fabricated zone travel",()=>{const d=seed(),p=d.patients[0];p.requiresLocation=true;p.requestDate=d.date;assert.equal(enumerate(d,p).length,0);p.location={lat:13.05,lng:80.25};assert.ok(enumerate(d,p).length>0);});
test("nearest compatible geographic centre ranks before cheaper distant capacity",()=>{const d=seed();d.patients=[{...d.patients[1],location:{lat:13.05,lng:80.25}}];d.facilities.forEach((f,i)=>{f.verifiedAt=d.now;f.location={lat:13.05+i*.025,lng:80.25};});d.vehicles.forEach(v=>v.location={lat:13.05,lng:80.25});const options=enumerate(d,d.patients[0]);assert.ok(options.length);assert.equal(d.slots.find(s=>s.id===options[0].slot)?.facility,'F1');});
test("audit records actual event time independently of scheduling time",()=>{const d=seed();command({type:'agreement',payload:{id:d.patients[0].id,consent:false}},d,actor);assert.ok(Math.abs(Date.now()-d.audit[0].recordedAt!)<1000);assert.equal(d.audit[0].at,480);});

// Regression checks for human-approved proposals and the documented objective.
import {careAction} from '../lib/care-team';
test('individual approvals retain earlier pending plans and reserve their resources',()=>{
 const d=seed();const preview=solve(d);const choices=preview.assignments.filter(a=>a.stage==='proposed').slice(0,2);assert.equal(choices.length,2);
 const selection=(a:any)=>({patient:a.patient,slot:a.slot,vehicle:a.vehicle});
 careAction(d,{action:'approve_plan',payload:{selections:[selection(choices[0])]}},actor);
 const first=d.assignments.find(a=>a.patient===choices[0].patient)!;
 careAction(d,{action:'approve_plan',payload:{selections:[selection(choices[1])]}},actor);
 assert.deepEqual(d.assignments.find(a=>a.id===first.id),first);assert.equal(d.assignments.filter(a=>a.adminApprovedAt).length,2);assert.equal(violations(d,d.assignments).length,0);
 const regenerated=solve(d);assert.deepEqual(regenerated.assignments.find(a=>a.id===first.id),first);assert.equal(regenerated.metrics.violations,0);
 assert.throws(()=>careAction(d,{action:'approve_plan',payload:{selections:[selection(choices[0])]}},actor),/already assigned/);
});
test('individual approval rejects a conflicting machine or transport reservation',()=>{
 const d=seed();const p={...d.patients[1],id:'SECOND'};d.patients=[d.patients[1],p];const o=enumerate(d,d.patients[0])[0];assert.ok(o);
 careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);
 assert.throws(()=>careAction(d,{action:'approve_plan',payload:{selections:[{...o,patient:p.id}]}},actor),/conflicts/);
 assert.equal(d.assignments.filter(a=>a.adminApprovedAt).length,1);
});
test('equal coverage prioritises urgent requests and reports a bounded search honestly',()=>{
 const d=seed();d.slots=[d.slots[0]];d.vehicles=[d.vehicles[3]];d.patients=[{...d.patients[1],id:'ROUTINE',urgency:1},{...d.patients[1],id:'URGENT',urgency:3}];
 const r=solve(d);assert.equal(r.assignments.filter(a=>a.stage==='proposed').length,1);assert.equal(r.assignments[0].patient,'URGENT');assert.equal(r.metrics.violations,0);
 assert.match(solve(d,true,0).metrics.status,/search limit reached/);
});
test('unconfirmed approval expires before vehicle departure and cannot silently reuse its approval',()=>{
 const d=seed();const o=enumerate(d,d.patients[1])[0];careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);
 const approved=d.assignments.find(a=>a.adminApprovedAt)!;assert.ok(approved.expires<=approved.tripStart);
 d.now=approved.expires+1;const r=solve(d);assert.ok(r.assignments.some(a=>a.id===approved.id&&a.stage==='cancelled'));assert.ok(!r.assignments.some(a=>a.id===approved.id&&a.stage==='proposed'));
});
test('invalidated approved capacity is cancelled rather than reused as approved',()=>{
 const d=seed();const o=enumerate(d,d.patients[1])[0];careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);const a=d.assignments.find(a=>a.adminApprovedAt)!;
 d.slots.find(s=>s.id===a.slot)!.active=false;const r=solve(d);assert.ok(r.assignments.some(x=>x.id===a.id&&x.stage==='cancelled'));assert.equal(r.metrics.violations,0);
});

test('approving a replacement archives an expired earlier approval',()=>{
 const d=seed();const p=d.patients[1],o=enumerate(d,p)[0];careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);const first=d.assignments.find(a=>a.adminApprovedAt)!;
 d.now=first.expires+1;d.facilities.forEach(f=>f.verifiedAt=d.now);const next=enumerate(d,p)[0];assert.ok(next);careAction(d,{action:'approve_plan',payload:{selections:[next]}},actor);
 assert.ok(d.assignments.some(a=>a.id===first.id&&a.stage==='cancelled'));assert.equal(d.assignments.filter(a=>a.patient===p.id&&a.stage==='proposed'&&a.adminApprovedAt).length,1);assert.equal(violations(d,d.assignments).length,0);
});

test('archiving removes a patient from matching, cancels pending plans and preserves history',()=>{
 const d=seed();const p=d.patients[1];const o=enumerate(d,p)[0];careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);const id=d.assignments.find(a=>a.adminApprovedAt)!.id;
 careAction(d,{action:'archive_patient',payload:{id:p.id}},actor);assert.equal(p.archived,true);assert.equal(enumerate(d,p).length,0);assert.ok(d.assignments.some(a=>a.id===id&&a.stage==='cancelled'));assert.ok(!d.barriers.some(b=>b.patient===p.id));
 careAction(d,{action:'restore_patient',payload:{id:p.id}},actor);assert.equal(p.archived,false);assert.equal(p.verified,false);assert.equal(p.consent,false);
});
test('patient removal requires coordinator access and blocks underway journeys',()=>{
 const d=planned(),a=d.assignments[0];assert.throws(()=>careAction(d,{action:'archive_patient',payload:{id:a.patient}},{role:'patient',entity:a.patient,label:'Patient'}),/Admin access/);run(d,'transition',{id:a.id,stage:'accepted'});run(d,'transition',{id:a.id,stage:'transport_confirmed'});run(d,'advance',{now:a.pickup});run(d,'transition',{id:a.id,stage:'departed'});assert.throws(()=>careAction(d,{action:'archive_patient',payload:{id:a.patient}},actor),/underway/);
});
test('a completed previous episode does not block a new request for the same patient',()=>{
 const d=seed();d.patients=[d.patients[1]];const p=d.patients[0],o=enumerate(d,p)[0];careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);const old=d.assignments[0];old.stage='completed';p.episode='NEW-REQUEST';
 const r=solve(d);assert.ok(r.assignments.some(a=>a.patient===p.id&&a.stage==='proposed'&&a.episode==='NEW-REQUEST'));const next=r.assignments.find(a=>a.stage==='proposed')!;careAction(d,{action:'approve_plan',payload:{selections:[next]}},actor);assert.ok(d.assignments.some(a=>a.id===old.id&&a.stage==='completed'));assert.equal(d.assignments.filter(a=>a.stage==='proposed'&&a.adminApprovedAt).length,1);
});

function requested(kind:'treatment'|'transport'|'both'='both'){
 const d=seed();d.patients=d.patients.slice(1,2);const p=d.patients[0];Object.assign(p,{memberApproved:true,requestActive:true,requestKind:kind,requestDate:d.date,preferredTime:600,timeZone:'Asia/Kolkata',verified:true,location:{lat:13,lng:80},destination:{lat:13.01,lng:80.01},destinationAddress:'Confirmed appointment address',destinationName:'Existing clinic',wheelchair:false,occupiedWheelchair:false,transportNeed:'car',assistance:false,caregiver:false,earliest:540,deadline:1140,duration:180});d.facilities.forEach((f,i)=>Object.assign(f,{location:{lat:13+i*.02,lng:80},verifiedAt:d.now}));d.vehicles.forEach((v,i)=>Object.assign(v,{location:{lat:13+i*.01,lng:80},date:d.date,timeZone:'Asia/Kolkata'}));return {d,p};
}
test('membership alone never enters matching or unresolved queue',()=>{const {d,p}=requested();p.requestActive=false;replan(d);assert.equal(d.assignments.length,0);assert.equal(d.barriers.length,0);p.requestActive=true;p.memberApproved=false;assert.equal(enumerate(d,p).length,0);});
test('treatment-only reserves a staffed machine with no transport',()=>{const {d,p}=requested('treatment');d.vehicles=[];replan(d);assert.equal(d.assignments.length,1);assert.equal(d.assignments[0].vehicle,'');assert.equal(d.assignments[0].fare,0);assert.equal(violations(d,d.assignments).length,0);});
test('transport-only requires a destination and reserves no machine',()=>{const {d,p}=requested('transport');d.facilities=[];d.slots=[];replan(d);assert.equal(d.assignments.length,1);assert.equal(d.assignments[0].slot,`transport:${p.id}`);assert.equal(d.assignments[0].duration,0);assert.equal(violations(d,d.assignments).length,0);delete p.destination;assert.equal(enumerate(d,p).length,0);});
test('both services require both resources',()=>{const {d,p}=requested('both');d.vehicles=[];assert.equal(enumerate(d,p).length,0);});
test('dated requests cannot use another day of capacity',()=>{const {d,p}=requested('treatment');p.requestDate='2026-10-18';assert.equal(enumerate(d,p).length,0);d.slots.forEach(s=>s.date=p.requestDate);assert.ok(enumerate(d,p).length>0);d.slots.forEach(s=>s.timeZone='Europe/London');assert.equal(enumerate(d,p).length,0);});
test('preferred start is fitted inside reported availability then nearest centre ranks first',()=>{const {d,p}=requested('treatment');p.preferredTime=630;const options=enumerate(d,p);assert.equal(options[0].start,630);assert.equal(d.slots.find(s=>s.id===options[0].slot)?.facility,'F1');});
test('manual choices use the same eligibility and cannot double reserve',async()=>{const {careAction}=await import('../lib/care-team');const {d,p}=requested('treatment');const original=JSON.stringify(d);const result=careAction(d,{action:'options',payload:{id:p.id}},actor);assert.equal(JSON.stringify(d),original);assert.ok(result.options!.length>0);const o=result.options![0];careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);assert.throws(()=>careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor));assert.equal(violations(d,d.assignments).length,0);});
test('transport-only driver confirmation and trip milestones omit hospital acceptance',()=>{const {d,p}=requested('transport');replan(d);const a=d.assignments[0];a.adminApprovedAt=Date.now();const driver={role:'transport' as const,entity:a.vehicle,label:'Test driver'};command({type:'transition',payload:{id:a.id,stage:'transport_confirmed'}},d,driver);d.now=a.tripStart;command({type:'transition',payload:{id:a.id,stage:'departed'}},d,driver);d.now=a.arrival;command({type:'transition',payload:{id:a.id,stage:'arrived'}},d,driver);command({type:'transition',payload:{id:a.id,stage:'completed'}},d,driver);assert.equal(a.stage,'completed');});
test('treatment-only centre acceptance and check-in omit driver confirmation',()=>{const {d}=requested('treatment');replan(d);const a=d.assignments[0];a.adminApprovedAt=Date.now();const facility={role:'facility' as const,entity:d.slots.find(s=>s.id===a.slot)!.facility,label:'Test centre'};command({type:'transition',payload:{id:a.id,stage:'accepted'}},d,facility);d.now=a.arrival;command({type:'transition',payload:{id:a.id,stage:'arrived'}},d,facility);d.now=a.start!;command({type:'transition',payload:{id:a.id,stage:'treatment_started'}},d,facility);d.now+=a.duration;command({type:'transition',payload:{id:a.id,stage:'completed'}},d,facility);assert.equal(a.stage,'completed');});

test('equivalent timezone aliases do not hide available resources',()=>{const {d,p}=requested('treatment');p.timeZone='Asia/Calcutta';d.slots.forEach(s=>s.timeZone='Asia/Kolkata');assert.ok(enumerate(d,p).length>0);});

test('a machine availability window can host non-overlapping requested times',()=>{const {d,p}=requested('treatment');d.slots=d.slots.slice(0,1);d.slots[0].end=1140;const first=enumerate(d,p)[0];const secondPatient={...p,id:'SECOND',preferredTime:870,earliest:870};d.patients.push(secondPatient);const second=enumerate(d,secondPatient)[0];assert.ok(second);assert.equal(conflicts(d,first,second),false);});

test('registered proposals require admin approval before provider confirmation',()=>{for(const kind of ['treatment','transport'] as const){const {d}=requested(kind);replan(d);const a=d.assignments[0];assert.throws(()=>command({type:'transition',payload:{id:a.id,stage:kind==='treatment'?'accepted':'transport_confirmed'}},d,actor),/Admin approval/);}});
test('manual approval retains the chosen later start and avoids an occupied machine',()=>{const {d,p}=requested('treatment');d.slots=d.slots.slice(0,1);d.slots[0].end=1140;careAction(d,{action:'approve_plan',payload:{selections:[enumerate(d,p)[0]]}},actor);const second={...p,id:'LATER'};d.patients.push(second);const choices=careAction(d,{action:'options',payload:{id:second.id}},actor).options!;assert.ok(choices.length);assert.ok(choices[0].start!>=810);careAction(d,{action:'approve_plan',payload:{selections:[choices[0]]}},actor);assert.equal(d.assignments.find(a=>a.patient===second.id)!.start,choices[0].start);assert.equal(violations(d,d.assignments).length,0);});

function demoRequest(kind:'treatment'|'transport'|'both'='both'){
 const {d,p}=requested(kind);d.facilities=[];d.slots=[];d.vehicles=[];p.home='unassigned';p.episode='DEMO-EPISODE';p.location={lat:10.90262,lng:76.90489};p.destination={lat:10.91,lng:76.91};return {d,p};
}
test('admin demo setup supplies nearby dated resources and is idempotent',()=>{const {d,p}=demoRequest();const before=JSON.stringify(p);loadDemoProviders(d,p.id,actor);assert.equal(d.facilities.length,3);assert.equal(d.slots.length,6);assert.equal(d.vehicles.length,3);assert.deepEqual(d.vehicles.map(v=>v.type),['car','wheelchair','medical']);assert.ok(d.facilities.every(f=>f.demo&&distance(p.location!,f.location!)<8));assert.ok(d.slots.every(s=>s.date===p.requestDate));loadDemoProviders(d,p.id,actor);assert.equal(d.facilities.length,3);assert.equal(d.vehicles.length,3);assert.equal(p.verified,JSON.parse(before).verified);});
test('demo setup enables both manual approval and automatic matching for all three service kinds',()=>{for(const kind of ['treatment','transport','both'] as const){const {d,p}=demoRequest(kind);loadDemoProviders(d,p.id,actor);const options=careAction(d,{action:'options',payload:{id:p.id}},actor).options!;assert.ok(options.length);assert.ok(solve(d).assignments.length);careAction(d,{action:'approve_plan',payload:{selections:[options[0]]}},actor);assert.equal(d.assignments.filter(a=>a.adminApprovedAt).length,1);assert.equal(violations(d,d.assignments).length,0);if(kind==='treatment')assert.equal(options[0].vehicle,'');if(kind==='transport')assert.ok(options[0].slot.startsWith('transport:'));}});
test('demo resources cannot silently match another patient or a new episode',()=>{const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);const real={...p,id:'REAL-PATIENT',demoEpisode:undefined};d.patients.push(real);assert.equal(enumerate(d,real).length,0);p.episode='NEXT-APPOINTMENT';assert.equal(enumerate(d,p).length,0);});
test('demo setup does not bypass membership, clinical review, dates, budget or resource collisions',()=>{const {d,p}=demoRequest();p.memberApproved=false;assert.throws(()=>loadDemoProviders(d,p.id,actor));p.memberApproved=true;p.verified=false;loadDemoProviders(d,p.id,actor);assert.equal(enumerate(d,p).length,0);p.verified=true;p.transportNeed='wheelchair';p.occupiedWheelchair=true;p.budget=0;const choices=enumerate(d,p);assert.ok(choices.length);assert.ok(choices.every(o=>d.vehicles.find(v=>v.id===o.vehicle)!.wheelchairSpace));careAction(d,{action:'approve_plan',payload:{selections:[choices[0]]}},actor);assert.throws(()=>careAction(d,{action:'approve_plan',payload:{selections:[choices[0]]}},actor));d.slots.forEach(s=>s.date='2099-01-01');assert.equal(enumerate(d,p).length,0);});
test('refreshing demo resources preserves closures and all approved bookings',()=>{const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);careAction(d,{action:'approve_plan',payload:{selections:[enumerate(d,p)[0]]}},actor);const bookings=JSON.stringify(d.assignments);d.facilities[2].open=false;loadDemoProviders(d,p.id,actor);assert.equal(d.facilities[2].open,false);assert.equal(JSON.stringify(d.assignments),bookings);});
test('demo loading is admin-only and requires an active request with a pickup pin',()=>{const {d,p}=demoRequest();assert.throws(()=>loadDemoProviders(d,p.id,{role:'patient',entity:p.id,label:'Patient'}),/Admin access/);delete p.location;assert.throws(()=>loadDemoProviders(d,p.id,actor),/map pin/);p.location={lat:10,lng:76};p.requestActive=false;assert.throws(()=>loadDemoProviders(d,p.id,actor),/submitted appointment/);});
test('worldwide demo pins and local timezone match without Chennai assumptions',()=>{for(const [lat,lng,zone] of [[51.5,-0.12,'Europe/London'],[40.7,-74,'America/New_York'],[-33.9,151.2,'Australia/Sydney'],[89.99,179.99,'UTC']] as const){const {d,p}=demoRequest('treatment');p.location={lat,lng};p.timeZone=zone;loadDemoProviders(d,p.id,actor);assert.ok(enumerate(d,p).length);assert.ok(d.facilities.every(f=>Math.abs(f.location!.lng)<=180&&distance(p.location!,f.location!)<8));}});
test('demo provider creation leaves existing providers and profiles untouched',()=>{const {d,p}=requested();p.episode='DEMO-EPISODE';const providers=JSON.stringify({f:d.facilities,v:d.vehicles,s:d.slots});loadDemoProviders(d,p.id,actor);assert.equal(JSON.stringify({f:d.facilities.filter(f=>!f.demo),v:d.vehicles.filter(v=>!v.demo),s:d.slots.filter(s=>!s.id.startsWith('DEMO:'))}),providers);});
test('a demo appointment never reserves existing real providers',()=>{const {d,p}=requested();p.episode='SIMULATED';loadDemoProviders(d,p.id,actor);const choices=enumerate(d,p);assert.ok(choices.length);assert.ok(choices.every(o=>o.slot.startsWith('DEMO:')&&o.vehicle.startsWith('DEMO:')));});
test('requests sharing a pickup and service day reuse the same finite demo resources',()=>{const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);const second={...p,id:'DEMO-SECOND',episode:'SECOND',demoEpisode:undefined};d.patients.push(second);loadDemoProviders(d,second.id,actor);assert.equal(d.facilities.length,3);assert.equal(d.vehicles.length,3);assert.ok(enumerate(d,second).length);});

test('expired appointment explains the real blocker in verification, demo loading and both matching paths',()=>{
 const {d,p}=demoRequest();p.requestDate='2026-10-12';d.date='2026-10-18';
 assert.match(requestTimeProblem(d,p)!,/2026-10-12.*passed/);
 for(const action of ['verify','load_demo_providers','options','suggest_patient'])assert.throws(()=>careAction(d,{action,payload:{id:p.id}},actor),/passed/);
 assert.equal(solve(d).barriers[0].code,'request_time');assert.equal(d.facilities.length,0);
});

test('patient-agreed rescheduling recovers an expired request through manual and automatic assignment',()=>{
 for(const kind of ['both','treatment','transport'] as const)for(const automatic of [false,true]){
  const {d,p}=demoRequest(kind);d.date='2026-10-18';p.requestDate='2026-10-12';
  const original=p.episode;
  careAction(d,{action:'reschedule_request',payload:{id:p.id,date:'2026-10-19',earliest:600,preferredTime:660,deadline:1140,patientAgreed:true}},actor);
  assert.notEqual(p.episode,original);assert.equal(p.verified,false);assert.equal(p.demoEpisode,undefined);assert.equal(requestTimeProblem(d,p),null);
  careAction(d,{action:'load_demo_providers',payload:{id:p.id}},actor);
  careAction(d,{action:'verify',payload:{id:p.id}},actor);
  const choices=automatic?solve(d).assignments:careAction(d,{action:'options',payload:{id:p.id}},actor).options!;
  assert.ok(choices.length);careAction(d,{action:'approve_plan',payload:{selections:[choices[0]]}},actor);
  const approved=d.assignments.find(a=>a.adminApprovedAt)!;
  assert.equal(approved.date,'2026-10-19');assert.equal(approved.episode,p.episode);assert.equal(violations(d,d.assignments).length,0);
 }
});

test('rescheduling requires agreement, valid timing and an active approved member',()=>{
 const {d,p}=demoRequest();const payload={id:p.id,date:'2026-10-19',earliest:600,preferredTime:660,deadline:1140,patientAgreed:true};
 assert.throws(()=>careAction(d,{action:'reschedule_request',payload:{...payload,patientAgreed:false}},actor));
 assert.throws(()=>careAction(d,{action:'reschedule_request',payload:{...payload,date:'2026-10-12'}},actor),/future/);
 assert.throws(()=>careAction(d,{action:'reschedule_request',payload:{...payload,deadline:700}},actor),/fit/);
 assert.throws(()=>careAction(d,{action:'reschedule_request',payload}, {role:'patient',entity:p.id,label:'Patient'}),/Admin/);
 p.memberApproved=false;assert.throws(()=>careAction(d,{action:'reschedule_request',payload},actor),/approved/);
});

test('rescheduling retains old history and cancels unstarted reservations without reusing demo consent',()=>{
 const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);careAction(d,{action:'approve_plan',payload:{selections:[enumerate(d,p)[0]]}},actor);
 const old=d.assignments.find(a=>a.adminApprovedAt)!;
 careAction(d,{action:'reschedule_request',payload:{id:p.id,date:'2026-10-19',earliest:600,preferredTime:660,deadline:1140,patientAgreed:true}},actor);
 assert.equal(old.stage,'cancelled');assert.equal(d.assignments.some(a=>a.id===old.id),true);assert.equal(p.demoEpisode,undefined);
 assert.ok(d.audit.some(a=>a.text.includes('patient-agreed request rescheduled')));
});

test('underway arrangements cannot be silently rescheduled',()=>{
 const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);careAction(d,{action:'approve_plan',payload:{selections:[enumerate(d,p)[0]]}},actor);
 d.assignments[0].stage='departed';
 assert.throws(()=>careAction(d,{action:'reschedule_request',payload:{id:p.id,date:'2026-10-19',earliest:600,preferredTime:660,deadline:1140,patientAgreed:true}},actor),/underway/);
});

test('expired window and date checks respect the appointment timezone',()=>{
 const {d,p}=demoRequest();d.currentTimeMs=Date.parse('2026-10-18T01:00:00Z');p.requestDate='2026-10-17';p.deadline=1439;p.timeZone='America/Los_Angeles';assert.equal(requestTimeProblem(d,p),null);
 p.timeZone='Asia/Kolkata';assert.match(requestTimeProblem(d,p)!,/passed/);p.requestDate='2026-10-18';p.earliest=60;p.duration=60;p.deadline=120;assert.match(requestTimeProblem(d,p)!,/window.*elapsed/);
});

function patientJourney(kind:'treatment'|'transport'|'both'='both'){
 const {d,p}=demoRequest(kind);loadDemoProviders(d,p.id,actor);careAction(d,{action:'approve_plan',payload:{selections:[enumerate(d,p)[0]]}},actor);
 const a=d.assignments.find(a=>a.adminApprovedAt)!;
 if(kind!=='transport')run(d,'transition',{id:a.id,stage:'accepted'});
 if(kind!=='treatment')run(d,'transition',{id:a.id,stage:'transport_confirmed'});
 const owner:Actor={role:'patient',entity:p.id,label:'Patient owner'};
 return {d,p,a,owner};
}
test('patients close treatment, transport and combined episodes in order and retain snapshots',()=>{
 for(const kind of ['treatment','transport','both'] as const){
  const {d,p,a,owner}=patientJourney(kind);
  for(const stage of (kind==='transport'?['departed','arrived','completed']:kind==='treatment'?['arrived','treatment_started','completed']:['departed','arrived','treatment_started','completed']))command({type:'patient_progress',payload:{id:a.id,stage,confirmed:true}},d,owner);
  assert.equal(a.stage,'completed');assert.equal(p.requestActive,false);assert.ok(a.completion?.completedAt);assert.equal(a.completion?.patientName,p.name);
  const before=JSON.stringify(a.completion);p.name='Updated name';p.requestNote='A later request';p.episode='LATER';p.requestActive=true;replan(d);
  assert.equal(JSON.stringify(d.assignments.find(x=>x.id===a.id)!.completion),before);
 }
});
test('patient progress forbids forged confirmations, skipping, replay and another patient',()=>{
 const {d,p,a,owner}=patientJourney();
 for(const stage of ['accepted','transport_confirmed','arrived','completed'])assert.throws(()=>command({type:'patient_progress',payload:{id:a.id,stage,confirmed:true}},d,owner));
 assert.throws(()=>command({type:'patient_progress',payload:{id:a.id,stage:'departed',confirmed:true}},d,{...owner,entity:'SOMEONE-ELSE'}),/Only the patient/);
 assert.throws(()=>command({type:'patient_progress',payload:{id:a.id,stage:'departed',confirmed:false}},d,owner));
 command({type:'patient_progress',payload:{id:a.id,stage:'departed',confirmed:true}},d,owner);
 assert.throws(()=>command({type:'patient_progress',payload:{id:a.id,stage:'departed',confirmed:true}},d,owner),/order/);
 p.episode='NEW-EPISODE';assert.throws(()=>command({type:'patient_progress',payload:{id:a.id,stage:'arrived',confirmed:true}},d,owner),/current approved/);
});
test('real patient progress enforces appointment date and elapsed treatment duration',()=>{
 const {d,p,a,owner}=patientJourney('treatment');d.facilities.forEach(f=>f.demo=false);p.requestDate=a.date='2026-10-20';d.date='2026-10-18';
 assert.throws(()=>command({type:'patient_progress',payload:{id:a.id,stage:'arrived',confirmed:true}},d,owner),/appointment date/);
 d.date='2026-10-20';d.now=a.start!;
 command({type:'patient_progress',payload:{id:a.id,stage:'arrived',confirmed:true}},d,owner);
 command({type:'patient_progress',payload:{id:a.id,stage:'treatment_started',confirmed:true}},d,owner);
 assert.throws(()=>command({type:'patient_progress',payload:{id:a.id,stage:'completed',confirmed:true}},d,owner),/duration/);
 d.now=a.start!+a.duration;command({type:'patient_progress',payload:{id:a.id,stage:'completed',confirmed:true}},d,owner);assert.equal(p.requestActive,false);
});
test('support conversations preserve messages, unread state, replies and resolution',()=>{
 const {d,p}=demoRequest();const owner:Actor={role:'patient',entity:p.id,label:'Patient'};
 command({type:'support_create',payload:{subject:'Appointment help',text:'Please help with pickup.'}},d,owner);
 const t=d.supportThreads![0];assert.equal(t.patient,p.id);assert.equal(t.adminReadAt,0);assert.equal(t.messages.length,1);
 command({type:'support_reply',payload:{id:t.id,text:'We will check your pickup.'}},d,actor);assert.equal(t.messages[1].sender,'coordinator');
 command({type:'support_status',payload:{id:t.id,status:'closed'}},d,actor);assert.equal(t.status,'closed');
 command({type:'support_reply',payload:{id:t.id,text:'Thank you. One more question.'}},d,owner);assert.equal(t.status,'open');assert.equal(t.messages.length,3);
 const count=t.messages.length;command({type:'support_read',payload:{id:t.id}},d,actor);assert.equal(t.messages.length,count);assert.ok(t.adminReadAt>=t.updatedAt);
});
test('support permissions prevent cross-patient reads, replies and provider access',()=>{
 const {d,p}=demoRequest();const owner:Actor={role:'patient',entity:p.id,label:'Patient'};command({type:'support_create',payload:{subject:'Private message',text:'Patient question'}},d,owner);const t=d.supportThreads![0];
 for(const type of ['support_read','support_reply','support_status'])assert.throws(()=>command({type,payload:{id:t.id,text:'Read this',status:'closed'}},d,{...owner,entity:'OTHER'}),/not found/);
 assert.throws(()=>command({type:'support_status',payload:{id:t.id,status:'closed'}},d,owner),/Only the care team/);
 assert.throws(()=>command({type:'support_read',payload:{id:t.id}},d,{role:'facility',entity:'F1',label:'Hospital'}),/not found|access/);
 assert.throws(()=>command({type:'support_create',payload:{subject:'  ',text:'x'}},d,owner));
});

test('machine inventory validates counts, identifiers, date windows and slot ownership',()=>{
 const slot={machine:'D1',date:'2026-10-19',timeZone:'Asia/Kolkata',start:600,end:840,active:true,staffed:true};
 assert.throws(()=>machineSchema.parse({machineCount:2,machineIdentifiers:['D1'],machineSchedule:[slot]}));
 assert.throws(()=>machineSchema.parse({machineCount:2,machineIdentifiers:['D1','D1'],machineSchedule:[slot]}));
 assert.throws(()=>machineSchema.parse({machineCount:1,machineIdentifiers:['D1'],machineSchedule:[{...slot,machine:'UNKNOWN'}]}));
 const {d}=demoRequest();d.facilities.push({...seed().facilities[0],id:'HOSPITAL'});const facility:Actor={role:'facility',entity:'HOSPITAL',label:'Hospital'};
 const info={machineCount:1,machineIdentifiers:['D1'],machineSchedule:[slot]};saveMachineSchedule(d,info,facility);const row=d.slots.find(s=>s.facility==='HOSPITAL')!;assert.equal(row.machine,'D1');assert.equal(row.date,'2026-10-19');
 const revision=JSON.stringify(d.assignments);saveMachineSchedule(d,{...info,machineSchedule:[row]},facility);assert.equal(JSON.stringify(d.assignments),revision);
 assert.throws(()=>saveMachineSchedule(d,{...info,machineSchedule:[{...row,id:'OTHER-SLOT'}]},facility),/another hospital/);
});
test('patient-provider conversations require an approved relationship and isolate other recipients',()=>{
 const {d,p,a,owner}=patientJourney();const f=d.facilities.find(f=>f.id===d.slots.find(s=>s.id===a.slot)!.facility)!;f.demo=false;
 command({type:'support_create',payload:{subject:'Arrival question',text:'Where should I check in?',partnerRole:'facility',partnerEntity:f.id}},d,owner);
 const thread=d.supportThreads![0],hospital:Actor={role:'facility',entity:f.id,label:'Hospital'};assert.equal(thread.partner?.entity,f.id);
 command({type:'support_reply',payload:{id:thread.id,text:'Please use reception.'}},d,hospital);assert.equal(thread.messages[1].sender,'facility');
 for(const actor of [{role:'facility',entity:'WRONG',label:'Other hospital'},{role:'coordinator',entity:'admin',label:'Admin'},{role:'transport',entity:a.vehicle,label:'Driver'}] as Actor[])assert.throws(()=>command({type:'support_read',payload:{id:thread.id}},d,actor),/not found/);
 assert.throws(()=>command({type:'support_create',payload:{subject:'Unassigned hospital',text:'Hello there',partnerRole:'facility',partnerEntity:'UNKNOWN'}},d,owner),/only providers/);
});

test('a completed historical episode cannot block provider confirmation for a new dated request',()=>{
 const {d,p,a,owner}=patientJourney();for(const stage of ['departed','arrived','treatment_started','completed'])command({type:'patient_progress',payload:{id:a.id,stage,confirmed:true}},d,owner);
 p.episode='NEW-DATED-EPISODE';p.requestDate='2026-10-20';p.requestActive=true;p.verified=true;delete p.demoEpisode;loadDemoProviders(d,p.id,actor);
 const o=careAction(d,{action:'options',payload:{id:p.id}},actor).options![0];assert.ok(o);careAction(d,{action:'approve_plan',payload:{selections:[o]}},actor);
 const next=d.assignments.find(x=>x.patient===p.id&&x.episode===p.episode&&x.adminApprovedAt)!;
 run(d,'transition',{id:next.id,stage:'accepted'});run(d,'transition',{id:next.id,stage:'transport_confirmed'});assert.equal(next.stage,'transport_confirmed');assert.equal(d.assignments.find(x=>x.id===a.id)!.stage,'completed');
});


test('explicit demo preparation simulates review and enables automatic and manual matching',()=>{
 const {d,p}=demoRequest();p.verified=false;
 careAction(d,{action:'prepare_demo',payload:{ids:[p.id]}},actor);
 assert.equal(p.verified,true);assert.equal(p.demoEpisode,p.episode);
 assert.ok(d.audit.some(a=>a.text.includes('simulated requirements review')));
 const manual=careAction(d,{action:'options',payload:{id:p.id}},actor).options!;
 assert.ok(manual.length);assert.ok(manual.every(o=>o.slot.startsWith('DEMO:')&&o.vehicle.startsWith('DEMO:')));
 assert.ok(careAction(d,{action:'suggest',payload:{}},actor).preview!.assignments.some(a=>a.patient===p.id));
 careAction(d,{action:'approve_plan',payload:{selections:[manual[0]]}},actor);
 assert.ok(d.assignments.some(a=>a.patient===p.id&&a.adminApprovedAt));
});
test('demo preparation does not bypass membership, agreement or actor checks',()=>{
 const {d,p}=demoRequest();p.verified=false;p.consent=false;
 assert.throws(()=>careAction(d,{action:'prepare_demo',payload:{ids:[p.id]}},actor),/agreement/);
 assert.equal(p.verified,false);p.consent=true;p.memberApproved=false;
 assert.throws(()=>careAction(d,{action:'prepare_demo',payload:{ids:[p.id]}},actor),/approved/);
 assert.equal(p.verified,false);p.memberApproved=true;
 assert.throws(()=>careAction(d,{action:'prepare_demo',payload:{ids:[p.id]}},{role:'patient',entity:p.id,label:'Patient'}),/Admin/);
 assert.doesNotThrow(()=>careAction(d,{action:'options',payload:{id:p.id}},actor));assert.equal(p.verified,false);
});


test('completed history does not prevent verifying or editing a new episode',()=>{
 const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);
 careAction(d,{action:'approve_plan',payload:{selections:[enumerate(d,p)[0]]}},actor);
 const old=d.assignments.find(a=>a.patient===p.id)!;old.stage='completed';old.episode='previous';
 p.episode='next';p.verified=false;p.requestActive=true;
 careAction(d,{action:'verify',payload:{id:p.id,duration:180}},actor);
 assert.equal(p.verified,true);assert.equal(old.stage,'completed');assert.equal(old.episode,'previous');
});
test('actual underway journeys still block requirement edits and another manual assignment',()=>{
 const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);
 careAction(d,{action:'approve_plan',payload:{selections:[enumerate(d,p)[0]]}},actor);
 d.assignments[0].stage='departed';
 assert.throws(()=>careAction(d,{action:'verify',payload:{id:p.id,duration:210}},actor),/underway/);
 assert.throws(()=>careAction(d,{action:'options',payload:{id:p.id}},actor),/in progress/);
});
test('routine request matching automatically checks fields without claiming clinical review',()=>{
 const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);p.verified=false;
 const preview=careAction(d,{action:'suggest',payload:{}},actor).preview!;
 assert.ok(preview.assignments.some(a=>a.patient===p.id));assert.equal(p.verified,false);assert.equal(p.operationalCheck,undefined);
 const choices=careAction(d,{action:'options',payload:{id:p.id}},actor).options!;
 assert.ok(choices.length);assert.equal(p.verified,false);
 careAction(d,{action:'approve_plan',payload:{selections:[choices[0]]}},actor);
 assert.ok(d.assignments.some(a=>a.patient===p.id&&a.adminApprovedAt));assert.equal(p.verified,false);
 p.duration=480;assert.equal(enumerate(d,p).length,0);
});
test('automatic checks flag clinical exceptions and never invent agreement or membership',()=>{
 for(const change of [{urgency:3},{capability:'isolation'},{transportNeed:'medical'}]){
  const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);p.verified=false;Object.assign(p,change);
  assert.throws(()=>careAction(d,{action:'options',payload:{id:p.id}},actor),/Staff review/);
  const preview=careAction(d,{action:'suggest',payload:{}},actor).preview!;assert.equal(preview.assignments.some(a=>a.patient===p.id),false);
 }
 for(const change of [{consent:false},{memberApproved:false},{location:undefined},{requestDate:undefined}]){
  const {d,p}=demoRequest();loadDemoProviders(d,p.id,actor);p.verified=false;Object.assign(p,change);
  assert.throws(()=>careAction(d,{action:'options',payload:{id:p.id}},actor));
 }
});


test('real report freshness uses elapsed time across midnight and rejects missing/future timestamps',()=>{
 const d=seed();d.currentTimeMs=Date.parse('2026-10-24T00:30:00Z');const f=d.facilities[0];f.verifiedAt=480;
 f.reportedAt=d.currentTimeMs-7*86400000;assert.equal(fresh(d,f),false);
 f.reportedAt=d.currentTimeMs-30*60000;d.now=30;assert.equal(fresh(d,f),true);
 f.reportedAt=d.currentTimeMs-121*60000;assert.equal(fresh(d,f),false);
 f.reportedAt=d.currentTimeMs+1;assert.equal(fresh(d,f),false);
 delete f.reportedAt;assert.equal(fresh(d,f),false);
 f.demo=true;d.now=500;assert.equal(fresh(d,f),true);
});
test('same machine and staffing cannot be double-booked through different timezones',()=>{
 const {d,p}=requested('treatment');p.timeZone='UTC';p.duration=60;p.earliest=600;p.preferredTime=600;
 const q={...p,id:'OTHER-ZONE',timeZone:'Asia/Kolkata',earliest:930,preferredTime:930};d.patients.push(q);d.facilities=d.facilities.slice(0,1);const f=d.facilities[0];
 d.slots=[{id:'UTC',facility:f.id,machine:'SAME',start:600,end:720,date:d.date,timeZone:'UTC',active:true,staffed:true},{id:'IST',facility:f.id,machine:'SAME',start:930,end:1050,date:d.date,timeZone:'Asia/Kolkata',active:true,staffed:true}];
 const a=enumerate(d,p)[0],b=enumerate(d,q)[0];assert.ok(a&&b);assert.equal(conflicts(d,a,b),true);assert.equal(solve(d).assignments.length,1);
 d.slots[1].machine='OTHER-MACHINE';f.staffCapacity=1;assert.equal(solve(d).assignments.length,1);f.staffCapacity=2;assert.equal(solve(d).assignments.length,2);
});
test('vehicle intervals compare absolute times even across local calendar dates',()=>{
 const {d,p}=requested('transport');const a=enumerate(d,p)[0];
 const first={...a,patient:'A',date:'2026-10-24',timeZone:'UTC',tripStart:1380,tripEnd:1430};
 const second={...a,patient:'B',date:'2026-10-25',timeZone:'Asia/Kolkata',tripStart:270,tripEnd:320};
 assert.equal(conflicts(d,first,second),true);second.tripStart=320;second.tripEnd=350;assert.equal(conflicts(d,first,second),false);
});
test('wall-clock conversion handles DST and rejects nonexistent local times',()=>{
 assert.equal(serviceInstant('2026-10-24','Asia/Kolkata',930),Date.parse('2026-10-24T10:00:00Z'));
 assert.equal(serviceInstant('2026-03-08','America/New_York',150),null);
 assert.equal(serviceInstant('2026-07-01','America/New_York',600),Date.parse('2026-07-01T14:00:00Z'));
});
test('closed historical providers cannot read current patient fields or create a new relationship',()=>{
 for(const stage of ['cancelled','expired','rejected','completed'] as const){
  const {d,p}=requested();const o=enumerate(d,p)[0];p.episode='NEW';p.requestNote='PRIVATE NEW REQUEST';
  const a={...o,id:'HISTORY',episode:'OLD',stage,adminApprovedAt:1,patientAgreed:true,expires:1,history:[]};d.assignments=[a];
  const facility=d.slots.find(s=>s.id===a.slot)!.facility;
  for(const viewer of [{role:'facility' as const,entity:facility},{role:'transport' as const,entity:a.vehicle}]){
   const visible=scopedDistrict(d,viewer);assert.equal(visible.patients.length,0);assert.equal(visible.assignments.length,1);assert.equal(JSON.stringify(visible).includes('PRIVATE NEW REQUEST'),false);
   assert.equal(canMessagePartner(d,p.id,viewer.role,viewer.entity),false);
  }
 }
});
test('active provider handovers preserve authorized details and strip operational metadata',()=>{
 const {d,p}=requested();p.episode='CURRENT';const o=enumerate(d,p)[0];d.assignments=[{...o,id:'ACTIVE',episode:p.episode,stage:'accepted',adminApprovedAt:1,patientAgreed:true,expires:900,history:[]}];
 p.operationalCheck='PRIVATE FINGERPRINT';p.requestNote='PRIVATE CLINICAL NOTE';const driver=scopedDistrict(d,{role:'transport',entity:o.vehicle});
 assert.equal(driver.patients.length,1);assert.equal(driver.patients[0].name,p.name);assert.equal(driver.patients[0].location,p.location);assert.equal(driver.patients[0].duration,0);
 assert.equal(JSON.stringify(driver).includes('PRIVATE'),false);assert.equal('operationalCheck' in driver.patients[0],false);assert.equal('requestNote' in transportPatient(p),false);
 const hospital=scopedDistrict(d,{role:'facility',entity:d.slots.find(s=>s.id===o.slot)!.facility});assert.equal(hospital.patients[0].requestNote,p.requestNote);assert.equal(hospital.patients[0].operationalCheck,undefined);
});


test('864 service/accessibility/priority/capability/consent/freshness permutations preserve eligibility',()=>{
 let cases=0;
 for(const kind of ['treatment','transport','both'] as const)for(const transportNeed of ['car','wheelchair','medical'] as const)for(const occupiedWheelchair of [false,true])for(const caregiver of [false,true])for(const urgency of [1,2,3])for(const capability of ['standard','isolation'])for(const consent of [false,true])for(const stale of [false,true]){
  const {d,p}=requested(kind);Object.assign(p,{transportNeed,occupiedWheelchair,caregiver,urgency,capability,consent});
  if(stale)d.facilities.forEach(f=>f.verifiedAt=null);
  const choices=enumerate(d,p);cases++;
  if(!consent||stale&&kind!=='transport')assert.equal(choices.length,0);
  for(const o of choices){
   if(kind==='treatment'){assert.equal(o.vehicle,'');assert.equal(o.fare,0);}else{const v=d.vehicles.find(v=>v.id===o.vehicle)!;assert.ok(v.active&&v.confirmed);if(occupiedWheelchair||transportNeed==='wheelchair')assert.equal(v.wheelchairSpace,true);if(transportNeed==='medical')assert.equal(v.type,'medical');assert.ok(v.cost<=p.budget);assert.ok(v.seats>=(caregiver?2:1));}
   if(kind!=='transport'){const slot=d.slots.find(s=>s.id===o.slot)!,facility=d.facilities.find(f=>f.id===slot.facility)!;assert.ok(facility.capabilities.includes(capability));assert.ok(o.start!>=p.earliest&&o.start!+p.duration<=p.deadline);}
  }
 }
 assert.equal(cases,864);
});
