import {db,requireAccount,sameOrigin} from '@/lib/accounts';
import {DomainError} from '@/lib/commands';
import {z} from 'zod';
import {env} from 'cloudflare:workers';
import {dialysisQuery,directoryCentres} from '@/lib/nearby-directory';
export const dynamic='force-dynamic';
const headers={'User-Agent':'CareRelay/1.0 (+https://carerelay-dialysis-continuity.amplewand1.chatgpt.site)','Accept-Language':'en'};
export async function POST(req:Request){try{
 sameOrigin(req);const a=await requireAccount(req);const raw=await req.text();if(raw.length>2048)throw new DomainError('Request too large.',413);
 const b=z.object({city:z.string().trim().min(2).max(100).optional(),lat:z.number().min(-90).max(90).optional(),lng:z.number().min(-180).max(180).optional()}).parse(JSON.parse(raw));
 if((b.lat==null)!==(b.lng==null)||(!b.city&&b.lat==null))throw new DomainError('Enter a city or choose a location on the map.');
 const now=Date.now(),key=`nearby:v4:${b.lat!=null?`${b.lat.toFixed(4)},${b.lng!.toFixed(4)}`:b.city!.toLowerCase()}`;
 const cached=await db().prepare('SELECT data FROM directory_cache WHERE key=? AND expires>?').bind(key,now).first<{data:string}>();
 if(cached)return Response.json(JSON.parse(cached.data),{headers:{'Cache-Control':'no-store'}});
 const ownKey=`nearby:${a.id}`;
 await db().prepare('INSERT INTO auth_limits(key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN ? ELSE until END').bind(ownKey,now+60000,now,now,now+60000).run();
 const count=await db().prepare('SELECT count FROM auth_limits WHERE key=?').bind(ownKey).first<{count:number}>();
 if(count!.count>10)throw new DomainError('Please wait a minute before another nearby search.',429);
 const config=env as Cloudflare.Env&{OSM_SEARCH_URL?:string;OSM_OVERPASS_URL?:string};
 let point=b.lat!=null?{lat:b.lat,lng:b.lng!}:undefined;let searchLabel=b.city??'Selected map location';
 if(!point){
  const gate=await db().prepare('INSERT INTO auth_limits(key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET until=excluded.until WHERE auth_limits.until<? RETURNING key').bind('geocoding-global',Date.now()+1100,Date.now()).first();
  if(!gate)throw new DomainError('Address search is busy. Please try again in a moment, or choose on the map.',429);
  const params=new URLSearchParams({format:'jsonv2',limit:'1',q:b.city!});
  const r=await fetch(`${config.OSM_SEARCH_URL??'https://nominatim.openstreetmap.org/search'}?${params}`,{headers,signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new DomainError('Place search is temporarily unavailable. Try a map pin or open Google Maps.',503);
  const rows=await r.json() as {lat:string;lon:string;display_name:string}[];const first=rows[0];
  if(!first||!Number.isFinite(Number(first.lat))||!Number.isFinite(Number(first.lon))||Math.abs(Number(first.lat))>90||Math.abs(Number(first.lon))>180)throw new DomainError('Place not found. Include the city and state, or choose on the map.',404);
  point={lat:Number(first.lat),lng:Number(first.lon)};searchLabel=String(first.display_name||b.city).slice(0,240);
 }
 // Public POI discovery uses Overpass, not Nominatim's address search or patient records.
 const response=await fetch(config.OSM_OVERPASS_URL??'https://overpass-api.de/api/interpreter',{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:dialysisQuery(point)}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new DomainError('The centre directory is temporarily unavailable. Try again or see nearby centres on Google Maps.',503);
 const data=await response.json() as {elements?:unknown[];remark?:string};if(!Array.isArray(data.elements)||data.remark)throw new DomainError('The directory could not finish this search. Please retry or open Google Maps.',503);
 const result={centres:directoryCentres(data.elements,point),point,searchLabel,radiusKm:30,source:'OpenStreetMap contributors',coverage:'Directory listings may be incomplete. Contact the centre to confirm dialysis services.'};
 await db().prepare('INSERT INTO directory_cache(key,data,expires) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires=excluded.expires').bind(key,JSON.stringify(result),Date.now()+1800000).run();
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof DomainError?e.message:e instanceof z.ZodError?'Enter a valid city or map location.':'Nearby search is temporarily unavailable. Open Google Maps for local results.'},{status:e instanceof DomainError?e.status:e instanceof z.ZodError?400:503});}}
