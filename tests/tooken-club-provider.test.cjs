const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.TextEncoder=require('util').TextEncoder;w.TextDecoder=require('util').TextDecoder;w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('unexpected network')}}});
const w=dom.window,api=w.HesabrasiAI;
(async()=>{try{
  const provider=api.catalog.find(x=>x.id==='tooken_club');
  if(!provider||provider.base!=='https://tooken.club/v1'||!provider.dynamicModels)throw Error('Tooken Club must be configured as an OpenAI-compatible dynamic model provider');
  if(!html.includes('data-f="dynamic-model-select"')||!html.includes('کلید API Tooken Club'))throw Error('settings should offer a key-only Tooken card with an auto-populated model selector');
  if(api.modelsUrl({provider:'tooken_club',model:'deepseek-v4-pro'})!=='https://tooken.club/v1/models')throw Error('model discovery endpoint mismatch');
  if(api.chatUrl({slotId:'tooken_club',provider:'tooken_club',model:'deepseek-v4-pro'})!=='https://tooken.club/v1/chat/completions')throw Error('chat completions endpoint mismatch');
  if(api.chatHeaders({slotId:'tooken_club',key:'tk-example-secret'}).Authorization!=='Bearer tk-example-secret')throw Error('Tooken Club must use bearer API-key auth');
  let requested;
  w.fetch=async(url,init)=>{requested={url,init};return {ok:true,status:200,json:async()=>({data:[
    {id:'deepseek-v4-pro',name:'DeepSeek V4 Pro',context_length:128000,pricing:{prompt:'0.000001',completion:'0.000002'}},
    {id:'gpt-6.1-sol',name:'GPT 6.1 Sol',context_length:128000,pricing:{prompt:'0.000001',completion:'0.000002'}},
    {id:'gpt-image-2.5-sunburst',name:'GPT Image generation',context_length:10000,pricing:{prompt:'0.000001',completion:'0.000002'}}
  ]})};};
  const result=await api.fetchModelsCatalog('tooken_club','tk-example-secret',true);
  if(requested.url!=='https://tooken.club/v1/models'||requested.init.headers.Authorization!=='Bearer tk-example-secret')throw Error('catalog must be fetched from Tooken using the user key');
  if(!result||result.textModels.length!==2||api.listCachedTextModels('tooken_club').length!==2)throw Error('Tooken catalog should cache supported text models and filter image models');
  await new Promise(resolve=>setTimeout(resolve,0));api.mount();const card=w.document.querySelector('[data-aihub-card="tooken_club"]');if(!card)throw Error('Tooken Club settings card should be visible in the provider hub');card.querySelector('[data-f="key"]').value='tk-example-secret';card.querySelector('[data-f="enabled"]').checked=true;let testCalls=0;w.fetch=async(url,init)=>{testCalls++;if(init.method==='POST')throw Error('connection test must not send a paid generation request');return {ok:true,status:200,json:async()=>({data:[{id:'deepseek-v4-pro',context_length:128000,pricing:{prompt:'0.000001',completion:'0.000002'}}]})};};const connected=await api.testSlot('tooken_club');if(!connected.ok||testCalls!==1||!api.readySlots().some(x=>x.id==='tooken_club'))throw Error('connection test should validate by fetching models using the entered key without paid generation');if(card.querySelector('[data-f="dynamic-model-select"]').value!=='deepseek-v4-pro'||card.querySelector('[data-f="model"]').value!=='deepseek-v4-pro')throw Error('the live model list should populate the selectable model and active model id');
  w.fetch=async()=>{throw new TypeError('Failed to fetch');};const failed=await api.fetchModelsCatalog('tooken_club','tk-catalog-down-key',true);const manualWrap=card.querySelector('[data-dynamic-model-manual-wrap]'),status=card.querySelector('[data-dynamic-model-status]');if(failed!==null||!manualWrap||manualWrap.hidden||!status.textContent.includes('CORS')||!status.textContent.includes('نامعتبر بودن کلید'))throw Error('network fetch failures should show a clear CORS/network diagnosis and manual model fallback');const fallbackSelect=card.querySelector('[data-f="dynamic-model-select"]');if(fallbackSelect.options.length!==16||!fallbackSelect.textContent.includes('claude-opus-5-5')||fallbackSelect.textContent.includes('gpt-image'))throw Error('failed live catalog should expose the 16 text-only models copied from the user-provided catalog');fallbackSelect.value='claude-opus-5-5';fallbackSelect.dispatchEvent(new w.Event('change',{bubbles:true}));if(api.readySlots().find(x=>x.id==='tooken_club').model!=='claude-opus-5-5')throw Error('choosing a provided fallback model must save it as active');const manual=card.querySelector('[data-f="dynamic-model-manual"]');manual.value='deepseek-v4-pro-manual';manual.dispatchEvent(new w.Event('change',{bubbles:true}));if(card.querySelector('[data-f="model"]').value!=='deepseek-v4-pro-manual'||api.readySlots().find(x=>x.id==='tooken_club').model!=='deepseek-v4-pro-manual')throw Error('manual model ID should be saved as active without claiming live catalog verification');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Tooken Club provider: PASS — OpenAI-compatible endpoints, bearer auth, live model catalog and text-only filtering');
}catch(e){console.error(e.stack||e);process.exitCode=1;}finally{w.close();}})();
