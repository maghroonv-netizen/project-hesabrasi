'use strict';
const {JSDOM,VirtualConsole}=require('jsdom');
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('audit-google-auto.html','utf8');
const registry=JSON.parse(fs.readFileSync('ai-provider-registry.json','utf8'));
function makeDom(saved){
 const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.TextEncoder=require('node:util').TextEncoder;w.TextDecoder=require('node:util').TextDecoder;w.scrollTo=()=>{};w.confirm=()=>true;
  if(saved)w.localStorage.setItem('hesabrasi.aicore.v1',saved);
  w.fetch=async(url,init={})=>{calls.push({url:String(url),init});return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({data:[{id:'vendor/paid',pricing:{prompt:'0.5',completion:'0.5'}},{id:'vendor/example-free'}]})};};
 }});return {dom,errors,calls};
}
(async()=>{
 const {dom,errors,calls}=makeDom();const w=dom.window;await new Promise(r=>setTimeout(r,80));const api=w.HesabrasiAI,doc=w.document;
 assert(registry.providers.length>=45);assert(api.catalog.length>=60);
 for(const p of registry.providers){const spec=api.catalog.find(x=>x.id===p.id);assert(spec,p.id);assert.equal(spec.base,p.base,p.id);assert(doc.querySelector(`[data-aihub-card="${p.id}"]`),p.id);}
 const priceCatalog={data:[{id:'price-test',context_length:10000,pricing:{prompt:'0.5',completion:'0.5'}}]};assert.equal(w.adCatalogProfile(priceCatalog,'price-test','huggingface').inputPrice,null);assert.equal(w.adCatalogProfile(priceCatalog,'price-test','open_router').inputPrice,0.5);assert.equal(w.usageEstimate({provider:'huggingface',model:'price-test',input:1,output:1,adaptiveRate:{input:1,output:1}}),null);
 assert.equal(api.catalog.find(p=>p.id==='tokenrouter').base,'https://api.tokenrouter.com/v1');
 assert.equal(api.catalog.find(p=>p.id==='next_router').base,'https://nextrouter.me/v1');
 assert.equal(api.catalog.find(p=>p.id==='next_router_justscriptzz').base,'https://nextrouter.justscriptzz.workers.dev/api/v1');
 assert.equal(api.catalog.find(p=>p.id==='tooken_club').base,'https://tooken.club/v1');
 const search=doc.getElementById('aihubSearch');search.value='NextRouter';search.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(doc.querySelector('[data-aihub-card="tokenrouter"]').hidden,true);assert.equal(doc.querySelector('[data-aihub-card="next_router"]').hidden,false);assert.equal(doc.querySelector('[data-aihub-card="next_router_justscriptzz"]').hidden,false);
 search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));
 await api.fetchModelsCatalog('tokenrouter','sample-key',true);
 const token=doc.querySelector('[data-aihub-card="tokenrouter"]');assert.equal(token.querySelector('[data-f="model"]').value,'vendor/example-free');
 assert.match(token.querySelector('[data-f="dynamic-model-select"]').textContent,/نرخ توکن غیرصفر/);
 assert.match(token.querySelector('[data-f="dynamic-model-select"]').textContent,/شناسه با free/);
 assert.equal(calls.at(-1).url,'https://api.tokenrouter.com/v1/models');
 const open=doc.querySelector('[data-aihub-card="open_router"]');open.querySelector('[data-act="select-free-router"]').click();assert.equal(open.querySelector('[data-f="model"]').value,'openrouter/free');
 const name=doc.getElementById('aihubCustomName');name.value='My Provider A';doc.getElementById('aihubAddCustom').click();
 let created=api.catalog.find(x=>x.userDefined&&x.name==='My Provider A');assert(created);const id=created.id,card=doc.querySelector(`[data-aihub-card="${id}"]`);
 function change(f,val){const field=card.querySelector(`[data-f="${f}"]`);field.value=val;field.dispatchEvent(new w.Event('change',{bubbles:true}));}
 change('base','https://my-provider.example/v1');change('dynamic-model-manual','model-free');card.querySelector('[data-act="save"]').click();
 assert.equal(api.chatUrl({provider:id,slotId:id,model:'model-free'}),'https://my-provider.example/v1/chat/completions');
 name.value='My Provider B';doc.getElementById('aihubAddCustom').click();assert.equal(api.catalog.filter(x=>x.userDefined).length,2);
 const saved=w.localStorage.getItem('hesabrasi.aicore.v1');assert(saved.includes(id));assert.equal(errors.length,0,errors.join('\n'));dom.window.close();
 const restored=makeDom(saved);await new Promise(r=>setTimeout(r,80));const restoredApi=restored.dom.window.HesabrasiAI;
 assert.equal(restoredApi.catalog.filter(x=>x.userDefined).length,2);assert(restoredApi.catalog.some(x=>x.id===id));
 assert.equal(restoredApi.chatUrl({provider:id,slotId:id,model:'model-free'}),'https://my-provider.example/v1/chat/completions');
 restored.dom.window.document.querySelector(`[data-aihub-card="${id}"] [data-act="remove-custom"]`).click();assert(!restoredApi.catalog.some(x=>x.id===id));assert.equal(restored.errors.length,0,restored.errors.join('\n'));restored.dom.window.close();
 console.log('Provider registry UI: 60+ presets, distinct routers, free-model hints, search, and custom persistence PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
