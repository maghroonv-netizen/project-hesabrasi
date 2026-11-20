'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
let failPrimary=true;
const html=fs.readFileSync('audit-google-auto.html','utf8'),calls=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.TextEncoder=require('node:util').TextEncoder;w.TextDecoder=require('node:util').TextDecoder;w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');setTimeout(()=>this.querySelector('[data-ad-accept]')?.click(),0);};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 w.fetch=async(url,init={})=>{url=String(url);calls.push({url,init});let status=200,data;
  if(url.includes('/chat/completions')){if(url.includes('openrouter.ai')&&failPrimary){status=429;data={error:{message:'rate limit'}};}else data={choices:[{finish_reason:'stop',message:{content:'test response'}}],usage:{prompt_tokens:20,completion_tokens:4,total_tokens:24}};}
  else if(url.includes('openrouter.ai'))data={data:[{id:'inclusionai/ling-3.0-flash',context_length:30000,top_provider:{max_completion_tokens:1000}}]};
  else data={data:[{id:'llama-3.3-70b-versatile',context_length:30000,top_provider:{max_completion_tokens:1000}}]};
  return {ok:status===200,status,headers:{get:()=> 'application/json'},json:async()=>data};
 };
}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await wait(120);const w=dom.window,doc=w.document;
 function set(card,f,value){const el=card.querySelector(`[data-f="${f}"]`);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));}
 const first=doc.querySelector('[data-aihub-card="open_router"]'),second=doc.querySelector('[data-aihub-card="groq"]');
 set(first,'key','primary-key');first.querySelector('[data-act="save"]').click();
 set(second,'key','fallback-key');set(second,'fallback-context','30000');set(second,'fallback-output','1000');second.querySelector('[data-act="save"]').click();
 const toggle=doc.getElementById('aihubFailover');toggle.checked=true;toggle.dispatchEvent(new w.Event('change',{bubbles:true}));
 await wait(100);
 const result=await w.eval("routerRequest([{role:'user',content:'safe test'}],100,{purpose:'test'})");
 assert.equal(result.ok,true,result.detail);assert.equal(result.text,'test response');
 const posts=calls.filter(c=>c.url.includes('/chat/completions'));assert.equal(posts.length,2,JSON.stringify(calls.map(c=>c.url)));
 assert.equal(posts[0].init.headers.Authorization,'Bearer primary-key');assert.equal(posts[1].init.headers.Authorization,'Bearer fallback-key');
 const ledger=JSON.parse(w.localStorage.getItem('audit-ai-usage-v1')), entries=ledger.entries.filter(e=>e.requestClass==='generation'&&e.purpose==='test');
 assert.equal(entries.length,2);assert.equal(entries[0].httpStatus,429);assert.equal(entries[1].httpStatus,200);assert.equal(entries[1].reason,'provider-failover');assert.equal(entries[0].operationId,entries[1].operationId);const op=ledger.operations.find(o=>o.operationId===entries[0].operationId);assert.equal(op.status,'completed');assert.equal(op.usedAttempts,2);
 failPrimary=false;const success=await w.eval("routerRequest([{role:'user',content:'second test'}],100,{purpose:'test'})");assert.equal(success.ok,true,success.detail);const after=JSON.parse(w.localStorage.getItem('audit-ai-usage-v1'));const latest=after.operations.filter(o=>o.purpose==='test').at(-1);assert.equal(latest.status,'completed');assert.equal(latest.usedAttempts,1);assert.equal(latest.plannedJobs[1].status,'not_run');
 assert(!JSON.stringify(ledger).includes('primary-key'));assert(!JSON.stringify(ledger).includes('fallback-key'));assert(!JSON.stringify(ledger).includes('safe test'));
 assert.equal(errors.length,0,errors.join('\n'));console.log('End-to-end UI operation: consent, real ledger, 429 and cross-provider success PASS');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
