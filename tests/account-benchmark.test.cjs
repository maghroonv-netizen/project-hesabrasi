const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
if(!html.includes('data-act="benchmark-capacity"')||!html.includes('Synthetic request-capacity probe'))throw Error('OpenRouter settings must retain synthetic capacity probes');
if(html.includes('accountBenchmarkPanel')||html.includes('accountCompareSelectorHTML')||html.includes('window.HesabrasiAccountBenchmark'))throw Error('the worksheet model-comparison panel should be removed');
if(html.includes('data-rerun="both"')||html.includes('اجرای مجدد کامل کاربرگ'))throw Error('the combined worksheet rerun action should be removed');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.TextEncoder=require('util').TextEncoder;w.TextDecoder=require('util').TextDecoder;w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.fetch=async()=>{throw new Error('unexpected network')}}});
const w=dom.window;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;this.querySelectorAll('button')[0]?.click();};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
const key='sk-or-test-key';let models=['vendor/model-a','vendor/model-b'];
let raw={data:[]};
const fakeAI={
 readySlots:()=>[{id:'open_router',key,model:models[0],wireProvider:'open_router'}],
 fetchModelsCatalog:async()=>({raw,textModels:models.map(id=>({id}))}),
 chatUrl:()=> 'https://openrouter.ai/api/v1/chat/completions',chatHeaders:()=>({Authorization:'Bearer test'}),
 isGemini:()=>false,isAnthropic:()=>false,isCool:()=>false,noteOk:()=>{},noteFail:()=>{},shouldSwitch:()=>false
};
w.HesabrasiAI=fakeAI;
let requestModels=[],requestBodies=[];
w.fetch=async(url,init)=>{const body=JSON.parse(init.body);requestModels.push(body.model);requestBodies.push(body);return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({choices:[{finish_reason:'stop',message:{content:'READY'}}],usage:{prompt_tokens:100,completion_tokens:5,total_tokens:105}})};};
(async()=>{try{
  raw.data=models.map(id=>({id,context_length:65536,pricing:{prompt:'0.000001',completion:'0.000002'},supported_parameters:['max_tokens','temperature']}));
  w.eval('ANA.out=[];ANA.active=0;');
  const first=await w.HesabrasiCapacityBenchmark.run();
  const expected=first.results.reduce((n,x)=>n+x.trials.length,0);
  if(first.actualCalls!==expected||requestModels.length!==expected||first.results.length!==2||first.results.some(x=>x.trials.length!==first.stageCount||!x.inputTokens||x.status!=='پاسخ متنی دریافت شد'))throw Error('capacity probes must run sequentially and record actual usage');
  if(requestBodies.some(b=>JSON.stringify(b).toLowerCase().includes('حساب آزمایشی')||!JSON.stringify(b).toLowerCase().includes('synthetic')))throw Error('capacity probes must contain only synthetic input');
  if(first.plannedCost>10)throw Error('capacity probe estimate exceeded the existing $10 capacity-test budget');
  models=Array.from({length:405},(_,i)=>'vendor/catalog-model-'+String(i+1).padStart(3,'0'));
  raw.data=models.map(id=>({id,context_length:1000000,pricing:{prompt:'0.00002',completion:'0.00002'},supported_parameters:['max_tokens','temperature']}));
  const start=requestModels.length,large=await w.HesabrasiCapacityBenchmark.run(),calls=requestModels.length-start;
  if(large.actualCalls!==calls||large.results.length!==405||large.results.some(x=>x.trials.length<1)||large.plannedCost>10||large.results.some(x=>x.status!=='پاسخ متنی دریافت شد')||!large.results.some(x=>x.trials.length>1))throw Error('budgeted capacity test must try every affordable model and allocate remaining capacity fairly');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('OpenRouter capacity probe: PASS — synthetic-only sequential tests retained; worksheet comparison panel removed');
}catch(e){console.error(e.stack||e);process.exitCode=1;}finally{w.close();}})();
