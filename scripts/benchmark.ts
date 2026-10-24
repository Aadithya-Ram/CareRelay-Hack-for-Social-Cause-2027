import {mkdirSync,writeFileSync} from "node:fs";
import {seed,liveStages} from "../lib/domain";
import {solve,intervention,replan} from "../lib/solver";
import {command,Actor} from "../lib/commands";
const actor:Actor={role:"coordinator",entity:"",label:"Benchmark coordinator"};
const scenarios=[
  {name:"Initial district with stale Greenfield report",setup:(d:ReturnType<typeof seed>)=>d},
  {name:"All capacity verified",setup:(d:ReturnType<typeof seed>)=>{d.facilities.forEach(f=>f.verifiedAt=d.now);return d;}},
  {name:"Riverside facility closed",setup:(d:ReturnType<typeof seed>)=>{d.facilities.forEach(f=>f.verifiedAt=d.now);d.facilities[0].open=false;return d;}},
  {name:"Riverside machine M1 broken",setup:(d:ReturnType<typeof seed>)=>{d.facilities.forEach(f=>f.verifiedAt=d.now);d.slots.filter(s=>s.facility==="F1"&&s.machine==="M1").forEach(s=>s.active=false);return d;}},
  {name:"Accessible van cancellation",setup:(d:ReturnType<typeof seed>)=>{d.facilities.forEach(f=>f.verifiedAt=d.now);d.vehicles[0].active=false;return d;}},
  {name:"Fundamental capacity shortage",setup:(d:ReturnType<typeof seed>)=>{d.facilities.forEach(f=>{f.verifiedAt=d.now;f.staffCapacity=1;});return d;}},
  {name:"No operational facilities",setup:(d:ReturnType<typeof seed>)=>{d.facilities.forEach(f=>f.open=false);return d;}},
  {name:"Constructed flexible-versus-isolation scheduling case",setup:(d:ReturnType<typeof seed>)=>{
    d.patients=[{...d.patients[1],zone:1,urgency:3,deadline:900},{...d.patients[11],zone:1,urgency:1,deadline:900}];
    d.facilities=d.facilities.slice(0,2);d.facilities[0].verifiedAt=d.now;d.facilities[1].verifiedAt=d.now;d.facilities[1].zone=5;
    d.slots=[d.slots.find(s=>s.id==="F1-M1-S1")!,d.slots.find(s=>s.id==="F2-M1-S1")!];d.vehicles=d.vehicles.slice(3,5);return d;
  }},
];
const rows=scenarios.map(s=>{const d=s.setup(seed());const result=solve(d);d.assignments=result.assignments;d.metrics=result.metrics;return {scenario:s.name,...result.metrics,barriers:result.barriers.reduce((a,b)=>({...a,[b.code]:(a[b.code]??0)+1}),{} as Record<string,number>),accessibleVehicle:intervention(d,"vehicle"),verification:intervention(d,"verify")};});
const d=seed();d.facilities.forEach(f=>f.verifiedAt=d.now);replan(d);
for(const a of d.assignments.filter(a=>liveStages.includes(a.stage)).slice(0,8))command({type:"transition",payload:{id:a.id,stage:"accepted"}},d,actor);
d.vehicles[0].active=false;
const preserved=solve(structuredClone(d),true),unpreserved=solve(structuredClone(d),false);
mkdirSync("output/evidence",{recursive:true});
const evidence={generatedAt:new Date().toISOString(),dataset:"30 fictional patients, 3 facilities, 12 vehicles; scenario date 2026-10-17",algorithm:"Discrete constraint search with greedy incumbent; 180 ms search budget and 40,000 node cap; not OR-Tools",objective:"maximize feasible patients, then staff-specified urgency, then minimize cost/time",limitations:"These are model results, not clinical outcomes; simulated journeys; individual trips; no global-optimality claim for search-limited rows",rows,replanningAblation:{preserved:preserved.metrics,withoutPreservation:unpreserved.metrics}};
writeFileSync("output/evidence/benchmark.json",JSON.stringify(evidence,null,2));
writeFileSync("output/evidence/benchmark.md",`# CareRelay scenario evidence\n\nGenerated ${evidence.generatedAt}. ${evidence.dataset}.\n\n${evidence.limitations}.\n\n| Scenario | CareRelay feasible | Greedy feasible | Unresolved | Violations | Planner ms | Extra accessible vehicle |\n|---|---:|---:|---:|---:|---:|---:|\n${rows.map(r=>`| ${r.scenario} | ${r.feasible} | ${r.baseline} | ${r.unresolved} | ${r.violations} | ${r.runtimeMs} | ${r.accessibleVehicle.delta>=0?"+":""}${r.accessibleVehicle.delta} |`).join("\n")}\n\nAfter a vehicle cancellation, changed accepted commitments: ${preserved.metrics.changedCommitments} with preservation versus ${unpreserved.metrics.changedCommitments} with preservation disabled. The latter is an ablation, not a deployment recommendation.\n\nRuntime varies by host and load. Assignment counts may vary when a bounded search terminates early; stored plans are validated before commitment.\n`);
console.log(JSON.stringify(rows.map(r=>({scenario:r.scenario,feasible:r.feasible,greedy:r.baseline,violations:r.violations,vehicleDelta:r.accessibleVehicle.delta}))));
