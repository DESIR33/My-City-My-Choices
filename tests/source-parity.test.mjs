import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compareRuntimeSources} from '../scripts/check-source-parity.mjs';

async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'city-runtime-parity-')),repo=join(root,'repo'),site=join(root,'site');
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const base of [repo,join(site,'dist')]){await mkdir(join(base,'assets/models'),{recursive:true});await writeFile(join(base,'index.html'),'<script type="module" src="assets/game.js"></script>');await writeFile(join(base,'assets/game.js'),'export const day=1;');await writeFile(join(base,'assets/models/car.glb'),Buffer.from([0,1,255,4]));}
  return {root,repo,site};
}
test('compares both layouts including nested binary assets, ignoring source-only metadata',async t=>{
  const f=await fixture(t);await writeFile(join(f.repo,'README.md'),'Repo notes');await writeFile(join(f.site,'token-must-not-be-read'),'not-runtime');await mkdir(join(f.repo,'node_modules'));assert.deepEqual(await compareRuntimeSources(f.repo,f.site),{ok:true,compared:3,missing:[],extra:[],changed:[]});
});
test('finds missing runtime modules and repository-only assets in both directions',async t=>{
  const f=await fixture(t);await writeFile(join(f.site,'dist/assets/weather.js'),'rain');await writeFile(join(f.repo,'assets/old.js'),'old');const r=await compareRuntimeSources(f.repo,f.site);assert.equal(r.ok,false);assert.deepEqual(r.missing,['assets/weather.js']);assert.deepEqual(r.extra,['assets/old.js']);assert.deepEqual(r.changed,[]);
});
test('detects changed entry points and binary content rather than matching only filenames',async t=>{
  const f=await fixture(t);await writeFile(join(f.repo,'index.html'),'other entry point');await writeFile(join(f.repo,'assets/models/car.glb'),Buffer.from([0,1,255,5]));const r=await compareRuntimeSources(f.repo,f.site);assert.deepEqual(r.changed,['assets/models/car.glb','index.html']);assert.equal(r.ok,false);
});
test('rejects an incomplete source tree rather than reporting a false match',async t=>{
  const f=await fixture(t);await rm(join(f.site,'dist/index.html'));await assert.rejects(compareRuntimeSources(f.repo,f.site),/ENOENT/);
});
test('refuses to follow runtime symlinks into unrelated files',async t=>{
  const f=await fixture(t);await writeFile(join(f.root,'outside'),'private');await symlink(join(f.root,'outside'),join(f.repo,'assets/link'));await assert.rejects(compareRuntimeSources(f.repo,f.site),/symlinks are not supported/);
});
test('CLI reports a missing checkout and exits unsuccessfully',()=>{
  const script=fileURLToPath(new URL('../scripts/check-source-parity.mjs',import.meta.url));const r=spawnSync(process.execPath,[script],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/Usage:/);
});
