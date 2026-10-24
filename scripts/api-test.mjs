/* Historical October 10 demo API checks. The current account-protected API is tested by npm run test:api (scripts/security-test.mjs). */
import assert from "node:assert/strict";
const base=process.env.CARERELAY_TEST_URL??"http://127.0.0.1:5173";
const headers={"Content-Type":"application/json","oai-authenticated-user-id":"test-isolated-api"};
let checks=0;
async function get(mode="practice"){const r=await fetch(`${base}/api/district?mode=${mode}`,{headers});assert.equal(r.status,200);return r.json();}
async function post(revision,action,role="coordinator",entity="",mode="practice"){const r=await fetch(`${base}/api/district?mode=${mode}`,{method:"POST",headers,body:JSON.stringify({revision,role,entity,action})});return {status:r.status,body:await r.json()};}
let current=await get();current=(await post(current.revision,{type:"reset"})).body;
const active=await get("active");
let result=await post(current.revision,{type:"plan"});assert.equal(result.status,200);current=result.body;assert.equal(current.data.metrics.violations,0);checks++;
const old=current.revision;
const competing=await Promise.all([post(old,{type:"plan"}),post(old,{type:"plan"})]);
assert.deepEqual(competing.map(r=>r.status).sort(),[200,409]);checks++;
current=await get();const a=current.data.assignments.find(a=>a.stage==="proposed");
result=await post(current.revision,{type:"transition",payload:{id:a.id,stage:"accepted"}},"patient",a.patient);assert.equal(result.status,403);checks++;
result=await post(current.revision,{type:"transition",payload:{id:a.id,stage:"accepted"}});assert.equal(result.status,200);current=result.body;checks++;
result=await post(current.revision,{type:"transition",payload:{id:a.id,stage:"completed"}});assert.equal(result.status,409);checks++;
current=await get();const before=JSON.stringify(current);
result=await post(current.revision,{type:"intervention",payload:{kind:"vehicle"}});assert.equal(result.status,200);assert.equal(JSON.stringify(await get()),before);checks++;
result=await post(current.revision,{type:"facility",payload:{id:"F1",staffCapacity:-9}});assert.equal(result.status,400);checks++;
const malformed=await fetch(`${base}/api/district?mode=practice`,{method:"POST",headers,body:"{"});assert.equal(malformed.status,400);checks++;
const crossOrigin=await fetch(`${base}/api/district?mode=practice`,{method:"POST",headers:{...headers,Origin:"https://unrelated.example"},body:JSON.stringify({revision:current.revision,role:"coordinator",entity:"",action:{type:"plan"}})});assert.equal(crossOrigin.status,403);checks++;
assert.equal((await get("active")).revision,active.revision);assert.deepEqual((await get("active")).data,active.data);checks++;
await post(current.revision,{type:"reset"});
console.log(`PASS: ${checks} live API checks including atomic concurrent updates, validation, role scope, counterfactual isolation and practice isolation.`);
