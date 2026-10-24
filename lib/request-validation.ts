import {z} from 'zod';
import {District,Patient,activeRequest,requestTimeProblem} from './domain';

const fields=z.object({duration:z.number().int().min(60).max(480),earliest:z.number().int().min(0).max(1439),deadline:z.number().int().min(0).max(1439),preferredTime:z.number().int().min(0).max(1439),budget:z.number().int().min(0).max(100000),requestKind:z.enum(['treatment','transport','both']),requestDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timeZone:z.string(),location:z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)}),consent:z.literal(true),urgency:z.number().int().min(1).max(3),capability:z.enum(['standard','isolation']),transportNeed:z.enum(['car','wheelchair','medical']),wheelchair:z.boolean(),occupiedWheelchair:z.boolean(),assistance:z.boolean(),caregiver:z.boolean(),destination:z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180)}).optional()});
// Bind automated checks to the exact submitted requirements; edits invalidate them.
const fingerprint=(p:Patient)=>JSON.stringify([p.episode,p.requestDate,p.timeZone,p.requestKind,p.duration,p.earliest,p.deadline,p.preferredTime,p.budget,p.urgency,p.capability,p.transportNeed,p.wheelchair,p.occupiedWheelchair,p.assistance,p.caregiver,p.location,p.destination,p.destinationName,p.destinationAddress,p.requiresLocation,p.consent,p.memberApproved,p.requestActive,p.archived]);
export function reviewRequired(p:Patient){return p.urgency!==1||p.capability!=='standard'||p.transportNeed==='medical';}
export const requirementsReady=(p:Patient)=>p.verified||(!reviewRequired(p)&&p.operationalCheck===fingerprint(p));
export function automaticRequestProblem(d:District,p:Patient):string|null{
 if(!activeRequest(p)||p.requestActive===false||!p.verified&&!p.requestActive)return 'An approved membership and active request are required.';
 if(p.verified)return requestTimeProblem(d,p);
 if(!fields.safeParse(p).success)return 'Complete the request date, timezone, pickup map pin, agreement and treatment/travel fields before matching.';
 if(!Number.isFinite(Date.parse(p.requestDate!))||new Date(p.requestDate!+'T00:00:00Z').toISOString().slice(0,10)!==p.requestDate)return 'Choose a valid appointment date.';
 try{new Intl.DateTimeFormat('en',{timeZone:p.timeZone});}catch{return 'Choose a valid request timezone.';}
 const timing=requestTimeProblem(d,p);if(timing)return timing;
 if(p.earliest>p.preferredTime!||p.preferredTime!>=p.deadline||p.requestKind!=='transport'&&p.earliest+p.duration>p.deadline)return 'The requested treatment duration and preferred time must fit the appointment window.';
 if(p.requestKind==='transport'&&(!p.destination||!p.destinationName||!p.destinationAddress))return 'Confirm the existing appointment destination and its map pin for transport-only requests.';
 if(reviewRequired(p))return 'Staff review required for urgent/time-sensitive, isolation or medical-transport requirements. Automatic checks do not perform clinical verification.';
 return null;
}
export function checkRequest(d:District,p:Patient){const issue=automaticRequestProblem(d,p);if(!issue&&!p.verified)p.operationalCheck=fingerprint(p);return issue;}
export const underwayArrangement=(d:District,p:Patient)=>d.assignments.find(a=>a.patient===p.id&&['departed','arrived','treatment_started'].includes(a.stage));
