import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalProxy} from '../ai-local-proxy.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';

const hits = [];
let behavior = 'ok';
const server = createLocalProxy({fetchImpl: async (url, init) => {
  hits.push({url, init});
  if (behavior === 'throw') throw new Error('network error');
  if (behavior === 'redirect') return new Response(null,{status:302,headers:{location:'https://attacker.invalid/steal'}});
  if (behavior === 'limited') return new Response('{"error":{"message":"limit"}}',{status:429,headers:{'content-type':'application/json','retry-after':'15'}});
  return new Response(JSON.stringify({data:[{id:'free-model'}]}),{status:200,headers:{'content-type':'application/json'}});
}});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const port = server.address().port;
function req(route, options={}) {
  return new Promise((resolve,reject)=>{
    const request = http.request({hostname:'127.0.0.1',port,path:route,method:options.method||'GET',headers:{host:`127.0.0.1:${port}`,...options.headers}}, response=>{
      const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString()}));
    });request.on('error',reject);request.end(options.body);
  });
}
const ok={'x-hesabrasi-proxy':'1'};
test('local bridge allows only predefined routes, methods and headers',async()=>{
  let r=await req('/api/ai/tokenrouter/models',{headers:{...ok,authorization:'Bearer private-key',cookie:'ignored=1'}});
  assert.equal(r.status,200);assert.equal(hits.at(-1).url,'https://api.tokenrouter.com/v1/models');assert.equal(hits.at(-1).init.headers.authorization,'Bearer private-key');assert.equal(hits.at(-1).init.headers.cookie,undefined);
  r=await req('/api/ai/next_router/chat',{method:'POST',headers:{...ok,authorization:'Bearer nk','content-type':'application/json'},body:'{"model":"x","messages":[]}'});
  assert.equal(r.status,200);assert.equal(hits.at(-1).url,'https://nextrouter.me/v1/chat/completions');assert.equal(hits.at(-1).init.body.toString(),'{"model":"x","messages":[]}');
  const before=hits.length;
  assert.equal((await req('/api/ai/tokenrouter/models')).status,403);
  assert.equal((await req('/api/ai/tokenrouter/models',{headers:{...ok,host:'evil.test'}})).status,403);
  assert.equal((await req('/api/ai/tokenrouter/models',{headers:{...ok,origin:'https://evil.test'}})).status,403);
  assert.equal((await req('/api/ai/tokenrouter/models',{headers:{...ok,'sec-fetch-site':'cross-site'}})).status,403);
  assert.equal((await req('/api/ai/custom_openai/chat',{method:'POST',headers:ok})).status,404);
  assert.equal((await req('/api/ai/tokenrouter/chat',{headers:ok})).status,405);
  assert.equal((await req('/api/ai/tokenrouter/chat',{method:'POST',headers:{...ok,'content-type':'text/plain'},body:'x'})).status,415);
  assert.equal((await req('/.git/config')).status,404);
  assert.equal((await req('/assets/fonts/../../.git/config')).status,404);
  assert.equal(hits.length,before);
});
test('every additional fixed preset routes to its recorded models endpoint',async()=>{
  const registry=JSON.parse(await readFile(new URL('../ai-provider-registry.json',import.meta.url),'utf8'));
  for(const spec of registry.providers){
    if(spec.id==='cloudflare') continue;
    const response=await req('/api/ai/'+spec.id+'/models',{headers:ok});assert.equal(response.status,200,spec.id);
    assert.equal(hits.at(-1).url,spec.id==='kilo'?'https://api.kilo.ai/api/gateway/models':spec.id==='cohere'?'https://api.cohere.com/v1/models':spec.base.replace(/\/+$/,'')+'/models',spec.id);
  }
});
test('Gemini and Cloudflare require constrained parameters and preserve upstream rate limits',async()=>{
  assert.equal((await req('/api/ai/gemini/models?pageToken=abc_123',{headers:ok})).status,200);
  assert.equal(hits.at(-1).url,'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&pageToken=abc_123');
  assert.equal((await req('/api/ai/gemini/chat?model=gemini-2.5-flash',{method:'POST',headers:{...ok,'content-type':'application/json','x-goog-api-key':'g-key'},body:'{}'})).status,200);
  assert.equal(hits.at(-1).url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');assert.equal(hits.at(-1).init.headers['x-goog-api-key'],'g-key');
  const account='a'.repeat(32);
  assert.equal((await req('/api/ai/cloudflare/models?account='+account+'&page=2',{headers:ok})).status,200);
  assert.equal(hits.at(-1).url,`https://api.cloudflare.com/client/v4/accounts/${account}/ai/models/search?per_page=100&page=2`);
  const before=hits.length;assert.equal((await req('/api/ai/cloudflare/models?account=bad',{headers:ok})).status,599);assert.equal(hits.length,before);
  assert.equal((await req('/api/ai/open_router/quota',{headers:ok})).status,200);assert.equal(hits.at(-1).url,'https://openrouter.ai/api/v1/key');assert.equal((await req('/api/ai/tokenrouter/quota',{headers:ok})).status,404);
  behavior='limited';const limited=await req('/api/ai/tokenrouter/models',{headers:ok});assert.equal(limited.status,429);assert.equal(limited.headers['retry-after'],'15');behavior='ok';
});
test('bridge does not retry ambiguous network errors, follow redirects or expose source files',async()=>{
  behavior='throw';assert.equal((await req('/api/ai/groq/models',{headers:ok})).status,599);
  behavior='redirect';assert.equal((await req('/api/ai/groq/models',{headers:ok})).status,599);assert.equal(hits.at(-1).init.redirect,'manual');behavior='ok';
  const html=await req('/audit-google-auto.html');assert.equal(html.status,200);assert.match(html.body,/window.HESABRASI_AI_PROXY=true/);
  const font=await req('/assets/fonts/Vazirmatn-variable.woff2');assert.equal(font.status,200);assert.equal(font.headers['content-type'],'font/woff2');assert.equal((await req('/assets/fonts/OFL-Vazirmatn.txt')).status,404);
});
test.after(()=>new Promise(resolve=>server.close(resolve)));
test('Anthropic pagination only forwards a constrained cursor to the fixed endpoint',async()=>{
  assert.equal((await req('/api/ai/anthropic/models?after_id=claude-sonnet-4-0',{headers:{...ok,'x-api-key':'secret','anthropic-version':'2023-06-01'}})).status,200);
  assert.equal(hits.at(-1).url,'https://api.anthropic.com/v1/models?after_id=claude-sonnet-4-0');
  assert.equal(hits.at(-1).init.headers['x-api-key'],'secret');
  const before=hits.length;
  assert.equal((await req('/api/ai/anthropic/models?after_id=https%3A%2F%2Fevil.test',{headers:ok})).status,599);
  assert.equal(hits.length,before);
});

test('Cohere catalog uses its native models endpoint and safely encoded pagination',async()=>{
  assert.equal((await req('/api/ai/cohere/models?page_token=abc%2B%2F%3D',{headers:ok})).status,200);
  assert.equal(hits.at(-1).url,'https://api.cohere.com/v1/models?page_token=abc%2B%2F%3D');
  const before=hits.length;assert.equal((await req('/api/ai/cohere/models?page_token=bad%3Ftoken',{headers:ok})).status,599);assert.equal(hits.length,before);
});
