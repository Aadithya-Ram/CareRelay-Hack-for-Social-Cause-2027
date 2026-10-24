import {build} from "esbuild";
import {mkdir,readdir} from "node:fs/promises";
import {spawnSync} from "node:child_process";
const names=(await readdir('tests')).filter(name=>name.endsWith('.test.ts'));
await mkdir('.sites-runtime/tests',{recursive:true});
await build({entryPoints:names.map(name=>'tests/'+name),outdir:'.sites-runtime/tests',outExtension:{'.js':'.mjs'},bundle:true,platform:'node',format:'esm',packages:'external'});
const result=spawnSync(process.execPath,['--test',...names.map(name=>'.sites-runtime/tests/'+name.replace(/\.ts$/,'.mjs'))],{stdio:'inherit'});
process.exitCode=result.status??1;
