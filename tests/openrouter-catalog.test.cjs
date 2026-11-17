#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
let pass=0;function test(name,fn){fn();pass++;console.log('PASS — '+name);}
function extract(startToken,endToken){const a=html.indexOf(startToken);assert(a>=0,'missing '+startToken);const b=html.indexOf(endToken,a);assert(b>a,'missing boundary '+endToken);return html.slice(a,b);}
test('OpenRouter catalog no longer defines cost tiers, caps, or a curated-preview-only allowlist',()=>{
  assert.doesNotMatch(html,/OPENROUTER_MAX_PRICE_PER_M|OPENROUTER_EXTENDED_MAX_OUTPUT_PER_M|costTier|isOpenRouterPreviewModel/);
  assert.match(html,/انتخاب مدل از فهرست کامل OpenRouter/);
  assert.match(html,/هیچ سقف قیمتی برای نمایش اعمال نمی‌شود/);
});
test('The catalog cache keeps every text/chat model regardless of price or missing price metadata',()=>{
  const code=extract('function storeCachedCatalog(provider, rawCatalog, keyFp) {','\n  function getCachedCatalog');
  const context={modelCache:{},filterAndSortTextModels(raw){return {models:raw.data.slice(),rejectedCount:0,totalRaw:raw.data.length};},Date};vm.createContext(context);vm.runInContext(code,context);
  const rows=[
    {id:'free/provider-model',inPerM:0,outPerM:0},
    {id:'premium/provider-model',inPerM:12,outPerM:28},
    {id:'unknown-price/provider-model',inPerM:null,outPerM:null}
  ];
  vm.runInContext('storeCachedCatalog("open_router", {data: catalogRows}, "fp")',Object.assign(context,{catalogRows:rows}));
  const cached=context.modelCache.open_router;
  assert.deepEqual(cached.textModels.map(x=>x.id),rows.map(x=>x.id));
  assert.equal(cached.rejectedCount,0);
  assert.equal(cached.textModels.some(x=>Object.hasOwn(x,'costTier')),false);
});
test('Model selector labels do not tag models as free/paid and fallback order is not price-based',()=>{
  const code=extract('function formatOptionLabel(m) {','\n  function getDisplayModels');
  const context={};vm.createContext(context);vm.runInContext(code,context);
  const free=context.formatOptionLabel({id:'free/demo',name:'Free demo',context:8000,inPerM:0,outPerM:0});
  const costly=context.formatOptionLabel({id:'paid/demo',name:'Paid demo',inPerM:14,outPerM:31});
  assert.doesNotMatch(free,/رایگان|\$/);assert.doesNotMatch(costly,/\$/);
  assert.match(html,/var models = parsed\.models\.slice\(\)/);
  assert.match(html,/sort\(function \(a, b\) \{ return a\.rank - b\.rank; \}\)/);
  assert.doesNotMatch(html,/inPerM \+ a\.outPerM/);
});
test('Chat filter keeps text-compatible multimodal models and ignores modality-specific prices',()=>{
  const code=extract('var NON_TEXT_ID_RE =','\n  function toPerMillion');
  const context={};vm.createContext(context);vm.runInContext(code,context);
  const canChat=(id,architecture,pricing)=>context.isTextOnlyModel({id,name:id,architecture,pricing});
  assert.equal(canChat('vendor/text-chat',{input_modalities:['text'],output_modalities:['text']},{image:'0.02'}),true);
  assert.equal(canChat('vendor/vision-chat',{input_modalities:['text','image'],output_modalities:['text']},{}),true);
  assert.equal(canChat('vendor/chat-image',{input_modalities:['text','image'],output_modalities:['text']},{}),true);
  assert.equal(canChat('vendor/multimodal-chat',{modality:'text+image->text+audio'},{}),true);
  assert.equal(canChat('vendor/image-only',{input_modalities:['text'],output_modalities:['image']},{}),false);
  assert.equal(canChat('vendor/embeddings',{input_modalities:['text'],output_modalities:['embedding']},{}),false);
});
test('Every model returned by the full live list is offered in the dropdown',()=>{
  assert.match(html,/var allModels = getDisplayModels\('open_router'\)/);
  assert.match(html,/var optionHtml = allModels\.map\(function \(m\)/);
  assert.doesNotMatch(html,/allModels\.filter\(function \(m\).*inPerM|allModels\.filter\(function \(m\).*outPerM/);
});
console.log(`OpenRouter catalog checks: ${pass}/5 PASS; 0 FAIL`);
