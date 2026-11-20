'use strict';
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const hits=[],errors=[];
(async()=>{
 const {createLocalProxy}=await import('../ai-local-proxy.mjs');
 const server=createLocalProxy({fetchImpl:async(url,options)=>{
  hits.push({url,options});
  if(url.endsWith('/models'))return new Response(JSON.stringify({data:[{id:'vendor/model-free',context_length:30000,top_provider:{max_completion_tokens:1000},pricing:{prompt:'0',completion:'0'}}]}),{status:200,headers:{'content-type':'application/json'}});
  if(url.includes('api.tokenrouter.com'))return new Response(JSON.stringify({error:{message:'rate limit'}}),{status:429,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'success via bridge'}}],usage:{prompt_tokens:30,completion_tokens:5,total_tokens:35}}),{status:200,headers:{'content-type':'application/json'}});
 }});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,origin=`http://127.0.0.1:${port}`;
 const html=await (await fetch(origin+'/audit-google-auto.html')).text();
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{runScripts:'dangerously',url:origin+'/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.TextEncoder=require('node:util').TextEncoder;w.TextDecoder=require('node:util').TextDecoder;w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');setTimeout(()=>this.querySelector('[data-ad-accept]')?.click(),0);};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  w.fetch=(url,init)=>fetch(new URL(String(url),origin),init);
 }});
 try{
  const w=dom.window,doc=w.document;await new Promise(r=>setTimeout(r,100));assert.equal(w.HESABRASI_AI_PROXY,true);
  function setup(id,key){const card=doc.querySelector(`[data-aihub-card="${id}"]`);const field=card.querySelector('[data-f="key"]');field.value=key;field.dispatchEvent(new w.Event('change',{bubbles:true}));card.querySelector('[data-act="save"]').click();return card;}
  setup('tokenrouter','token-key');const second=setup('next_router','next-key');
  for(const [f,v] of [['fallback-context','30000'],['fallback-output','1000']]){const el=second.querySelector(`[data-f="${f}"]`);el.value=v;el.dispatchEvent(new w.Event('change',{bubbles:true}));}
  const flag=doc.getElementById('aihubFailover');flag.checked=true;flag.dispatchEvent(new w.Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,300));
  const result=await w.eval("routerRequest([{role:'user',content:'test evidence'}],100,{purpose:'test'})");assert.equal(result.ok,true,result.detail);assert.equal(result.text,'success via bridge');
  const chats=hits.filter(h=>h.url.endsWith('/chat/completions'));assert.equal(chats.length,2);assert.equal(chats[0].url,'https://api.tokenrouter.com/v1/chat/completions');assert.equal(chats[1].url,'https://nextrouter.me/v1/chat/completions');assert.equal(chats[0].options.headers.authorization,'Bearer token-key');assert.equal(chats[1].options.headers.authorization,'Bearer next-key');
  const ledger=JSON.parse(w.localStorage.getItem('audit-ai-usage-v1'));const entries=ledger.entries.filter(e=>e.requestClass==='generation');assert.equal(entries.length,2);assert.equal(entries[0].httpStatus,429);assert.equal(entries[1].reason,'provider-failover');assert(!JSON.stringify(ledger).includes('token-key'));assert(!JSON.stringify(ledger).includes('test evidence'));assert.equal(errors.length,0,errors.join('\n'));
  console.log('Local bridge end-to-end: UI, catalog, two credentials, 429 failover and ledger PASS');
 }finally{dom.window.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
