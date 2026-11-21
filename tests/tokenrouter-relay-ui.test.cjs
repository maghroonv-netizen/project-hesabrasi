'use strict';
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('audit-google-auto.html','utf8'),calls=[],errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {handleRequest}=await import('../tokenrouter-cloudflare-worker.mjs');const secret='z'.repeat(48),env={ALLOWED_ORIGIN:'null',BRIDGE_ACCESS_KEY:secret};
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://file.test/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.TextEncoder=require('node:util').TextEncoder;w.TextDecoder=require('node:util').TextDecoder;w.scrollTo=()=>{};w.confirm=()=>true;
  w.fetch=async(url,init={})=>{calls.push({url:String(url),init});if(String(url).startsWith('https://relay.example/')){
   const headers={...init.headers,origin:'null'};return handleRequest(new Request(String(url),{method:init.method,headers,body:init.body}),env,async(u,o)=>{assert.match(u,/^https:\/\/api\.tokenrouter\.com\/v1\//);assert.equal(o.headers.get('authorization'),'Bearer provider-key');return new Response(JSON.stringify({data:[{id:'vendor/model-free'}]}),{status:200,headers:{'content-type':'application/json'}})});
  }return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({data:[{id:'direct'}]})};};
 }});
 try{
  await wait(150);const w=dom.window,card=w.document.querySelector('[data-aihub-card="tokenrouter"]');
  const key=card.querySelector('[data-f="key"]');key.value='provider-key';key.dispatchEvent(new w.Event('change',{bubbles:true}));
  card.querySelector('[data-f="relay-origin"]').value='https://relay.example';card.querySelector('[data-f="relay-key"]').value=secret;
  card.querySelector('[data-act="relay-enable"]').click();assert.match(card.querySelector('[data-relay-status]').textContent,/فعال/);
  assert(!w.localStorage.getItem('hesabrasi.aicore.v1').includes(secret));
  card.querySelector('[data-act="refresh-models"]').click();await wait(100);
  assert.equal(calls.at(-1).url,'https://relay.example/v1/models');assert.equal(calls.at(-1).init.headers['X-Hesabrasi-Bridge-Key'],secret);assert.equal(calls.at(-1).init.redirect,'error');
  assert.match(card.querySelector('[data-f="dynamic-model-select"]').textContent,/vendor\/model-free/);
  const req=w.HesabrasiAI.prepareTokenRouterRelay('https://api.tokenrouter.com/v1/chat/completions',{headers:{Authorization:'Bearer provider-key'}},{provider:'tokenrouter'});
  assert.equal(req.url,'https://relay.example/v1/chat/completions');assert.equal(req.options.headers['X-Hesabrasi-Bridge-Key'],secret);
  assert.equal(w.HesabrasiAI.prepareTokenRouterRelay('https://evil.example/v1/models',{}, {provider:'tokenrouter'}).url,'https://evil.example/v1/models');
  card.querySelector('[data-act="relay-disable"]').click();assert.equal(w.HesabrasiAI.prepareTokenRouterRelay('https://api.tokenrouter.com/v1/models',{}, {provider:'tokenrouter'}).url,'https://api.tokenrouter.com/v1/models');
  assert.equal(errors.length,0,errors.join('\n'));console.log('TokenRouter relay UI: explicit opt-in, isolated headers, models and disable PASS');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
