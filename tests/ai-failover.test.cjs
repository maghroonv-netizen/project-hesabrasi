'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('audit-google-auto.html', 'utf8');
function extract(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert(a >= 0 && b > a, start);
  return html.slice(a, b);
}
const runCode = extract(' async function run(job,p,s,purpose,current,operation){', '\n const decision=');
const candidateCode = extract(' function failoverCandidates(primary){', '\n function approve(');
const slots = [
  {id:'a', name:'A',key:'key-a', model:'primary',wireProvider:'a',kind:'openai',extra:{fallbackContext:10000,fallbackOutput:1000,fallbackModels:['a2']}},
  {id:'b', name:'B',key:'key-b', model:'b1',wireProvider:'b',kind:'openai',extra:{fallbackContext:5000,fallbackOutput:500,fallbackModels:[]}},
  {id:'c', name:'C',key:'key-c', model:'c1',wireProvider:'c',kind:'openai',extra:{}}
];
let enabled=true, matches=true, results=[], calls=[];
const ctx={
  window:{HesabrasiAI:true},
  HesabrasiAI:{failoverEnabled:()=>enabled,readySlots:()=>slots,snapshotMatches:()=>matches},
  adPositive:x=>Number.isSafeInteger(x)&&x>0?x:null,
  adManualProfile:(model,context)=>({model,contextTokens:context}),
  adIsReasoningModel:()=>false,
  adFits:(p,m,o)=>p.contextTokens>=1000 && o<=p.outputTokens,
  fresh:()=>true,
  wire:async(job,p,s,meta)=>{calls.push({p,s,meta});return results.shift();},
  usageDecision:()=>{},
  JSON,Set,Error
};
vm.createContext(ctx);vm.runInContext(candidateCode+'\n'+runCode,ctx);
(async()=>{
  enabled=false; assert.equal(ctx.failoverCandidates({slotId:'a',model:'primary'}).length,0);
  enabled=true;
  const chain=ctx.failoverCandidates({slotId:'a',model:'primary'});
  assert.deepEqual(Array.from(chain,x=>x.model),['a2','b1']);
  assert.equal(chain[0].key,'key-a');assert.equal(chain[1].key,'key-b');
  const p={contextTokens:10000},s={p,key:'key-a',model:'primary',provider:'a',slotId:'a'};
  const job={messages:[{role:'user',content:'test'}],output:200};
  const op={plan:{chain},activeCandidate:-1};
  results=[{ok:false,retryable:true,detail:'429'},{ok:true,text:'ok'}];
  let r=await ctx.run(job,p,s,'analysis',()=>true,op);
  assert.equal(r.text,'ok');assert.equal(calls.length,2);assert.equal(calls[1].s.model,'a2');assert.equal(calls[1].s.key,'key-a');assert.equal(op.activeCandidate,0);
  calls=[];results=[{ok:false,retryable:true,detail:'429'},{ok:true,text:'b'}];
  r=await ctx.run(job,p,s,'analysis',()=>true,op);assert.equal(r.text,'b');assert.equal(calls[1].s.key,'key-b');assert.equal(op.activeCandidate,1);
  calls=[];results=[{ok:false,retryable:false,detail:'network unknown'}];op.activeCandidate=-1;
  await assert.rejects(ctx.run(job,p,s,'analysis',()=>true,op),/network unknown/);assert.equal(calls.length,1);
  calls=[];results=[{ok:false,retryable:true,detail:'429'}];matches=false;
  await assert.rejects(ctx.run(job,p,s,'analysis',()=>true,op),/تنظیمات/);assert.equal(calls.length,1);matches=true;
  calls=[];op.activeCandidate=-1;results=[{ok:false,retryable:true,detail:'429'},{ok:true,text:'a'}];
  const large={...job,output:700};r=await ctx.run(large,p,s,'analysis',()=>true,op);assert.equal(r.text,'a');
  calls=[];op.activeCandidate=-1;results=[{ok:false,retryable:true,detail:'429'},{ok:false,retryable:true,detail:'429'}];
  await assert.rejects(ctx.run(large,p,s,'analysis',()=>true,op),/429/);assert.equal(calls.length,2,'incompatible third candidate not called');
  assert.match(html,/\[402,429,500,502,503,504,529\]\.includes\(response.status\)/);
  assert.match(html,/exported\.slots\[id\]\.key = ''/);
  console.log('AI failover: opt-in, order, model/provider switching, explicit errors, capacity and configuration checks PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
