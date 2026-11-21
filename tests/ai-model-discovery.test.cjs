'use strict';
const {JSDOM,VirtualConsole}=require('jsdom');
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('audit-google-auto.html','utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const calls=[],errors=[];let mode='normal', release;
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.TextEncoder=require('node:util').TextEncoder;w.TextDecoder=require('node:util').TextDecoder;w.scrollTo=()=>{};
  w.fetch=async(url,init={})=>{
   url=String(url);calls.push({url,init});
   if(mode==='delay') await new Promise(r=>{release=r});
   let data;
   if(url.includes('together.ai')) data=mode==='invalid'?{unexpected:[]}:[{id:'org/chat',type:'chat'},{id:'weird-id',type:'embedding'}];
   else if(url.includes('cohere.com')) data=url.includes('page_token=')?{models:[{name:'command-second',endpoints:['chat']}]}:{models:[{name:'command-first',endpoints:['chat']},{name:'embed-model',endpoints:['embed']}],next_page_token:'abc+/='};
   else if(url.includes('anthropic')) data=url.includes('after_id=')?{data:[{id:'claude-second',display_name:'Claude Second'}],has_more:false,last_id:'claude-second'}:{data:[{id:'claude-first'}],has_more:true,last_id:'claude-first'};
   else data={data:[{id:'org/model'}]};
   if(mode==='cycle'&&url.includes('anthropic'))data={data:[{id:'claude-first'}],has_more:true,last_id:'claude-first'};
   return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>data};
  };
 }});
 try {
  await wait(130);const w=dom.window,api=w.HesabrasiAI,doc=w.document;
  const together=doc.querySelector('[data-aihub-card="together"]');
  const key=together.querySelector('[data-f="key"]');key.value='short-key';key.dispatchEvent(new w.Event('input',{bubbles:true}));
  together.querySelector('[data-act="test"]').click();await wait(90);
  assert.deepEqual(calls.filter(x=>x.url.includes('together.ai')).map(x=>x.init.method),['GET']);
  const options=together.querySelector('[data-f="dynamic-model-select"]').textContent;
  assert.match(options,/org\/chat/);assert.doesNotMatch(options,/weird-id/);
  assert.match(together.textContent,/فهرست دریافت شد/);
  let result=await api.fetchModelsCatalog('anthropic','anthropic-key',true);
  assert.deepEqual(Array.from(result.textModels,x=>x.id),['claude-first','claude-second']);
  assert(calls.some(x=>x.url==='https://api.anthropic.com/v1/models?after_id=claude-first'));
  result=await api.fetchModelsCatalog('cohere','cohere-key',true);
  assert.deepEqual(Array.from(result.textModels,x=>x.id),['command-first','command-second']);
  assert(calls.some(x=>x.url==='https://api.cohere.com/v1/models?page_token=abc%2B%2F%3D'));
  mode='cycle';assert.equal(await api.fetchModelsCatalog('anthropic','anthropic-key',true),null);
  mode='invalid';assert.equal(await api.fetchModelsCatalog('together','short-key',true),null);
  assert.match(together.querySelector('[data-dynamic-model-status]').textContent,/نامعتبر/);
  mode='delay';let pending=api.fetchModelsCatalog('together','short-key',true);while(!release)await wait(2);
  key.value='new';key.dispatchEvent(new w.Event('input',{bubbles:true}));release();assert.equal(await pending,null);
  assert.doesNotMatch(together.querySelector('[data-f="dynamic-model-select"]').textContent,/org\/chat/);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Model discovery: click without model, Together array, Anthropic pages, invalid responses and key race PASS');
 } finally {dom.window.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
