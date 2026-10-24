import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('.sites-runtime/tests',{recursive:true});
await build({entryPoints:['tests/manual-picker.test.ts'],outfile:'.sites-runtime/tests/manual-picker.test.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const result=spawnSync(process.execPath,['--test','.sites-runtime/tests/manual-picker.test.mjs'],{stdio:'inherit'});
process.exitCode=result.status??1;
