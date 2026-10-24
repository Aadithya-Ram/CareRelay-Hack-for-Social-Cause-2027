import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,type Patient} from '../lib/domain';
import {enumerate} from '../lib/solver';
import {loadDemoProviders} from '../lib/demo-providers';
import {careAction} from '../lib/care-team';
import {manualHospitals,manualSlots,manualVehicles,manualSlotKey,manualOptionKey} from '../lib/manual-picker';

const admin={role:'coordinator' as const,entity:'operator',label:'Manual picker audit'};
function fixture(kind:Patient['requestKind']='both'){
  const d=seed();d.date='2026-10-18';d.now=480;d.facilities=[];d.slots=[];d.vehicles=[];d.assignments=[];
  const p:Patient={...d.patients[0],id:'MANUAL-TEST',name:'Fictional Manual Picker Patient',home:'unassigned',memberApproved:true,requestActive:true,requestKind:kind,requestDate:'2026-10-19',timeZone:'Asia/Kolkata',preferredTime:600,earliest:600,deadline:1140,duration:180,urgency:1,capability:'standard',transportNeed:'car',occupiedWheelchair:false,wheelchair:false,assistance:false,caregiver:false,budget:1500,consent:true,verified:true,episode:'MANUAL-EPISODE',requiresLocation:true,location:{lat:13.05,lng:80.25},city:'Fictional Test City',destination:{lat:13.09,lng:80.26},destinationName:'Fictional Existing Appointment',destinationAddress:'Fictional destination address'};
  d.patients=[p];loadDemoProviders(d,p.id,admin);return {d,p,options:enumerate(d,p)};
}

test('hospital picker groups eligible candidates once and preserves best-fit order',()=>{
  const {d,p,options}=fixture();const hospitals=manualHospitals(d,options);
  assert.equal(hospitals.length,3);assert.equal(new Set(hospitals.map(x=>x.facility.id)).size,3);
  assert.equal(hospitals[0].facility.id,d.slots.find(s=>s.id===options[0].slot)!.facility);
  assert.ok(hospitals[0].facility.name.includes('Riverside'));
  for(const h of hospitals){assert.ok(h.slotCount>0);assert.ok(h.options.every(o=>d.slots.find(s=>s.id===o.slot)!.facility===h.facility.id));assert.ok(h.options.every(o=>o.patient===p.id));}
});

test('slot popup preserves selected hospital, machine and start time without duplicate vehicles',()=>{
  const {d,options}=fixture();const h=manualHospitals(d,options)[1],slots=manualSlots(d,options,h.facility.id);
  assert.equal(slots.length,h.slotCount);assert.equal(new Set(slots.map(s=>s.key)).size,slots.length);
  for(const slot of slots){assert.equal(slot.slot.facility,h.facility.id);assert.ok(slot.options.every(o=>manualSlotKey(d,o)===slot.key));}
  assert.equal(Math.min(...slots.map(s=>Math.abs(s.start-600))),Math.abs(slots[0].start-600));
});

test('vehicle choices contain only candidates eligible for the selected slot and sort by pickup access',()=>{
  const {d,p,options}=fixture();const h=manualHospitals(d,options)[0],slot=manualSlots(d,options,h.facility.id)[0],vehicles=manualVehicles(d,p,slot.options);
  assert.equal(vehicles.length,3);
  assert.ok(vehicles.every(x=>slot.options.some(o=>manualOptionKey(o)===manualOptionKey(x.option))));
  assert.ok(vehicles.every(x=>x.km!=null&&x.km>0&&x.option.accessMinutes!>0));
  assert.ok(vehicles.every((x,i)=>i===0||x.option.accessMinutes!>=vehicles[i-1].option.accessMinutes!));
  assert.ok(vehicles.every(x=>x.option.arrival<=slot.start));
});

test('treatment-only selection requires no transport and transport-only selection requires no hospital',()=>{
  const treatment=fixture('treatment');assert.ok(treatment.options.length>0);assert.equal(manualHospitals(treatment.d,treatment.options).length,3);assert.equal(manualVehicles(treatment.d,treatment.p,treatment.options).length,0);
  const transport=fixture('transport');assert.ok(transport.options.length>0);assert.equal(manualHospitals(transport.d,transport.options).length,0);assert.equal(manualVehicles(transport.d,transport.p,transport.options).length,3);
});

test('selected manual hospital, slot and vehicle persist exactly on approval',()=>{
  const {d,p,options}=fixture();const h=manualHospitals(d,options)[1],slot=manualSlots(d,options,h.facility.id)[1],selected=manualVehicles(d,p,slot.options)[1].option;
  careAction(d,{action:'approve_plan',payload:{selections:[{patient:selected.patient,slot:selected.slot,vehicle:selected.vehicle,start:selected.start}]}},admin);
  const saved=d.assignments.find(a=>a.adminApprovedAt)!;
  assert.equal(saved.slot,selected.slot);assert.equal(saved.start,selected.start);assert.equal(saved.vehicle,selected.vehicle);assert.equal(saved.stage,'proposed');assert.equal(saved.patient,p.id);
});

test('approval rejects a slot that was withdrawn after the picker opened',()=>{
  const {d,options}=fixture();const selected=options[0];d.slots.find(s=>s.id===selected.slot)!.active=false;
  assert.throws(()=>careAction(d,{action:'approve_plan',payload:{selections:[selected]}},admin),/Resources changed|conflict/);assert.equal(d.assignments.length,0);
});

test('approval rejects a vehicle that became unavailable after the picker opened',()=>{
  const {d,options}=fixture();const selected=options[0];d.vehicles.find(v=>v.id===selected.vehicle)!.active=false;
  assert.throws(()=>careAction(d,{action:'approve_plan',payload:{selections:[selected]}},admin),/Resources changed|conflict/);assert.equal(d.assignments.length,0);
});

test('empty availability produces no hospital, slots or transport choices',()=>{
  const {d,p}=fixture();assert.deepEqual(manualHospitals(d,[]),[]);assert.deepEqual(manualSlots(d,[],'unknown'),[]);assert.deepEqual(manualVehicles(d,p,[]),[]);
});

test('a hospital with the preferred time ranks before a closer hospital available only later',()=>{
  const {d,p}=fixture();const nearest=d.facilities[0];d.slots.filter(s=>s.facility===nearest.id).forEach(s=>s.start=720);
  const hospitals=manualHospitals(d,enumerate(d,p));
  assert.ok(hospitals[0].facility.name.includes('Greenfield'));assert.equal(hospitals[0].best.start,600);
  assert.ok(hospitals.findIndex(h=>h.facility.id===nearest.id)>0);
});

test('occupied-wheelchair requests never offer an unsuitable passenger car',()=>{
  const {d,p}=fixture();p.occupiedWheelchair=true;p.transportNeed='wheelchair';p.wheelchair=true;
  const options=enumerate(d,p),first=manualHospitals(d,options)[0],slot=manualSlots(d,options,first.facility.id)[0],vehicles=manualVehicles(d,p,slot.options);
  assert.ok(vehicles.length>0);assert.ok(vehicles.every(x=>x.vehicle.type!=='car'&&x.vehicle.wheelchairSpace));
});
