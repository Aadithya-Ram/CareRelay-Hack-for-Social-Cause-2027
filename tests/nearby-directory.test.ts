import assert from 'node:assert/strict';
import test from 'node:test';
import {dialysisQuery,directoryCentres} from '../lib/nearby-directory';
const origin={lat:13.08,lng:80.27};
test('discovery builds a bounded dialysis POI query with rounded coordinates',()=>{
 const q=dialysisQuery({lat:13.083491,lng:80.270134});assert.ok(q.includes('healthcare"="dialysis'));assert.ok(q.includes('around:31000,13.08,80.27'));assert.ok(!q.includes('13.083491'));assert.ok(q.endsWith('out center tags;'));
});
test('discovery validates coordinates, deduplicates and sorts centres by distance',()=>{
 const rows=[{type:'node',id:2,lat:13.1,lon:80.27,tags:{name:'Far Dialysis','addr:street':'Second Road'}},{type:'way',id:1,center:{lat:13.081,lon:80.27},tags:{name:'Near Dialysis','addr:city':'Chennai','contact:phone':'+91 123'}},{type:'node',id:3,lat:13.081,lon:80.27,tags:{name:'Near Dialysis'}},{type:'node',id:4,lat:NaN,lon:80,tags:{}},{type:'node',id:5,lat:90.1,lon:80,tags:{}},{type:'node',id:6,lat:17,lon:80,tags:{}},{type:'unknown',id:8,lat:13.08,lon:80.27,tags:{}},null];
 const result=directoryCentres(rows,origin);assert.equal(result.length,2);assert.equal(result[0].name,'Near Dialysis');assert.equal(result[0].address,'Chennai');assert.equal(result[0].phone,'+91 123');assert.ok(result[0].distanceKm<result[1].distanceKm);assert.equal(result[0].url,'https://www.openstreetmap.org/way/1');assert.ok(result[0].mapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query='));assert.equal(new URL(result[0].mapsUrl).searchParams.get('query'),'Near Dialysis 13.081,80.27');assert.equal('rating' in result[0],false);
});
test('discovery keeps unnamed places locatable without inventing an address or ratings',()=>{
 const [row]=directoryCentres([{type:'node',id:7,lat:13.08,lon:80.27,tags:{}}],origin);assert.equal(row.name,'Dialysis centre');assert.equal(row.address,'Map location: 13.0800, 80.2700');assert.equal(directoryCentres([],origin).length,0);
});
