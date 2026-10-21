import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const checker=fileURLToPath(new URL('../scripts/check-context.mjs',import.meta.url));
function fixture(t){
  const cwd=mkdtempSync(join(tmpdir(),'city-context-policy-'));
  t.after(()=>rmSync(cwd,{recursive:true,force:true}));
  function git(...args){const r=spawnSync('git',args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
  const write=(path,value)=>writeFileSync(join(cwd,path),value);
  const commit=message=>{git('add','.');git('commit','--no-gpg-sign','-qm',message);return git('rev-parse','HEAD');};
  const run=(...args)=>spawnSync(process.execPath,[checker,...args],{cwd,encoding:'utf8',env:{...process.env,CONTEXT_BASE_SHA:'',CONTEXT_HEAD_SHA:''}});
  git('init','-q');git('config','user.name','Context policy test');git('config','user.email','context-test@example.invalid');git('config','commit.gpgsign','false');
  write('PROJECT_CONTEXT.md','# Project context\nBaseline behavior.\n');write('game.js','export const version=1;\n');const base=commit('Baseline');
  return {cwd,git,write,commit,run,base};
}
test('accepts a real context update staged with a gameplay change',t=>{
  const f=fixture(t);f.write('game.js','export const version=2;\n');f.write('PROJECT_CONTEXT.md','# Project context\nVersion 2 changes the game.\n');f.git('add','.');assert.equal(f.run('--staged').status,0);
});
test('rejects staged work when its context edit is only in the working tree',t=>{
  const f=fixture(t);f.write('game.js','export const version=2;\n');f.git('add','game.js');f.write('PROJECT_CONTEXT.md','# Context\nAn unstaged note.\n');const r=f.run('--staged');assert.equal(r.status,1);assert.match(r.stderr,/same commit/);
});
test('rejects whitespace-only context edits',t=>{
  const f=fixture(t);f.write('game.js','export const version=2;\n');f.write('PROJECT_CONTEXT.md','# Project context\n\nBaseline behavior.   \n');f.git('add','.');assert.equal(f.run('--staged').status,1);
});
test('rejects deleting or emptying the context',t=>{
  const f=fixture(t);f.git('rm','PROJECT_CONTEXT.md');assert.equal(f.run('--staged').status,1);f.write('PROJECT_CONTEXT.md',' \n');f.git('add','.');assert.equal(f.run('--staged').status,1);
});
test('accepts no staged work and a context-only improvement',t=>{
  const f=fixture(t);assert.equal(f.run('--staged').status,0);f.write('PROJECT_CONTEXT.md','# Project context\nClarified the current design.\n');f.git('add','.');assert.equal(f.run('--staged').status,0);
});
test('checks every change commit instead of only the combined PR diff',t=>{
  const f=fixture(t);f.write('game.js','export const version=2;\n');const missing=f.commit('Missing context');f.write('PROJECT_CONTEXT.md','# Context\nCatch-up edit.\n');const head=f.commit('Catch-up');const r=f.run(f.base,head);assert.equal(r.status,1);assert.match(r.stderr,new RegExp(missing.slice(0,12)));
});
test('accepts a range with a context update in every commit',t=>{
  const f=fixture(t);for(const n of [2,3]){f.write('game.js',`export const version=${n};\n`);f.write('PROJECT_CONTEXT.md',`# Context\nVersion ${n} behavior and checks.\n`);f.commit(`Version ${n}`);}const r=f.run(f.base,f.git('rev-parse','HEAD'));assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/2 nonempty/);
});
test('rejects a missing context update on a merged side branch',t=>{
  const f=fixture(t),main=f.git('branch','--show-current');f.git('checkout','-qb','side');f.write('side.js','export const side=true;\n');const bad=f.commit('Side change without context');f.git('checkout','-q',main);f.write('PROJECT_CONTEXT.md','# Context\nMain branch documentation change.\n');f.commit('Main context');f.git('merge','--no-gpg-sign','--no-ff','-m','Merge side','side');const r=f.run(f.base,f.git('rev-parse','HEAD'));assert.equal(r.status,1);assert.match(r.stderr,new RegExp(bad.slice(0,12)));
});
test('compares PR work against a common ancestor if main has advanced',t=>{
  const f=fixture(t),main=f.git('branch','--show-current');f.git('checkout','-qb','feature');f.write('feature.js','export const feature=true;\n');f.write('PROJECT_CONTEXT.md','# Context\nFeature behavior.\n');const head=f.commit('Feature with context');f.git('checkout','-q',main);f.write('other.js','export const other=true;\n');f.write('PROJECT_CONTEXT.md','# Context\nOther main work.\n');const advanced=f.commit('Advanced main');assert.equal(f.run(advanced,head).status,0);
});
test('an initial ref checks only its tip instead of pre-policy history',t=>{
  const f=fixture(t);f.write('game.js','export const version=2;\n');f.commit('Old work');f.write('PROJECT_CONTEXT.md','# Context\nAdopt maintained context.\n');const head=f.commit('Policy adoption');const r=f.run('0'.repeat(40),head);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/1 nonempty/);
});
test('rejects invalid, missing or nonexistent commit IDs',t=>{
  const f=fixture(t);for(const args of [[],['--all',f.base],[f.base,'f'.repeat(40)],['--staged','unexpected']])assert.equal(f.run(...args).status,1);assert.equal(f.run(f.base,f.base).status,0);
});
