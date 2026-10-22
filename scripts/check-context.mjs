import {spawnSync} from 'node:child_process';

const documentPath='PROJECT_CONTEXT.md';
const zero=/^0{40,64}$/;
const sha=/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i;
const meaningful=text=>text.replace(/\s/g,'');

function git(args,optional=false){
  const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024});
  if(result.error)throw result.error;
  if(result.status!==0){if(optional)return null;throw new Error(`Git could not inspect ${args[0]}. Fetch the full history and verify the supplied commit SHAs.`);}
  return result.stdout;
}
function content(revision){return git(['show',`${revision}:${documentPath}`],true)??'';}
function verify(label,files,before,after){
  if(!files.length)return false;
  if(!files.includes(documentPath)||!meaningful(after)||meaningful(before)===meaningful(after)){
    throw new Error(`${label} changes tracked files without a meaningful ${documentPath} update. Update the affected sections and dated change ledger in this same commit. Whitespace-only edits, deleting the document, or a later catch-up commit do not satisfy the policy.`);
  }
  return true;
}
function lines(value){return value.trim().split('\n').filter(Boolean);}
function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--staged'){
    const files=lines(git(['diff','--cached','--name-only','--no-renames']));
    const checked=verify('Staged work',files,content('HEAD'),git(['show',`:${documentPath}`],true)??'');
    console.log(checked?'Context update is staged with the change.':'No staged changes to check.');return;
  }
  if(args.length&&args.length!==2)throw new Error('Usage: node scripts/check-context.mjs --staged | BASE_SHA HEAD_SHA');
  const base=args[0]??process.env.CONTEXT_BASE_SHA,head=args[1]??process.env.CONTEXT_HEAD_SHA;
  if(!sha.test(base??'')||!sha.test(head??'')||zero.test(head))throw new Error('Supply full BASE_SHA and HEAD_SHA commit IDs, or use --staged.');
  git(['cat-file','-e',`${head}^{commit}`]);
  let commits;
  if(zero.test(base)){
    // Initial ref creation checks its tip; pre-policy repository history is not rewritten.
    commits=[head];
  }else{
    git(['cat-file','-e',`${base}^{commit}`]);
    const ancestor=git(['merge-base',base,head]).trim();
    commits=lines(git(['rev-list','--reverse',`${ancestor}..${head}`]));
  }
  let checked=0;
  for(const commit of commits){
    const parent=git(['rev-parse','--verify',`${commit}^1`],true)?.trim();
    const files=parent?lines(git(['diff','--name-only','--no-renames',parent,commit])):lines(git(['diff-tree','--root','--no-commit-id','--name-only','-r',commit]));
    if(verify(`Commit ${commit.slice(0,12)}`,files,parent?content(parent):'',content(commit)))checked++;
  }
  console.log(`Context policy passed for ${checked} nonempty change commit(s).`);
}
try{main();}catch(error){console.error(`Context policy failed: ${error.message}`);process.exitCode=1;}
