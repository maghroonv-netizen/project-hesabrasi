'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const h=fs.readFileSync('audit-google-auto.html','utf8');
const start=h.indexOf(' async function wire(job,p,s,meta,current,operation){');
const end=h.indexOf('\n const decision=',start);assert(start>0&&end>start);
const source=h.slice(start,end);
let steps=[],requests=[],counter=0;
const core={
 isGemini:()=>false,isAnthropic:()=>false,
 chatUrl:s=>'https://'+s.slotId+'.test/v1/chat/completions',
 chatHeaders:s=>({'Content-Type':'application/json',Authorization:'Bearer '+s.key}),
 snapshotMatches:()=>true,noteOk:()=>{}
};
const context={window:{HesabrasiAI:true},HesabrasiAI:core,AbortController,setTimeout,clearTimeout,Date,Math,JSON,Number,String,Error,
 fresh:()=>true,adFits:()=>true,cleanTok:x=>String(x||''),adIsReasoningModel:()=>false,adCost:()=>null,
 adManualProfile:(model,contextTokens)=>({model,contextTokens,inputTokens:null,outputTokens:null,charLimit:null,inputPrice:null,outputPrice:null,source:'user_declared_not_provider_verified'}),
 adCheckOperationBudget:(op,plan)=>{if(op.used+plan.maxCalls>op.plan.maxCalls)throw Error('budget');},
 usageOperationStart:()=>{},usageNewId:()=>String(++counter),usageDecision:()=>{},AI_TIMEOUT_MS:1000,AD_PROVIDER:'a',
 usageFetch:async(url,options,meta)=>{meta.beforeFetch();requests.push({url,options,meta});const step=steps.shift();if(step.throw)throw Object.assign(new Error('offline'),{usageId:'err'});return {entry:{id:'u'+counter,accepted:null},response:{ok:step.status===200,status:step.status,headers:{get:()=>null},data:step.body},finish:()=>{}};},
 readWireBody:async r=>r.data
};vm.createContext(context);vm.runInContext(source,context);
const p={model:'a-model',thinking:false,parameters:[],contextTokens:10000,inputPrice:null,outputPrice:null},s={p,key:'a-key',model:'a-model',provider:'a',slotId:'a'};
const candidate={id:'b',name:'B',key:'b-key',model:'b-model',originalModel:'b-model',wireProvider:'b',kind:'openai',extra:{},extraSnapshot:'{}',context:10000,output:1000};
const job={messages:[{role:'user',content:'audit'}],output:256};
const op=()=>({id:'operation',plan:{maxCalls:2,cost:null,chain:[candidate]},used:0,spent:0,activeCandidate:-1});
(async()=>{
 steps=[{status:429,body:{error:{message:'rate limit'}}},{status:200,body:{choices:[{finish_reason:'stop',message:{content:'success'}}]}}];let operation=op();const r=await context.run(job,p,s,'analysis',()=>true,operation);
 assert.equal(r.text,'success');assert.equal(operation.used,2);assert.equal(requests[0].url,'https://a.test/v1/chat/completions');assert.equal(requests[1].url,'https://b.test/v1/chat/completions');assert.equal(requests[1].options.headers.Authorization,'Bearer b-key');assert.equal(JSON.parse(requests[1].options.body).model,'b-model');assert.equal(requests[1].meta.reason,'provider-failover');
 requests=[];steps=[{status:401,body:{error:{message:'bad key'}}}];await assert.rejects(context.run(job,p,s,'analysis',()=>true,op()),/HTTP 401/);assert.equal(requests.length,1);
 requests=[];steps=[{throw:true}];await assert.rejects(context.run(job,p,s,'analysis',()=>true,op()),/شبکه/);assert.equal(requests.length,1);
 requests=[];steps=[{status:200,body:{error:{message:'rate limit'}}}];await assert.rejects(context.run(job,p,s,'analysis',()=>true,op()),/خطای سرویس/);assert.equal(requests.length,1,'mid-stream failures do not retry');
 console.log('AI wire integration: HTTP 429 fallback, credentials, accounting, 401/network/stream no retry PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
