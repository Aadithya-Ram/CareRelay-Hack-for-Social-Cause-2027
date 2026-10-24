import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const url='http://127.0.0.1:8787';
const noOpen=process.argv.includes('--no-open');
function openBrowser(){
  if(!noOpen) spawn('powershell.exe',['-NoProfile','-Command',`Start-Process '${url}'`],{stdio:'ignore',windowsHide:true});
}
function run(args){
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error('Setup failed. Review the output above and try again.');
}
async function ready(){
  try {
    const r=await fetch(url+'/api/account',{signal:AbortSignal.timeout(1500)});
    const body=await r.json();
    return r.ok && typeof body.setupAvailable==='boolean' && 'account' in body;
  }catch{return false;}
}
try{
  if(await ready()){
    console.log(`CareRelay is already running: ${url}`);openBrowser();
  }else{
    console.log('Preparing CareRelay. First-time setup may take a few minutes.');
    if(!existsSync('node_modules/wrangler/bin/wrangler.js')){
      const npm=resolve(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
      if(!existsSync(npm))throw new Error('npm is missing. Reinstall Node.js with npm enabled.');
      run([npm,'ci']);
    }
    // Build on each launch so local edits are included; the stored district is preserved.
    run(['scripts/run-framework.mjs','build']);
    const worker=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js'];
    for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
      const sql=readFileSync(`drizzle/${file}`,'utf8').replaceAll('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ').replaceAll('CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS ').replaceAll('CREATE INDEX ','CREATE INDEX IF NOT EXISTS ');
      run([...worker,'d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',sql]);
    }
    const server=spawn(process.execPath,[...worker,'dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','8787','--inspector-port','0'],{stdio:'inherit'});
    let stopped=false;
    server.on('exit',code=>{stopped=true;process.exitCode=code??1;});
    server.on('error',e=>{stopped=true;console.error(e.message);process.exitCode=1;});
    process.on('SIGINT',()=>{server.kill();process.exitCode=0;});
    for(let attempts=0;attempts<90&&!stopped;attempts++){
      if(await ready()){
        console.log(`\nCareRelay is ready: ${url}\nKeep this window open. Press Ctrl+C here to stop the website.`);
        openBrowser();break;
      }
      if(attempts===89){server.kill();throw new Error('The website did not become ready. Check whether port 8787 is occupied.');}
      await new Promise(r=>setTimeout(r,1000));
    }
  }
}catch(e){console.error(e.message);process.exitCode=1;}
