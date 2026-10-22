import {createReadStream} from 'node:fs';
import {lstat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

async function regular(path,label){
  const info=await lstat(path);
  if(!info.isFile()||info.isSymbolicLink())throw new Error(`${label} must be a regular file.`);
}
async function inventory(root){
  await regular(join(root,'index.html'),'index.html');
  const files=['index.html'];
  async function walk(directory,prefix){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const path=join(directory,entry.name),name=`${prefix}/${entry.name}`;
      if(entry.isSymbolicLink())throw new Error(`Runtime symlinks are not supported: ${name}`);
      if(entry.isDirectory())await walk(path,name);
      else if(entry.isFile())files.push(name);
      else throw new Error(`Runtime entry must be a regular file: ${name}`);
    }
  }
  await walk(join(root,'assets'),'assets');return files.sort();
}
async function digest(path){
  const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');
}
// Read-only comparison of the complete shipped tree. Repo docs, tests, hosting
// identity, credentials, caches and node_modules are deliberately outside it.
export async function compareRuntimeSources(repoRoot,siteCheckout){
  const siteRoot=join(siteCheckout,'dist');
  const [repoFiles,siteFiles]=await Promise.all([inventory(repoRoot),inventory(siteRoot)]);
  const repoSet=new Set(repoFiles),siteSet=new Set(siteFiles);
  const missing=siteFiles.filter(path=>!repoSet.has(path));
  const extra=repoFiles.filter(path=>!siteSet.has(path));
  const changed=[];
  for(const path of repoFiles.filter(path=>siteSet.has(path))){
    const hashes=await Promise.all([digest(join(repoRoot,path)),digest(join(siteRoot,path))]);
    if(hashes[0]!==hashes[1])changed.push(path);
  }
  return {ok:!missing.length&&!extra.length&&!changed.length,compared:repoFiles.length-extra.length,missing,extra,changed};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3)throw new Error('Usage: node scripts/check-source-parity.mjs /absolute/path/to/site-checkout');
    const result=await compareRuntimeSources(fileURLToPath(new URL('../',import.meta.url)),resolve(process.argv[2]));
    if(result.ok)console.log(`Runtime sources match: ${result.compared} files, including index.html and all assets.`);
    else{console.error('Runtime source drift detected. Review differences before publishing or copying files.');for(const [key,title] of [['missing','Missing from repository'],['extra','Repository-only assets'],['changed','Different contents']])for(const path of result[key])console.error(`${title}: ${path}`);process.exitCode=1;}
  }catch(error){console.error(`Runtime parity check failed: ${error.message}`);process.exitCode=1;}
}
