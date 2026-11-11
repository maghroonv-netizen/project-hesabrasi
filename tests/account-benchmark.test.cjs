const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
if(!html.includes('data-act="benchmark-capacity"')||!html.includes('Synthetic request-capacity probe'))throw Error('OpenRouter settings must retain synthetic capacity probes');
if(html.includes('accountBenchmarkPanel')||html.includes('accountCompareSelectorHTML')||html.includes('window.HesabrasiAccountBenchmark'))throw Error('the worksheet model-comparison panel should be removed');
if(html.includes('data-rerun="both"')||html.includes('اجرای مجدد کامل کاربرگ'))throw Error('the combined worksheet rerun action should be removed');
if(html.includes('مقایسهٔ اکسل، شرح اسناد ارسالی و پاسخ — بدون AI')||html.includes('data-ai-trace')||html.includes('function adTraceCreate'))throw Error('Excel/request/response comparison feature should be removed');
if(html.includes('natureEvidenceLab')||html.includes('natureEvidenceBuild')||html.includes('آزمایش محلی قرارداد شواهد'))throw Error('local evidence-contract experiment should be removed');
if(html.includes('خروجی بازبینی برای برنامه‌نویس')||html.includes('auditDebugJson')||html.includes('auditDebugTxt'))throw Error('programmer review export should be removed');
if(html.includes('anaQuickModelSelect')||html.includes('anaAddRow')||html.includes('anaResetRows'))throw Error('account-analysis active model and worksheet row controls should be removed');
if(html.includes('One safe handshake retry'))throw Error('automatic POST retry must remain disabled until attempt accounting supports it');
const wireStart=html.indexOf('async function wire(job,p,s,meta,current,operation)'),wireEnd=html.indexOf('async function run(job,p,s,purpose,current,operation)',wireStart),wireSource=html.slice(wireStart,wireEnd);
if(wireStart<0||wireEnd<0||!wireSource.includes('usageFetch(')||/readySlots\(|stampFrom\(|shouldSwitch\(/.test(wireSource))throw Error('adaptive generation must log one selected model attempt and not fail over automatically');
if(!html.includes('گزارش پایدار تلاش API')||!html.includes("usageState==='unknown'"))throw Error('attempt logging must fail closed and retain unknown usage as unknown');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.TextEncoder=require('util').TextEncoder;w.TextDecoder=require('util').TextDecoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.fetch=async()=>{throw new Error('unexpected network')}}});
const w=dom.window;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;this.querySelectorAll('button')[0]?.click();};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
const key='sk-or-test-key';let models=['vendor/model-a','vendor/model-b'];
let raw={data:[]},activeSlots=[];
const fakeAI={
 readySlots:()=>activeSlots,
 fetchModelsCatalog:async()=>({raw,textModels:models.map(id=>({id}))}),getCachedCatalog:()=>raw,modelsUrl:()=> 'https://openrouter.ai/api/v1/models',modelsHeaders:()=>({}),
 stampFrom:(slot,s)=>({p:s&&s.p,key:slot.key,model:slot.model,provider:slot.wireProvider,failover:true,slotId:slot.id,extra:{}}),
 chatUrl:()=> 'https://openrouter.ai/api/v1/chat/completions',chatHeaders:()=>({Authorization:'Bearer test'}),
 isGemini:()=>false,isAnthropic:()=>false,isCool:()=>false,noteOk:()=>{},noteFail:()=>{},shouldSwitch:()=>true
};
w.HesabrasiAI=fakeAI;
let requestModels=[],requestBodies=[],failNextNetwork=false,nextHttpStatus=null;
w.fetch=async(url,init)=>{if(init.method==='GET')return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>raw};const body=JSON.parse(init.body);requestModels.push(body.model);requestBodies.push(body);if(failNextNetwork){failNextNetwork=false;throw new TypeError('simulated network loss');}if(nextHttpStatus!==null){const status=nextHttpStatus;nextHttpStatus=null;return {ok:false,status,headers:{get:()=> 'application/json'},json:async()=>({error:{message:'rate limit'}})};}return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({choices:[{finish_reason:'stop',message:{content:'READY'}}],usage:{prompt_tokens:100,completion_tokens:5,total_tokens:105}})};};
(async()=>{try{
  raw.data=models.map(id=>({id,context_length:65536,pricing:{prompt:'0.000001',completion:'0.000002'},supported_parameters:['max_tokens','temperature']}));
  activeSlots=[{id:'open_router',key,model:models[0],wireProvider:'open_router'}];
  w.eval('ANA.out=[];ANA.active=0;');
  const first=await w.HesabrasiCapacityBenchmark.run();
  const expected=first.results.reduce((n,x)=>n+x.trials.length,0);
  if(first.actualCalls!==expected||requestModels.length!==expected||first.results.length!==2||first.results.some(x=>x.trials.length!==first.stageCount||!x.inputTokens||x.status!=='پاسخ متنی دریافت شد'))throw Error('capacity probes must run sequentially and record actual usage');
  if(requestBodies.some(b=>JSON.stringify(b).toLowerCase().includes('حساب آزمایشی')||!JSON.stringify(b).toLowerCase().includes('synthetic')))throw Error('capacity probes must contain only synthetic input');
  if(first.plannedCost>10)throw Error('capacity probe estimate exceeded the existing $10 capacity-test budget');
  let usage=JSON.parse(w.localStorage.getItem('audit-ai-usage-v1'));let probeEntries=usage.entries.filter(e=>e.recordType==='http_attempt'&&e.purpose==='capacity-probe');
  if(probeEntries.length!==first.actualCalls||probeEntries.some(e=>!e.operationId||e.attemptIndex!==1||!e.model||!e.provider||!e.requestUtf8Bytes||e.usageState!=='reported'))throw Error('each actual capacity POST must have its own persisted record, actual model/provider, request size and usage');
  const capacityOperation=usage.operations.find(o=>o.operationId===probeEntries[0]?.operationId);
  if(!capacityOperation||capacityOperation.plan.approvedMaxAttempts!==first.maxCalls||capacityOperation.plan.plannedCostUsd!==first.plannedCost||capacityOperation.status!=='completed')throw Error('the approved capacity operation and its cap/cost must persist separately from its HTTP attempts');
  activeSlots=[{id:'open_router',key,model:models[0],wireProvider:'open_router'},{id:'tooken_club',key:'tk-fallback-key',model:models[1],wireProvider:'tooken_club'}];
  w.eval("ROUTER_KEY='sk-or-test-key';ROUTER_MODEL='vendor/model-a';AD_PROVIDER='open_router';");failNextNetwork=true;const networkStart=requestModels.length;
  const failed=await w.eval("routerRequest([{role:'user',content:'synthetic single request'}],32,{purpose:'attempt-test'})");
  if(failed.ok||requestModels.length-networkStart!==1||requestModels[networkStart]!=='vendor/model-a')throw Error('a network failure must not retry the POST or fail over to another ready model');
  usage=JSON.parse(w.localStorage.getItem('audit-ai-usage-v1'));const failedAttempt=usage.entries.filter(e=>e.purpose==='attempt-test').at(-1);
  if(!failedAttempt||failedAttempt.recordType!=='http_attempt'||failedAttempt.transportStatus!=='network-error'||failedAttempt.usageState!=='unknown'||failedAttempt.input!==null||failedAttempt.output!==null||failedAttempt.attemptIndex!==1||!failedAttempt.operationId||failedAttempt.model!=='vendor/model-a'||failedAttempt.provider!=='open_router')throw Error('a network failure must be persisted as one actual attempt with unknown, not zero, usage');
  nextHttpStatus=429;const rateStart=requestModels.length;const rateLimited=await w.eval("routerRequest([{role:'user',content:'synthetic rate-limit request'}],32,{purpose:'attempt-http'})");
  if(rateLimited.ok||requestModels.length-rateStart!==1||requestModels[rateStart]!=='vendor/model-a')throw Error('HTTP 429 must not retry or fail over to another service');
  usage=JSON.parse(w.localStorage.getItem('audit-ai-usage-v1'));const rateAttempt=usage.entries.filter(e=>e.purpose==='attempt-http').at(-1);
  if(!rateAttempt||rateAttempt.httpStatus!==429||rateAttempt.usageState!=='unknown'||rateAttempt.input!==null||rateAttempt.output!==null)throw Error('HTTP errors without provider usage must retain their status and unknown token consumption');
  const acceptedDirect=await w.eval("routerRequest([{role:'user',content:'synthetic accepted response'}],32,{purpose:'accepted-direct-test'})");
  const acceptedRepair=await w.eval("routerRequest([{role:'user',content:'synthetic correction request'}],32,{purpose:'nature-repair-test'})");
  const acceptedTest=await w.eval("routerRequest([{role:'user',content:'synthetic connection test'}],32,{purpose:'test'})");
  usage=JSON.parse(w.localStorage.getItem('audit-ai-usage-v1'));const directEntries=usage.entries.filter(e=>['accepted-direct-test','nature-repair-test','test'].includes(e.purpose));
  if(!acceptedDirect.ok||!acceptedRepair.ok||!acceptedTest.ok||directEntries.length!==3||directEntries.some(e=>e.accepted!==true))throw Error('successful direct, corrective and test requests must receive explicit accepted=true status');
  const catalogCost=w.eval("usageGroup([{recordType:'http_attempt',requestClass:'catalog',usageState:'not_applicable',input:null,output:null,model:'model-catalog'}])");
  if(catalogCost.costUnknown!==0||catalogCost.notApplicable!==1)throw Error('not-applicable catalog requests must not be counted as unknown-cost calls');
  const providerUsage=w.eval(`(()=>{const out=[];for(const [name,data] of [['openai',{usage:{prompt_tokens:11,completion_tokens:7,total_tokens:18}}],['anthropic',{usage:{input_tokens:13,output_tokens:5}}],['gemini',{usageMetadata:{promptTokenCount:17,candidatesTokenCount:3,totalTokenCount:20}}]]){const e={recordType:'http_attempt',id:'usage-'+name,operationId:'missing-op',requestClass:'generation',transportStatus:'response'};usageComplete(e,data,'received');out.push([e.input,e.output,e.total,e.usageState]);}return out;})()`);
  if(JSON.stringify(providerUsage)!==JSON.stringify([[11,7,18,'reported'],[13,5,18,'reported'],[17,3,20,'reported']]))throw Error('token usage must be extracted from OpenAI-compatible, Anthropic and Gemini response shapes');
  const planned=w.eval(`(()=>{const op={id:'persist-plan-test',plan:{maxCalls:2,cost:0.5},used:0};usageOperationStart(op,{module:'test-plan',purpose:'test',provider:'open_router',model:'model-a'});const e=usageStart([],{operationId:op.id,jobIndex:1,provider:'open_router',model:'model-a',purpose:'test'});usageComplete(e,{usage:{prompt_tokens:2,completion_tokens:1}},'received');usageDecision(e.id,true);let blocked=false;try{usageStart([],{operationId:op.id,jobIndex:3,provider:'open_router',model:'model-a',purpose:'test'});}catch{blocked=true;}const saved=JSON.parse(localStorage.getItem(USAGE_STORAGE));return {operation:saved.operations.find(x=>x.operationId===op.id),requests:saved.plannedRequests.filter(x=>x.operationId===op.id),blocked};})()`);
  if(!planned.blocked||planned.operation.plan.approvedMaxAttempts!==2||planned.operation.plan.plannedCostUsd!==0.5||planned.operation.plan.plannedJobCount!==2||planned.operation.completedAttempts!==1||planned.requests.length!==2||planned.requests[0].status!=='completed'||planned.requests[0].outputDisposition!=='accepted'||planned.requests[1].status!=='planned')throw Error('approved operation plan, cap and scheduled jobs must persist independently from HTTP attempts: '+JSON.stringify({blocked:planned.blocked,plan:planned.operation?.plan,plannedJobCount:planned.operation?.plannedJobCount,completedAttempts:planned.operation?.completedAttempts}));
  const catalogPages=w.eval(`(()=>{const a=usageStart([],{operationId:'catalog-pages-test',jobIndex:1,requestClass:'catalog',purpose:'catalog'});usageComplete(a,null,'catalog_received');const b=usageStart([],{operationId:'catalog-pages-test',jobIndex:2,requestClass:'catalog',purpose:'catalog'});usageComplete(b,null,'catalog_received');const saved=JSON.parse(localStorage.getItem(USAGE_STORAGE));return {op:saved.operations.find(x=>x.operationId==='catalog-pages-test'),requests:saved.plannedRequests.filter(x=>x.operationId==='catalog-pages-test')};})()`);
  if(catalogPages.op.plan.approvedMaxAttempts!==2||catalogPages.requests.length!==2||catalogPages.requests.some(x=>x.status!=='completed'))throw Error('paginated non-billable catalogs must persist every scheduled page without being blocked by the generation cap');
  const storageProto=Object.getPrototypeOf(w.localStorage),originalSetItem=storageProto.setItem;storageProto.setItem=function(name,value){if(name==='audit-ai-usage-v1')throw new Error('simulated storage quota');return originalSetItem.call(this,name,value);};const beforeBlocked=requestModels.length;
  const blocked=await w.eval("routerRequest([{role:'user',content:'do not send'}],32,{purpose:'attempt-test'})");storageProto.setItem=originalSetItem;
  if(blocked.ok||requestModels.length!==beforeBlocked||!String(blocked.detail).includes('گزارش پایدار'))throw Error('generation must fail closed before fetch when the attempt record cannot be persisted: '+JSON.stringify({ok:blocked.ok,detail:blocked.detail,calls:requestModels.length-beforeBlocked}));
  models=Array.from({length:405},(_,i)=>'vendor/catalog-model-'+String(i+1).padStart(3,'0'));
  raw.data=models.map(id=>({id,context_length:1000000,pricing:{prompt:'0.00002',completion:'0.00002'},supported_parameters:['max_tokens','temperature']}));
  const start=requestModels.length,large=await w.HesabrasiCapacityBenchmark.run(),calls=requestModels.length-start;
  if(large.actualCalls!==calls||large.results.length!==405||large.results.some(x=>x.trials.length<1)||large.plannedCost>10||large.results.some(x=>x.status!=='پاسخ متنی دریافت شد')||!large.results.some(x=>x.trials.length>1))throw Error('budgeted capacity test must try every affordable model and allocate remaining capacity fairly');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('OpenRouter capacity probe: PASS — synthetic-only sequential tests retained; worksheet comparison panel removed');
}catch(e){console.error(e.stack||e);process.exitCode=1;}finally{w.close();}})();
