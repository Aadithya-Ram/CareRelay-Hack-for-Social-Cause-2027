import {distance, type Geo} from './domain';
export type DirectoryCentre={id:string;name:string;address:string;location:Geo;distanceKm:number;phone?:string;url:string;mapsUrl:string};
export function dialysisQuery(point:Geo){
 const lat=Number(point.lat.toFixed(2)),lng=Number(point.lng.toFixed(2));
 const area=`(around:31000,${lat},${lng})`;
 return `[out:json][timeout:20];(nwr["healthcare"="dialysis"]${area};nwr["healthcare:dialysis"="yes"]${area};nwr["name"~"dialysis|haemodialysis|hemodialysis",i]${area};);out center tags;`;
}
export function directoryCentres(elements:unknown[],point:Geo):DirectoryCentre[]{
 const seen=new Set<string>();const result:DirectoryCentre[]=[];
 for(const item of elements){
  if(!item||typeof item!=='object')continue;
  const e=item as Record<string,any>,t=e.tags??{},lat=e.lat??e.center?.lat,lng=e.lon??e.center?.lon;
  if(!['node','way','relation'].includes(e.type)||!Number.isSafeInteger(e.id)||typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)continue;
  const location={lat,lng},km=distance(point,location);if(km>30)continue;
  const name=String(t['name:en']||t.name||t.operator||'Dialysis centre').slice(0,180);
  const key=`${name.toLowerCase()}:${lat.toFixed(4)}:${lng.toFixed(4)}`;if(seen.has(key))continue;seen.add(key);
  const address=String(t['addr:full']||[t['addr:housenumber'],t['addr:street'],t['addr:suburb'],t['addr:city'],t['addr:state'],t['addr:postcode']].filter(Boolean).join(', ')||`Map location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).slice(0,400);
  const phone=t['contact:phone']||t.phone;
  result.push({id:`osm-${e.type}-${e.id}`,name,address,location,distanceKm:km,...(phone?{phone:String(phone).slice(0,80)}:{}),url:`https://www.openstreetmap.org/${e.type}/${e.id}`,mapsUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lng}`)}`});
 }
 return result.sort((a,b)=>a.distanceKm-b.distanceKm||a.name.localeCompare(b.name)).slice(0,30);
}
