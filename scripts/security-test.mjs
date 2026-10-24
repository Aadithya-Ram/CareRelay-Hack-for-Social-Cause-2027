import assert from 'node:assert/strict';
import {createServer} from 'node:http';
const geocodeRequests=[];const geocodeFixture=createServer((req,res)=>{if(req.url.startsWith('/reverse'))geocodeRequests.push(req.url);res.writeHead(200,{'Content-Type':'application/json'});if(req.url.startsWith('/search'))return res.end(JSON.stringify([{lat:'13.08',lon:'80.27',display_name:'Fictional Search City'}]));if(req.url.startsWith('/interpreter'))return res.end(JSON.stringify({elements:[{type:'node',id:101,lat:13.081,lon:80.27,tags:{name:'Fictional Nearby Dialysis','addr:street':'Fictional Street'}}]}));res.end(JSON.stringify({display_name:'Fictional Test Street, Test City, Test Country',address:{house_number:'12',road:'Fictional Test Street',city:'Test City',country:'Test Country'}}));});await new Promise(resolve=>geocodeFixture.listen(8791,'127.0.0.1',resolve));
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:8790',state=`.sites-runtime/security-tests/${randomUUID()}`,worker=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js'];
mkdirSync(state,{recursive:true});
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
 const sql=readFileSync(`drizzle/${file}`,'utf8');const r=spawnSync(process.execPath,[...worker,'d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to',state,'--command',sql],{stdio:'pipe'});assert.equal(r.status,0,r.stderr?.toString());
}
const server=spawn(process.execPath,[...worker,'dev','--config','dist/server/wrangler.json','--local','--persist-to',state,'--port','8790','--ip','127.0.0.1','--inspector-port','0','--var','CARERELAY_TEST_NOW:480','--var','OSM_REVERSE_URL:http://127.0.0.1:8791/reverse','--var','OSM_SEARCH_URL:http://127.0.0.1:8791/search','--var','OSM_OVERPASS_URL:http://127.0.0.1:8791/interpreter'],{stdio:'pipe'});let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
let checks=0,succeeded=false;const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
async function req(path,body,cookie='',extra={}){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{}),...extra},body:body?JSON.stringify(body):undefined});const text=await r.text();if(['/api/location','/api/facility-schedule','/api/demo','/api/nearby'].includes(path)&&r.status===503&&text.includes('worker restarted mid-request')&&!extra['X-Test-Runtime-Retry']){await new Promise(resolve=>setTimeout(resolve,1000));return req(path,body,cookie,{...extra,'X-Test-Runtime-Retry':'1'});}let data;try{data=JSON.parse(text);}catch{throw new Error(`Unexpected response from ${path}: ${r.status}. ${text.slice(0,150)}\n${logs.slice(-3500)}`);}return {r,data,cookie:r.headers.get('set-cookie')?.split(';')[0]??cookie};}
const nextFutureDate=()=>new Date(Date.now()+86400000+330*60000).toISOString().slice(0,10);
const keepUI=process.argv.includes('--keep-ui');
const password=keepUI?'Fictional-ui-only-2026!':randomUUID()+randomUUID();
async function signup(role,email){return req('/api/account',{action:'signup',data:{role,email,password,name:'Fictional Security Test'}});}
async function action(cookie,type,payload={}){const current=await req('/api/district',null,cookie);const result=await req('/api/district',{revision:current.data.revision,action:{type,payload}},cookie);assert.equal(result.r.status,200,result.data.error);checks++;return result;}
async function upload(cookie,kind,name='sample.pdf'){const form=new FormData();form.set('kind',kind);form.set('file',new Blob(['%PDF-1.4\nSample verification only\n%%EOF'],{type:'application/pdf'}),name);return fetch(base+'/api/documents',{method:'POST',headers:{Cookie:cookie,Origin:base},body:form});}
try{
 for(let n=0;n<60;n++){try{if((await fetch(base+'/api/account')).ok)break;}catch{}if(n===59)throw new Error(logs);await new Promise(r=>setTimeout(r,500));}
 // Wrangler can briefly restart after its first cold request. Verify stable readiness before mutations.
 const readinessDeadline=Date.now()+30000;
 for(let stable=0;stable<5;){if(Date.now()>readinessDeadline)throw new Error('Worker did not reach stable readiness.');await new Promise(r=>setTimeout(r,500));try{const r=await fetch(base+'/api/account');stable=r.ok?stable+1:0;}catch{stable=0;}}
 check((await req('/api/district')).r.status,401);
 check((await req('/api/district',null,'',{'oai-authenticated-user-id':'spoof'})).r.status,401);
 const admin=await signup('coordinator','operator@example.test');check(admin.r.status,201);
 check((await signup('coordinator','operator2@example.test')).r.status,403);
 check((await req('/api/account',{action:'admin_login',data:{password:'wrong-password-long'}})).r.status,401);check((await req('/api/account',{action:'admin_login',data:{password:'admin@123'}})).r.status,200);const publicTestPassword=await req('/api/account',{action:'admin_login',data:{password:'admin@123'}},'',{Host:'public.example.test',Origin:'http://public.example.test'});check(publicTestPassword.r.status===200,false);
 const adminPassword=await req('/api/account',{action:'admin_login',data:{password}});check(adminPassword.r.status,200);check(adminPassword.data.account.role,'coordinator');check((await req('/api/care-team',null,adminPassword.cookie)).r.status,200);
 check(admin.r.headers.get('set-cookie').includes('HttpOnly'),true);
 check('password' in admin.data.account,false);
 const p1=await signup('patient','one@example.test'),p2=await signup('patient','two@example.test');check(p1.r.status,201);
 check((await req('/api/account',{action:'login',data:{email:'one@example.test',password:'wrong-password-long'}})).r.status,401);
 const requestDetails={kind:'both',date:new Date(Date.now()+330*60000).toISOString().slice(0,10),timeZone:'Asia/Kolkata',preferredTime:600,earliest:600,deadline:1140,availabilityAcknowledged:true};
 const profile={phone:'9999999999',address:'Fictional Sample Address',zone:1,city:'Chennai',location:{lat:13.05,lng:80.25},wheelchair:true,occupiedWheelchair:true,assistance:true,caregiver:false,consent:true};
 check((await req('/api/account',{action:'onboard',data:profile},p1.cookie)).r.status,200);
 check((await req('/api/account',{action:'onboard',data:profile},p2.cookie)).r.status,200);
 check((await req('/api/account',null,p1.cookie)).data.account.status,'pending');check((await req('/api/district',null,p1.cookie)).r.status,403);check((await req('/api/account',{action:'request_care',data:{...requestDetails,note:'Request before membership approval'}},p1.cookie)).r.status,403);
 const membershipTeam=await req('/api/care-team',null,admin.cookie);check(membershipTeam.data.data.patients.filter(p=>p.requestActive).length,0);
 for(const patient of [p1,p2]){check((await req('/api/account',{action:'review',data:{id:patient.data.account.id,approve:true,note:'Membership registration reviewed'}},admin.cookie)).r.status,200);check((await req('/api/account',{action:'request_care',data:{...requestDetails,note:'Initial dated appointment request'}},patient.cookie)).r.status,200);}
 const nearby=await req('/api/nearby',{lat:13.08,lng:80.27},p1.cookie);check(nearby.r.status,200);check(nearby.data.centres[0].name,'Fictional Nearby Dialysis');check(nearby.data.point,{lat:13.08,lng:80.27});check(nearby.data.centres[0].mapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query='),true);check('rating' in nearby.data.centres[0],false);
 const cityNearby=await req('/api/nearby',{city:'Fictional Search City'},p1.cookie);check(cityNearby.r.status,200);check(cityNearby.data.searchLabel,'Fictional Search City');check(cityNearby.data.centres.length,1);check((await req('/api/nearby',{lat:13.08},p1.cookie)).r.status,400);check((await req('/api/nearby',{lat:100,lng:80},p1.cookie)).r.status,400);check((await req('/api/nearby',{lat:13.08,lng:80.27},p1.cookie)).data.centres[0].name,'Fictional Nearby Dialysis');
 const district=await req('/api/district',null,p1.cookie);check(district.data.data.patients.length,1);check(district.data.data.patients[0].id,p1.data.account.entity);
 check((await req('/api/district',{revision:district.data.revision,role:'coordinator',entity:'',action:{type:'plan'}},p1.cookie)).r.status,403);
 check((await req('/api/district',{revision:district.data.revision,action:{type:'patient',payload:{id:p2.data.account.entity}}},p1.cookie)).r.status,403);
 check((await req('/api/district?mode=practice',null,p1.cookie)).r.status,403);
 check((await req('/api/reviews',null,p1.cookie)).r.status,403);
 const driver=await signup('transport','driver@example.test');check((await req('/api/district',null,driver.cookie)).r.status,403);
 const vehicle={phone:'9999999999',address:'Fictional Provider Address',zone:2,city:'Chennai',location:{lat:13.05,lng:80.25},vehicleNumber:'TEST-001',licenseNumber:'SAMPLE-LICENCE',insuranceExpiry:'2099-12-31',vehicleType:'wheelchair',seats:3,wheelchairSpace:true,assistance:true};
 check((await req('/api/account',{action:'onboard',data:vehicle},driver.cookie)).r.status,200);
 check((await req('/api/account',{action:'review',data:{id:driver.data.account.id,approve:true,note:'Required documents not uploaded'}},admin.cookie)).r.status,400);
 for(const kind of ['driving_license','vehicle_registration','insurance'])check((await upload(driver.cookie,kind)).status,200);
 const docs=await req('/api/documents',null,driver.cookie);check(docs.data.documents.length,3);
 check((await fetch(base+'/api/documents?id='+docs.data.documents[0].id,{headers:{Cookie:p1.cookie}})).status,404);
 check((await fetch(base+'/api/documents?id='+docs.data.documents[0].id,{headers:{Cookie:admin.cookie}})).status,200);
 // Downloads retain original filenames/extensions and exact uploaded bytes.
 for(const name of ['scan (1).pdf','தமிழ் report.pdf']){
  check((await upload(p1.cookie,'clinical_letter',name)).status,200);
  const listed=await req('/api/documents',null,p1.cookie);const doc=listed.data.documents.find(d=>d.name===name);
  check(Boolean(doc),true);
  for(const cookie of [p1.cookie,admin.cookie]){
   const downloaded=await fetch(base+'/api/documents?id='+doc.id,{headers:{Cookie:cookie}});
   check(downloaded.status,200);check(downloaded.headers.get('content-type'),'application/pdf');
   check(downloaded.headers.get('content-disposition').includes("filename*=UTF-8''"+encodeURIComponent(name).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())),true);
   check(await downloaded.text(),'%PDF-1.4\nSample verification only\n%%EOF');
  }
 }
 check((await req('/api/account',{action:'review',data:{id:driver.data.account.id,approve:true,note:'Sample documents reviewed for isolated test'}},admin.cookie)).r.status,200);
 const active=await req('/api/district',null,driver.cookie);check(active.r.status,200);check(active.data.data.vehicles.length,1);check(active.data.data.patients.length,0);
 check((await req('/api/district',{revision:active.data.revision,action:{type:'vehicle',payload:{...active.data.data.vehicles[0],type:'medical'}}},driver.cookie)).r.status,403);
 check((await req('/api/account',{action:'update_patient',data:{...profile,address:'Updated Fictional Address'}},p2.cookie)).r.status,200);
 check((await req('/api/district',null,p2.cookie)).data.data.patients[0].verified,false);
 const hospital=await signup('facility','hospital@example.test');check(hospital.r.status,201);
 check((await req('/api/account',{action:'onboard',data:{phone:'9999999999',address:'Fictional Centre Street',zone:1,city:'Chennai',location:{lat:13.05,lng:80.25},organization:'Fictional Test Hospital',registration:'SAMPLE-HOSPITAL-001',staffCapacity:2,entrance:true,treatmentRoute:true,lift:true}},hospital.cookie)).r.status,200);
 check((await upload(hospital.cookie,'facility_license')).status,200);
 check((await req('/api/account',{action:'review',data:{id:hospital.data.account.id,approve:true,note:'Sample facility documentation reviewed'}},admin.cookie)).r.status,200);check((await req('/api/district',null,hospital.cookie)).data.data.facilities.length,1);
 {
  const network=await req('/api/district',null,admin.cookie),facility=network.data.data.facilities[0];
  await action(hospital.cookie,'facility',{...facility,open:true,utilities:true,entrance:true,treatmentRoute:true,lift:true});
  await action(hospital.cookie,'slot',{facility:facility.id,machine:'TEST-M1',start:600,end:840,staffed:true,active:true});
  for(const p of network.data.data.patients)await action(admin.cookie,'verify_patient',{id:p.id});
  await action(driver.cookie,'vehicle',{...active.data.data.vehicles[0],active:true,confirmed:true,payer:'Test approved fund'});
  const planned=await action(admin.cookie,'plan');check(planned.data.data.assignments.length>0,true);
  const assignment=planned.data.data.assignments.find(a=>a.stage==='proposed');
  const beforeApproval=await req('/api/district',null,admin.cookie);check((await req('/api/district',{revision:beforeApproval.data.revision,action:{type:'transition',payload:{id:assignment.id,stage:'accepted'}}},hospital.cookie)).r.status,409);
  const approveState=await req('/api/care-team',null,admin.cookie);check((await req('/api/care-team',{revision:approveState.data.revision,action:'approve_plan',payload:{selections:[assignment]}},admin.cookie)).r.status,200);
  const approvedState=await req('/api/district',null,admin.cookie);const approvedAssignment=approvedState.data.data.assignments.find(a=>a.patient===assignment.patient&&a.adminApprovedAt);assignment.id=approvedAssignment.id;
  await action(hospital.cookie,'transition',{id:assignment.id,stage:'accepted'});
  const trip=await req('/api/district',null,driver.cookie);check(trip.data.data.patients.length,1);check(trip.data.data.patients[0].duration,0);check(Object.keys(trip.data.contacts),[assignment.patient]);
  await action(driver.cookie,'transition',{id:assignment.id,stage:'transport_confirmed'});
  const hospitalHandover=(await req('/api/district',null,hospital.cookie)).data;check(hospitalHandover.data.patients.some(p=>p.id===assignment.patient),true);check(hospitalHandover.data.slots.some(s=>s.id===assignment.slot),true);check(hospitalHandover.contacts[assignment.patient].phone,profile.phone);
  check(trip.data.contacts[assignment.patient].address.includes(assignment.patient===p2.data.account.entity?'Updated Fictional Address':profile.address),true);check(trip.data.data.assignments.some(a=>a.id===assignment.id),true);
  const ownerCookie=assignment.patient===p1.data.account.entity?p1.cookie:p2.cookie;
  await action(ownerCookie,'support_create',{subject:'Hospital arrival question',text:'Where should I check in?',partnerRole:'facility',partnerEntity:hospital.data.account.entity});
  const hospitalInbox=(await req('/api/district',null,hospital.cookie)).data.data.supportThreads;check(hospitalInbox.length,1);check(hospitalInbox[0].messages[0].text,'Where should I check in?');check(hospitalInbox[0].providerReadAt,0);
  check((await req('/api/district',null,driver.cookie)).data.data.supportThreads.length,0);check((await req('/api/district',null,admin.cookie)).data.data.supportThreads.length,0);
  await action(hospital.cookie,'support_read',{id:hospitalInbox[0].id});await action(hospital.cookie,'support_reply',{id:hospitalInbox[0].id,text:'Please check in at reception.'});
  check((await req('/api/district',null,ownerCookie)).data.data.supportThreads[0].messages.at(-1).sender,'facility');
  await action(ownerCookie,'support_create',{subject:'Pickup question',text:'Please confirm the pickup entrance.',partnerRole:'transport',partnerEntity:driver.data.account.entity});
  const driverInbox=(await req('/api/district',null,driver.cookie)).data.data.supportThreads;check(driverInbox.length,1);await action(driver.cookie,'support_reply',{id:driverInbox[0].id,text:'I will meet you at the main entrance.'});
  const scheduleState=await req('/api/district',null,hospital.cookie),existing=scheduleState.data.data.slots.filter(s=>s.facility===hospital.data.account.entity);
  const inventory={machineCount:2,machineIdentifiers:['TEST-M1','TEST-M2'],machineSchedule:[...existing.map(s=>({...s,date:s.date??scheduleState.data.data.date,timeZone:s.timeZone??'Asia/Kolkata'})),{machine:'TEST-M2',date:nextFutureDate(),timeZone:'Asia/Kolkata',start:600,end:900,active:true,staffed:true}]};
  check((await req('/api/facility-schedule',{revision:scheduleState.data.revision,schedule:inventory},ownerCookie)).r.status,403);
  check((await req('/api/facility-schedule',{revision:scheduleState.data.revision,schedule:inventory},hospital.cookie)).r.status,200);
  check((await req('/api/district',null,hospital.cookie)).data.data.slots.some(s=>s.machine==='TEST-M2'&&s.date===nextFutureDate()),true);
  check('operationalCheck' in trip.data.data.patients[0],false);check(JSON.stringify(trip.data).includes('operationalCheck'),false);
  const cancelState=await req('/api/care-team',null,admin.cookie);
  check((await req('/api/care-team',{revision:cancelState.data.revision,action:'command',payload:{type:'transition',data:{id:assignment.id,stage:'cancelled'}}},admin.cookie)).r.status,200);
  check((await req('/api/account',{action:'request_care',data:{...requestDetails,date:nextFutureDate(),note:'PRIVATE NEW EPISODE FOR A DIFFERENT PROVIDER'}},ownerCookie)).r.status,200);
  for(const former of [hospital.cookie,driver.cookie]){const formerView=(await req('/api/district',null,former)).data;check(formerView.data.patients.length,0);check(Object.keys(formerView.contacts).length,0);check(JSON.stringify(formerView).includes('PRIVATE NEW EPISODE'),false);}
  const oldThreadState=await req('/api/district',null,hospital.cookie);
  check((await req('/api/district',{revision:oldThreadState.data.revision,action:{type:'support_reply',payload:{id:hospitalInbox[0].id,text:'This relationship has ended'}}},hospital.cookie)).r.status,403);


 }
 check((await req('/api/account',{action:'logout'},p1.cookie)).r.status,200);check((await req('/api/district',null,p1.cookie)).r.status,401);

 let limited;for(let i=0;i<11;i++){limited=await req('/api/account',{action:'login',data:{email:'throttle@example.test',password:'incorrect-password-for-test'}});}check(limited.r.status,429);
 const loggedIn=await req('/api/account',{action:'login',data:{email:'driver@example.test',password}});check(loggedIn.r.status,200);check(loggedIn.data.account.role,'transport');

 check((await req('/api/account',{action:'login',data:{email:'two@example.test',password}},'',{Origin:'https://unrelated.example'})).r.status,403);
 check((await req('/api/account',{action:'login',data:{email:'missing-after-rejection@example.test',password:'wrong-password-long'}})).r.status,401);

 check((await req('/api/care-team',null,p2.cookie)).r.status,403);
 const team=await req('/api/care-team',null,admin.cookie);check(team.r.status,200);check(team.data.accounts.some(a=>'password' in a),false);
 check((await req('/api/demo')).r.status,401);
 const demo=await req('/api/demo',{action:'login',password:'admin@123'});check(demo.r.status,200);
 check((await req('/api/district',null,demo.cookie)).r.status,401);
 const dc=await req('/api/demo',null,demo.cookie);check(dc.data.data.facilities.length,3);check(dc.data.data.patients.length,6);
 const suggestion=await req('/api/demo',{revision:dc.data.revision,action:'suggest'},demo.cookie);check(suggestion.r.status,200);check((await req('/api/demo',null,demo.cookie)).data.revision,dc.data.revision);
 const selections=suggestion.data.preview.assignments.filter(a=>a.stage==='proposed').map(a=>({patient:a.patient,slot:a.slot,vehicle:a.vehicle}));check(selections.length>0,true);
 const one=await req('/api/demo',{revision:dc.data.revision,action:'approve_plan',payload:{selections:selections.slice(0,1)}},demo.cookie);check(one.r.status,200);const reserved=one.data.data.assignments.find(a=>a.adminApprovedAt);const regenerated=await req('/api/demo',{revision:one.data.revision,action:'suggest'},demo.cookie);check(regenerated.data.preview.assignments.some(a=>a.id===reserved.id&&a.adminApprovedAt),true);const approved=await req('/api/demo',{revision:one.data.revision,action:'approve_plan',payload:{selections:selections.slice(1)}},demo.cookie);check(approved.data.data.assignments.some(a=>a.id===reserved.id&&a.adminApprovedAt),true);check(approved.r.status,200);check(approved.data.data.assignments.some(a=>a.adminApprovedAt>0),true);
 check((await req('/api/demo',{revision:dc.data.revision,action:'approve_plan',payload:{selections}},demo.cookie)).r.status,409);
 const first=approved.data.data.assignments.find(a=>a.stage==='proposed');check((await req('/api/demo',{revision:approved.data.revision,action:'command',payload:{type:'transition',data:{id:first.id,stage:'accepted'}}},demo.cookie)).r.status,400);
 check((await req('/api/demo',{revision:approved.data.revision,action:'command',payload:{type:'transition',providerConfirmed:true,data:{id:first.id,stage:'accepted'}}},demo.cookie)).r.status,200);
 check((await req('/api/care-team',null,admin.cookie)).data.data.facilities.length,team.data.data.facilities.length);
 check((await req('/api/nearby',{city:'Chennai'})).r.status,401);check((await req('/api/demo',{action:'logout'},demo.cookie)).r.status,200);check((await req('/api/demo',null,demo.cookie)).r.status,401);


 // Cross-role request, reapplication, archive, clinical documents and geocoding regressions.
 const requestPatient=await signup('patient','request-audit@example.test');check(requestPatient.r.status,201);
 check((await req('/api/account',{action:'onboard',data:{...profile,country:'India',houseNumber:'Flat 4B',duration:210,earliest:600,deadline:1140,urgency:2,capability:'standard',transportNeed:'medical',budget:2200,allergies:'Patient-reported allergy for clinical review',medications:'Patient-supplied medication list',emergencyName:'Sample caregiver',emergencyPhone:'9999999999',usualCentre:'Sample renal unit'}},requestPatient.cookie)).r.status,200);
 check((await req('/api/account',{action:'request_care',data:{...requestDetails,note:'Unapproved membership request'}},requestPatient.cookie)).r.status,403);check((await req('/api/account',{action:'review',data:{id:requestPatient.data.account.id,approve:true,note:'Patient membership reviewed'}},admin.cookie)).r.status,200);
 const received=await req('/api/account',{action:'request_care',data:{...requestDetails,note:'Sample treatment and transport request'}},requestPatient.cookie);check(received.r.status,200);check(received.data.requestedAt>0,true);
 const requestedTeam=await req('/api/care-team',null,admin.cookie),rp=requestedTeam.data.data.patients.find(p=>p.id===requestPatient.data.account.entity);check(!!rp,true);check(rp.duration,210);check(rp.transportNeed,'medical');check(rp.budget,2200);check(rp.verified,false);check(rp.requestActive,true);check(rp.requestDate,requestDetails.date);check(rp.requestKind,'both');
 check((await req('/api/account',{action:'request_care',data:{...requestDetails,date:'2026-02-30',note:'Invalid calendar date'}},requestPatient.cookie)).r.status,400);check((await req('/api/account',{action:'request_care',data:{...requestDetails,date:'2000-01-01',note:'Past calendar date'}},requestPatient.cookie)).r.status,400);check((await req('/api/account',{action:'request_care',data:{...requestDetails,kind:'transport',note:'Missing destination'}},requestPatient.cookie)).r.status,400);check(requestedTeam.data.accounts.find(a=>a.id===requestPatient.data.account.id).profile.requestNote,'Sample treatment and transport request');
 const verified=await req('/api/care-team',{revision:requestedTeam.data.revision,action:'verify',payload:{id:rp.id,duration:180,earliest:600,deadline:1140,urgency:2,capability:'standard',transportNeed:'wheelchair',budget:1500}},admin.cookie);check(verified.r.status,200);
 const choicesState=await req('/api/care-team',null,admin.cookie);const choices=await req('/api/care-team',{revision:choicesState.data.revision,action:'options',payload:{id:rp.id}},admin.cookie);check(choices.r.status,200);check(Array.isArray(choices.data.options),true);check((await req('/api/care-team',null,admin.cookie)).data.revision,choicesState.data.revision);check((await req('/api/care-team',{revision:choicesState.data.revision,action:'options',payload:{id:rp.id}},requestPatient.cookie)).r.status,403);
 check((await req('/api/care-team',null,admin.cookie)).data.data.patients.some(p=>p.id===rp.id&&p.verified),true);
 const refreshedProfile=(await req('/api/account',null,requestPatient.cookie)).data.account.profile;check((await req('/api/account',{action:'update_patient',data:refreshedProfile},requestPatient.cookie)).r.status,200);check((await req('/api/account',null,requestPatient.cookie)).data.account.profile.requestNote,'Sample treatment and transport request');
 check((await upload(requestPatient.cookie,'clinical_letter')).status,200);const medicalDocs=await req('/api/documents',null,requestPatient.cookie);check(medicalDocs.data.documents.length,1);
 const deleteDoc=async(cookie,id)=>fetch(base+'/api/documents',{method:'DELETE',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({id})});
 check((await deleteDoc(driver.cookie,medicalDocs.data.documents[0].id)).status,404);check((await deleteDoc(requestPatient.cookie,medicalDocs.data.documents[0].id)).status,200);check((await req('/api/documents',null,requestPatient.cookie)).data.documents.length,0);
 check((await req('/api/location',{lat:13.05123,lng:80.25345})).r.status,401);const address=await req('/api/location',{lat:13.05123,lng:80.25345},requestPatient.cookie);check(address.r.status,200);check(address.data.houseNumber,'12');check(address.data.city,'Test City');check(address.data.country,'Test Country');check(geocodeRequests.length,1);check(geocodeRequests[0].includes('lat=13.0512'),true);
 check((await req('/api/location',{lat:13.05123,lng:80.25345},requestPatient.cookie)).r.status,200);check(geocodeRequests.length,1);check((await req('/api/location',{lat:91,lng:80},requestPatient.cookie)).r.status,400);
 const archiveState=await req('/api/care-team',null,admin.cookie);check((await req('/api/care-team',{revision:archiveState.data.revision,action:'archive_patient',payload:{id:rp.id}},requestPatient.cookie)).r.status,403);check((await req('/api/care-team',{revision:archiveState.data.revision,action:'archive_patient',payload:{id:rp.id}},admin.cookie)).r.status,200);check((await req('/api/account',{action:'request_care',data:{note:'Should not be accepted while archived'}},requestPatient.cookie)).r.status,409);
 const restoreState=await req('/api/care-team',null,admin.cookie);check(restoreState.data.data.patients.find(p=>p.id===rp.id).archived,true);check((await req('/api/care-team',{revision:restoreState.data.revision,action:'restore_patient',payload:{id:rp.id}},admin.cookie)).r.status,200);check((await req('/api/account',{action:'request_care',data:{...requestDetails,note:'Request after restore'}},requestPatient.cookie)).r.status,200);
 const reapply=await signup('facility','reapply-audit@example.test'),facilityProfile={phone:'9999999999',address:'Sample Reapplication Street',city:'Test City',country:'Test Country',location:{lat:13.05,lng:80.25},organization:'Sample Reapply Hospital',registration:'SAMPLE-REG-9',staffCapacity:2,entrance:true,treatmentRoute:true,lift:true};
 check((await req('/api/account',{action:'onboard',data:facilityProfile},reapply.cookie)).r.status,200);check((await upload(reapply.cookie,'facility_license')).status,200);check((await req('/api/account',{action:'review',data:{id:reapply.data.account.id,approve:false,note:'Sample document needs correction'}},admin.cookie)).r.status,200);check((await req('/api/account',null,reapply.cookie)).data.account.status,'rejected');
 check((await req('/api/account',{action:'onboard',data:{...facilityProfile,organization:'Sample Corrected Hospital'}},reapply.cookie)).r.status,200);const reappliedTeam=await req('/api/care-team',null,admin.cookie);check(reappliedTeam.data.accounts.find(a=>a.id===reapply.data.account.id).status,'pending');check(reappliedTeam.data.accounts.find(a=>a.id===reapply.data.account.id).profile.organization,'Sample Corrected Hospital');
 check((await req('/api/account',{action:'review',data:{id:reapply.data.account.id,approve:true,note:'Corrected sample documents reviewed'}},admin.cookie)).r.status,200);const rd=(await req('/api/documents',null,reapply.cookie)).data.documents[0];const removal=await deleteDoc(reapply.cookie,rd.id);check(removal.status,200);check((await removal.json()).needsReview,true);check((await req('/api/account',null,reapply.cookie)).data.account.status,'pending');check((await req('/api/care-team',null,admin.cookie)).data.data.facilities.find(f=>f.id===reapply.data.account.entity).open,false);
 const removeTeam=await req('/api/care-team',null,admin.cookie);check((await req('/api/care-team',{revision:removeTeam.data.revision,action:'archive_account',payload:{id:reapply.data.account.id}},requestPatient.cookie)).r.status,403);check((await req('/api/care-team',{revision:removeTeam.data.revision,action:'archive_account',payload:{id:reapply.data.account.id}},admin.cookie)).r.status,200);check((await req('/api/account',null,reapply.cookie)).data.account.status,'archived');check((await req('/api/account',{action:'onboard',data:facilityProfile},reapply.cookie)).r.status,200);check((await req('/api/account',null,reapply.cookie)).data.account.status,'pending');
 const approvedProviderTeam=await req('/api/care-team',null,admin.cookie);check((await req('/api/care-team',{revision:approvedProviderTeam.data.revision,action:'archive_account',payload:{id:driver.data.account.id}},admin.cookie)).r.status,200);check((await req('/api/account',null,driver.cookie)).data.account.status,'archived');check((await req('/api/care-team',null,admin.cookie)).data.data.vehicles.find(v=>v.id===driver.data.account.entity).active,false);
 const disposable=await signup('patient','disposable@example.test');check(disposable.r.status,201);
 const currentTeam=await req('/api/care-team',null,admin.cookie);
 check((await req('/api/care-team',{revision:currentTeam.data.revision,action:'delete_account',payload:{id:disposable.data.account.id,confirmEmail:'wrong@example.test'}},admin.cookie)).r.status,403);
 check((await req('/api/care-team',{revision:currentTeam.data.revision,action:'delete_account',payload:{id:disposable.data.account.id,confirmEmail:'disposable@example.test'}},admin.cookie)).r.status,403);check((await req('/api/account',{action:'delete_self',data:{confirmEmail:'disposable@example.test'}},admin.cookie)).r.status,403);check((await req('/api/account',{action:'delete_self',data:{confirmEmail:'disposable@example.test'}},disposable.cookie)).r.status,200);
 check((await req('/api/account',null,disposable.cookie)).data.account,null);
 check((await req('/api/account',{action:'login',data:{email:'disposable@example.test',password}})).r.status,401);

 const demoState=await req('/api/care-team',null,admin.cookie);
 check((await req('/api/care-team',{revision:demoState.data.revision,action:'load_demo_providers',payload:{id:rp.id}},requestPatient.cookie)).r.status,403);
 const seeded=await req('/api/care-team',{revision:demoState.data.revision,action:'load_demo_providers',payload:{id:rp.id}},admin.cookie);check(seeded.r.status,200);check(seeded.data.data.facilities.filter(f=>f.demo).length,3);check(seeded.data.data.vehicles.filter(v=>v.demo).length,3);check(seeded.data.data.slots.filter(s=>s.id.startsWith('DEMO:')).length,6);
 check(seeded.data.data.patients.find(p=>p.id===rp.id).verified,false);
 check((await req('/api/care-team',{revision:demoState.data.revision,action:'load_demo_providers',payload:{id:rp.id}},admin.cookie)).r.status,409);
 const seededAgain=await req('/api/care-team',{revision:seeded.data.revision,action:'load_demo_providers',payload:{id:rp.id}},admin.cookie);check(seededAgain.r.status,200);check(seededAgain.data.data.vehicles.filter(v=>v.demo).length,3);
 const demoVerified=await req('/api/care-team',{revision:seededAgain.data.revision,action:'verify',payload:{id:rp.id}},admin.cookie);check(demoVerified.r.status,200);
 const demoOptions=await req('/api/care-team',{revision:demoVerified.data.revision,action:'options',payload:{id:rp.id}},admin.cookie);check(demoOptions.r.status,200);check(demoOptions.data.options.some(o=>o.slot.startsWith('DEMO:')&&o.vehicle.startsWith('DEMO:')),true);
 const demoSuggestions=await req('/api/care-team',{revision:demoVerified.data.revision,action:'suggest',payload:{}},admin.cookie);check(demoSuggestions.r.status,200);check(demoSuggestions.data.preview.assignments.some(a=>a.patient===rp.id&&a.slot.startsWith('DEMO:')),true);
 const selectedDemo=demoOptions.data.options.find(o=>o.slot.startsWith('DEMO:')&&o.vehicle.startsWith('DEMO:'));
 const demoApproved=await req('/api/care-team',{revision:demoVerified.data.revision,action:'approve_plan',payload:{selections:[selectedDemo]}},admin.cookie);check(demoApproved.r.status,200);check(demoApproved.data.data.assignments.some(a=>a.patient===rp.id&&!!a.adminApprovedAt),true);
 const patientDemo=await req('/api/district',null,requestPatient.cookie);check(patientDemo.data.data.facilities.some(f=>f.demo&&f.name.startsWith('Demo')),true);check(patientDemo.data.data.vehicles.some(v=>v.demo),true);
 // A saved request can be explicitly rescheduled, reverified and assigned again.
 const nextDate=new Date(Date.now()+86400000+330*60000).toISOString().slice(0,10);
 const schedule={id:rp.id,date:nextDate,earliest:600,preferredTime:660,deadline:1140,patientAgreed:true};
 const beforeSchedule=await req('/api/care-team',null,admin.cookie);
 check((await req('/api/care-team',{revision:beforeSchedule.data.revision,action:'reschedule_request',payload:schedule},requestPatient.cookie)).r.status,403);
 check((await req('/api/care-team',{revision:beforeSchedule.data.revision,action:'reschedule_request',payload:{...schedule,patientAgreed:false}},admin.cookie)).r.status,400);
 check((await req('/api/care-team',{revision:beforeSchedule.data.revision,action:'reschedule_request',payload:{...schedule,date:'2000-01-01'}},admin.cookie)).r.status,400);
 const moved=await req('/api/care-team',{revision:beforeSchedule.data.revision,action:'reschedule_request',payload:schedule},admin.cookie);check(moved.r.status,200);
 const movedPatient=moved.data.data.patients.find(p=>p.id===rp.id);check(movedPatient.requestDate,nextDate);check(movedPatient.verified,false);check(movedPatient.demoEpisode,undefined);check(movedPatient.episode!==demoApproved.data.data.patients.find(p=>p.id===rp.id).episode,true);
 check(moved.data.data.assignments.find(a=>a.patient===rp.id&&a.id===demoApproved.data.data.assignments.find(x=>x.patient===rp.id&&x.adminApprovedAt).id).stage,'cancelled');
 check((await req('/api/care-team',{revision:beforeSchedule.data.revision,action:'reschedule_request',payload:schedule},admin.cookie)).r.status,409);
 check((await req('/api/care-team',{revision:moved.data.revision,action:'options',payload:{id:rp.id}},admin.cookie)).r.status,409);
 const newProviders=await req('/api/care-team',{revision:moved.data.revision,action:'load_demo_providers',payload:{id:rp.id}},admin.cookie);check(newProviders.r.status,200);
 const newReview=await req('/api/care-team',{revision:newProviders.data.revision,action:'verify',payload:{id:rp.id}},admin.cookie);check(newReview.r.status,200);
 const newPreview=await req('/api/care-team',{revision:newReview.data.revision,action:'suggest',payload:{}},admin.cookie);
 const newSuggestion=newPreview.data.preview.assignments.find(a=>a.patient===rp.id&&a.stage==='proposed'&&!a.adminApprovedAt);check(!!newSuggestion,true);
 const newApproved=await req('/api/care-team',{revision:newReview.data.revision,action:'approve_plan',payload:{selections:[newSuggestion]}},admin.cookie);check(newApproved.r.status,200);
 const newAssignment=newApproved.data.data.assignments.find(a=>a.patient===rp.id&&a.episode===movedPatient.episode&&a.adminApprovedAt);check(newAssignment.date,nextDate);
 const acceptedDemo=await req('/api/care-team',{revision:newApproved.data.revision,action:'command',payload:{type:'transition',providerConfirmed:true,data:{id:newAssignment.id,stage:'accepted'}}},admin.cookie);check(acceptedDemo.r.status,200);
 const confirmedDemo=await req('/api/care-team',{revision:acceptedDemo.data.revision,action:'command',payload:{type:'transition',providerConfirmed:true,data:{id:newAssignment.id,stage:'transport_confirmed'}}},admin.cookie);check(confirmedDemo.r.status,200);
 const visibleDemo=await req('/api/district',null,requestPatient.cookie);check(visibleDemo.data.data.assignments.some(a=>a.id===newAssignment.id&&a.stage==='transport_confirmed'&&a.date===nextDate),true);
 const otherPatientCookie=(await req('/api/account',{action:'login',data:{email:'one@example.test',password}})).cookie;
 // Patient-reported closure is separate from automatic provider confirmations.
 const progressBefore=await req('/api/district',null,requestPatient.cookie);
 check((await req('/api/district',{revision:progressBefore.data.revision,action:{type:'patient_progress',payload:{id:newAssignment.id,stage:'completed',confirmed:true}}},requestPatient.cookie)).r.status,409);
 check((await req('/api/district',{revision:progressBefore.data.revision,action:{type:'patient_progress',payload:{id:newAssignment.id,stage:'departed',confirmed:true}}},otherPatientCookie)).r.status,403);
 for(const stage of ['departed','arrived','treatment_started','completed'])await action(requestPatient.cookie,'patient_progress',{id:newAssignment.id,stage,confirmed:true});
 const closed=await req('/api/district',null,requestPatient.cookie);
 check(closed.data.data.patients[0].requestActive,false);check(closed.data.data.assignments.find(a=>a.id===newAssignment.id).stage,'completed');check(!!closed.data.data.assignments.find(a=>a.id===newAssignment.id).completion,true);
 const nextRequest=await req('/api/account',{action:'request_care',data:{...requestDetails,date:nextDate,note:'A second care episode after completed treatment'}},requestPatient.cookie);check(nextRequest.r.status,200);
 const historyAfter=await req('/api/district',null,requestPatient.cookie);check(historyAfter.data.data.assignments.some(a=>a.id===newAssignment.id&&a.stage==='completed'),true);check(historyAfter.data.data.patients[0].episode!==newAssignment.episode,true);
 check((await req('/api/care-team',null,admin.cookie)).data.data.assignments.some(a=>a.id===newAssignment.id&&a.stage==='completed'),true);
 await action(requestPatient.cookie,'support_create',{subject:'Help with a future pickup',text:'Can the care team help me check my pickup location?'});
 const help=(await req('/api/district',null,requestPatient.cookie)).data.data.supportThreads[0];
 check(help.patient,requestPatient.data.account.entity);check((await req('/api/district',null,otherPatientCookie)).data.data.supportThreads.some(t=>t.id===help.id),false);
 const wrongThread=await req('/api/district',null,otherPatientCookie);check((await req('/api/district',{revision:wrongThread.data.revision,action:{type:'support_reply',payload:{id:help.id,text:'Other patient cannot reply'}}},otherPatientCookie)).r.status,404);
 if(!keepUI)check((await req('/api/district',null,hospital.cookie)).data.data.supportThreads.some(t=>t.id===help.id),false);
 check((await req('/api/care-team',null,admin.cookie)).data.data.supportThreads.some(t=>t.id===help.id),true);
 await action(admin.cookie,'support_read',{id:help.id});await action(admin.cookie,'support_reply',{id:help.id,text:'We have received your question and will check the address.'});
 const reply=(await req('/api/district',null,requestPatient.cookie)).data.data.supportThreads.find(t=>t.id===help.id);check(reply.messages.length,2);check(reply.messages[1].sender,'coordinator');
 await action(admin.cookie,'support_status',{id:help.id,status:'closed'});check((await req('/api/district',null,requestPatient.cookie)).data.data.supportThreads.find(t=>t.id===help.id).status,'closed');
 await action(requestPatient.cookie,'support_reply',{id:help.id,text:'Thank you. Can I ask another question?'});check((await req('/api/care-team',null,admin.cookie)).data.data.supportThreads.find(t=>t.id===help.id).status,'open');
 if(keepUI){
  const demoHospital=await req('/api/account',{action:'signup',data:{role:'facility',email:'hospital-ui@example.test',password,name:'Fictional Hospital Operator'}});check(demoHospital.r.status,201);
  const hospitalProfile={phone:'9999999999',address:'Fictional Centre Street',zone:1,city:'Chennai',location:{lat:13.05,lng:80.25},registration:'UI-DEMO-ONLY',staffCapacity:2,entrance:true,treatmentRoute:true,lift:true,organization:'Fictional UI Dialysis Hospital',machineCount:2,machineIdentifiers:['UI-M1','UI-M2'],machineSchedule:[{machine:'UI-M1',date:nextDate,timeZone:'Asia/Kolkata',start:600,end:1000,active:true,staffed:true}]};
  check((await req('/api/account',{action:'onboard',data:hospitalProfile},demoHospital.cookie)).r.status,200);check((await upload(demoHospital.cookie,'facility_license')).status,200);
  check((await req('/api/account',{action:'review',data:{id:demoHospital.data.account.id,approve:true,note:'Fictional hospital machine inventory reviewed'}},admin.cookie)).r.status,200);
  check((await req('/api/district',null,demoHospital.cookie)).data.data.slots.some(s=>s.machine==='UI-M1'&&s.date===nextDate&&s.staffed),true);
  for(const [email,name] of [['manual-ui@example.test','Fictional Manual Walkthrough'],['automatic-ui@example.test','Fictional Automatic Walkthrough']]){
   const patient=await req('/api/account',{action:'signup',data:{role:'patient',email,password,name}});
   check(patient.r.status,201);check((await req('/api/account',{action:'onboard',data:{...profile,country:'India',houseNumber:'Demo 4B'}},patient.cookie)).r.status,200);
   check((await req('/api/account',{action:'review',data:{id:patient.data.account.id,approve:true,note:'Isolated UI walkthrough membership review'}},admin.cookie)).r.status,200);
   check((await req('/api/account',{action:'request_care',data:{...requestDetails,date:nextDate,note:'Isolated demonstration of dated treatment and transport request'}},patient.cookie)).r.status,200);
  }
 }
 // Judge sessions use only isolated fictional districts and cannot authorize account APIs.
 check((await req('/api/demo')).r.status,401);
 check((await req('/api/demo',{action:'login',password:'wrong-password'})).r.status,401);
 const judge=await req('/api/demo',{action:'login',password:'admin@123'});check(judge.r.status,200);
 check((await req('/api/care-team',null,judge.cookie)).r.status,401);
 check((await req('/api/district',null,judge.cookie)).r.status,401);
 check((await req('/api/account',null,judge.cookie)).data.account,null);
 const judgeState=await req('/api/demo',null,judge.cookie);check(judgeState.data.data.patients.length,6);
 check(judgeState.data.data.patients.every(p=>p.requestActive&&p.memberApproved&&p.verified&&p.name.startsWith('Fictional ')),true);
 check(judgeState.data.documents.length,0);
 const judgeOptions=await req('/api/demo',{action:'options',payload:{id:judgeState.data.data.patients[0].id},revision:judgeState.data.revision},judge.cookie);check(judgeOptions.r.status,200);check(judgeOptions.data.options.length>0,true);
 const judgePlan=await req('/api/demo',{action:'suggest',payload:{},revision:judgeState.data.revision},judge.cookie);check(judgePlan.r.status,200);check(judgePlan.data.preview.assignments.length>0,true);check(judgePlan.data.preview.metrics.violations,0);
 const judgeApproved=await req('/api/demo',{action:'approve_plan',payload:{selections:[judgeOptions.data.options[0]]},revision:judgeState.data.revision},judge.cookie);check(judgeApproved.r.status,200);check(judgeApproved.data.data.assignments.some(a=>a.adminApprovedAt),true);
 async function demoAction(action,payload,expected=200){const current=await req('/api/demo',null,judge.cookie);const result=await req('/api/demo',{revision:current.data.revision,action,payload},judge.cookie);check(result.r.status,expected);return result.data;}
 const demoAssignment=judgeApproved.data.data.assignments.find(a=>a.adminApprovedAt),demoSlot=judgeApproved.data.data.slots.find(s=>s.id===demoAssignment.slot),demoPatient=demoAssignment.patient;
 await demoAction('role_command',{role:'patient',entity:demoPatient,type:'transition',data:{id:demoAssignment.id,stage:'accepted'}},403);
 await demoAction('role_command',{role:'patient',entity:demoPatient,type:'patient_progress',data:{id:demoAssignment.id,stage:'completed',confirmed:true}},409);
 await demoAction('role_command',{role:'facility',entity:judgeApproved.data.data.facilities.find(f=>f.id!==demoSlot.facility).id,type:'transition',data:{id:demoAssignment.id,stage:'accepted'}},403);
 await demoAction('role_command',{role:'facility',entity:demoSlot.facility,type:'transition',data:{id:demoAssignment.id,stage:'accepted'}});
 await demoAction('role_command',{role:'transport',entity:demoAssignment.vehicle,type:'transition',data:{id:demoAssignment.id,stage:'transport_confirmed'}});
 await demoAction('demo_request',{entity:demoPatient,note:'A second request',kind:'both',date:judgeState.data.data.date,timeZone:'Asia/Kolkata',preferredTime:600,earliest:600,deadline:1140,availabilityAcknowledged:true},409);
 for(const stage of ['departed','arrived','treatment_started','completed'])await demoAction('role_command',{role:'patient',entity:demoPatient,type:'patient_progress',data:{id:demoAssignment.id,stage,confirmed:true}});
 const demoComplete=(await req('/api/demo',null,judge.cookie)).data.data;check(demoComplete.patients.find(p=>p.id===demoPatient).requestActive,false);check(demoComplete.assignments.find(a=>a.id===demoAssignment.id).completion.patientName.startsWith('Fictional '),true);
 await demoAction('demo_request',{entity:demoPatient,note:'Need replacement dialysis and travel',kind:'both',date:demoComplete.date,timeZone:'Asia/Kolkata',preferredTime:660,earliest:600,deadline:1140,availabilityAcknowledged:true});
 const demoNew=(await req('/api/demo',null,judge.cookie)).data.data;check(demoNew.patients.find(p=>p.id===demoPatient).verified,false);check(demoNew.patients.find(p=>p.id===demoPatient).requestActive,true);check(demoNew.assignments.find(a=>a.id===demoAssignment.id).stage,'completed');
 // A completed prior episode must not prevent verification of the new request.
 const rereview=await demoAction('verify',{id:demoPatient});check(rereview.data.patients.find(p=>p.id===demoPatient).verified,true);check(rereview.data.assignments.find(a=>a.id===demoAssignment.id).stage,'completed');
 // Routine requests support automatic operational checks in single/manual and bulk paths.
 const routine=demoNew.patients.find(p=>p.urgency===1&&p.capability==='standard'&&p.transportNeed!=='medical'&&p.id!==demoPatient);
 await demoAction('demo_request',{entity:routine.id,note:'Routine request for automated checking',kind:'both',date:demoNew.date,timeZone:'Asia/Kolkata',preferredTime:660,earliest:600,deadline:1140,availabilityAcknowledged:true});
 const routineOptions=await demoAction('options',{id:routine.id});check(routineOptions.options.length>0,true);
 const bulkChecked=await demoAction('suggest',{});check(bulkChecked.preview.assignments.some(a=>a.patient===routine.id),true);
 const beforeAuto=(await req('/api/demo',null,judge.cookie)).data;check(beforeAuto.data.patients.find(p=>p.id===routine.id).verified,false);
 const autoApproved=await demoAction('approve_plan',{selections:[routineOptions.options[0]]});check(autoApproved.data.assignments.some(a=>a.patient===routine.id&&a.adminApprovedAt),true);check(autoApproved.data.patients.find(p=>p.id===routine.id).verified,false);
 const otherJudge=await req('/api/demo',{action:'login',password:'admin@123'});check((await req('/api/demo',null,otherJudge.cookie)).data.data.assignments.length,0);
 check((await req('/api/demo',{action:'logout'},judge.cookie)).r.status,200);check((await req('/api/demo',null,judge.cookie)).r.status,401);
 // Registered (non-demo) providers: treatment-only, transport-only and combined requests.
 // The earlier removal regression intentionally archived this driver. Reapply before the new cases.
 check((await req('/api/account',{action:'onboard',data:vehicle},driver.cookie)).r.status,200);
 check((await req('/api/account',{action:'review',data:{id:driver.data.account.id,approve:true,note:'Fictional driver reapplication for registered service matrix'}},admin.cookie)).r.status,200);
 async function teamMutation(action,payload){const before=await req('/api/care-team',null,admin.cookie);const out=await req('/api/care-team',{revision:before.data.revision,action,payload},admin.cookie);assert.equal(out.r.status,200,out.data.error);checks++;return out.data;}
 for(const [i,kind] of ['treatment','transport','both'].entries()){
  const member=await signup('patient',`matrix-${kind}@example.test`);check(member.r.status,201);
  check((await req('/api/account',{action:'onboard',data:{...profile,wheelchair:false,occupiedWheelchair:false,assistance:false,caregiver:false,duration:180,urgency:1,transportNeed:'car',capability:'standard'}},member.cookie)).r.status,200);
  check((await req('/api/account',{action:'review',data:{id:member.data.account.id,approve:true,note:'Fictional registered-path matrix membership review'}},admin.cookie)).r.status,200);
  const date=new Date(Date.now()+(i+3)*86400000+330*60000).toISOString().slice(0,10);
  const details={...requestDetails,kind,date,note:`Registered ${kind} request without demo resources`,...(kind==='transport'?{destination:{lat:13.051,lng:80.251},destinationName:'Fictional existing clinic',destinationAddress:'Fictional registered clinic address'}:{})};
  check((await req('/api/account',{action:'request_care',data:details},member.cookie)).r.status,200);
  const h=(await req('/api/district',null,hospital.cookie)).data,f=h.data.facilities[0];await action(hospital.cookie,'facility',{...f,open:true,utilities:true,entrance:true,treatmentRoute:true,lift:true});
  const previous=(await req('/api/district',null,hospital.cookie)).data;
  const rows=previous.data.slots.filter(s=>s.facility===f.id).map(s=>({...s,date:s.date??previous.data.date,timeZone:s.timeZone??'Asia/Kolkata'}));const machine=`MATRIX-${kind}`;
  const identifiers=[...new Set([...rows.map(s=>s.machine),machine])];
  check((await req('/api/facility-schedule',{revision:previous.revision,schedule:{machineCount:identifiers.length,machineIdentifiers:identifiers,machineSchedule:[...rows,{machine,date,timeZone:'Asia/Kolkata',start:600,end:1140,active:true,staffed:true}]}},hospital.cookie)).r.status,200);
  const car=(await req('/api/district',null,driver.cookie)).data.data.vehicles[0];await action(driver.cookie,'vehicle',{...car,date,timeZone:'Asia/Kolkata',available:480,until:1140,active:true,confirmed:true,payer:'Fictional matrix fund'});
  const opts=await teamMutation('options',{id:member.data.account.entity});check(opts.options.length>0,true);check(opts.options.every(o=>!o.slot.startsWith('DEMO:')&&!o.vehicle.startsWith('DEMO:')),true);
  const plans=await teamMutation('suggest',{}),proposal=plans.preview.assignments.find(a=>a.patient===member.data.account.entity);check(!!proposal,true);
  const saved=await teamMutation('approve_plan',{selections:[kind==='treatment'?opts.options[0]:proposal]});const allocation=saved.data.assignments.find(a=>a.patient===member.data.account.entity&&a.adminApprovedAt);check(!!allocation,true);check(saved.data.patients.find(p=>p.id===member.data.account.entity).verified,false);
  if(kind!=='transport'){const incoming=(await req('/api/district',null,hospital.cookie)).data;check(incoming.data.patients.some(p=>p.id===member.data.account.entity),true);check(incoming.data.slots.some(s=>s.id===allocation.slot&&s.machine===machine),true);await action(hospital.cookie,'transition',{id:allocation.id,stage:'accepted'});}
  if(kind!=='treatment'){const pickup=(await req('/api/district',null,driver.cookie)).data;check(pickup.contacts[member.data.account.entity].phone,profile.phone);check(JSON.stringify(pickup).includes('operationalCheck'),false);await action(driver.cookie,'transition',{id:allocation.id,stage:'transport_confirmed'});}
  const notified=(await req('/api/district',null,member.cookie)).data.data.assignments.find(a=>a.id===allocation.id);check(notified.stage,kind==='treatment'?'accepted':'transport_confirmed');
  await teamMutation('command',{type:'transition',data:{id:allocation.id,stage:'cancelled'}});
  for(const cookie of [hospital.cookie,driver.cookie])check((await req('/api/district',null,cookie)).data.data.patients.some(p=>p.id===member.data.account.entity),false);
 }
 console.log(`PASS: ${checks} account, approval, document isolation and permission checks against an isolated database.`);
 succeeded=true;
}catch(e){writeFileSync('.sites-runtime/security-last-log.txt',logs);throw e;}finally{geocodeFixture.close();if(!keepUI||!succeeded)server.kill();else console.log('Isolated UI test server remains on port 8790.');}





