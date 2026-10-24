// Resolve a local date/time to an absolute instant without assuming a fixed UTC offset.
const formats=new Map<string,Intl.DateTimeFormat>();
const instants=new Map<string,number|null>();
export function serviceInstant(date:string,zone:string,minute:number):number|null{
 const key=`${date}|${zone}|${minute}`;
 if(instants.has(key))return instants.get(key)!;
 let result:number|null=null;
 try{
  const wall=Date.parse(date+'T00:00:00Z')+minute*60000;
  if(!Number.isFinite(wall))return null;
  let format=formats.get(zone);
  if(!format){format=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});formats.set(zone,format);}
  let guess=wall;
  for(let n=0;n<5;n++){
   const parts=format.formatToParts(guess),get=(type:string)=>Number(parts.find(p=>p.type===type)!.value);
   const rendered=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'));
   if(rendered===wall){result=guess;break;}
   guess+=wall-rendered;
  }
 }catch{/* Invalid zones and nonexistent DST wall times are not eligible. */}
 if(instants.size>=20000)instants.clear();instants.set(key,result);return result;
}

export function resourceOverlap(a:{date:string;zone:string;start:number;end:number},b:{date:string;zone:string;start:number;end:number}){
 if(a.zone===b.zone){
  const ad=Date.parse(a.date+'T00:00:00Z')/60000,bd=Date.parse(b.date+'T00:00:00Z')/60000;
  return ad+a.start<bd+b.end&&bd+b.start<ad+a.end;
 }
 const a0=serviceInstant(a.date,a.zone,a.start),a1=serviceInstant(a.date,a.zone,a.end),b0=serviceInstant(b.date,b.zone,b.start),b1=serviceInstant(b.date,b.zone,b.end);
 // Unknown intervals fail closed instead of silently allowing a resource collision.
 if(a0==null||a1==null||b0==null||b1==null)return true;
 return a0<b1&&b0<a1;
}
