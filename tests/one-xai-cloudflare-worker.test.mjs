import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source=await readFile(new URL('../1xai-cloudflare-worker.js',import.meta.url),'utf8');
const worker=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const origin='https://maghroonv-netizen.github.io';
const env={ALLOWED_ORIGIN:origin,APP_ACCESS_TOKEN:'a'.repeat(48),ONE_XAI_API_KEY:'upstream-secret'};
const calls=[];
const fetchImpl=async(url,init)=>{
  calls.push({url,init});
  return new Response(JSON.stringify({choices:[{message:{content:'OK'}}]}),{status:200,headers:{'content-type':'application/json'}});
};

{
  const response=await worker.handleRequest(new Request('https://proxy.workers.dev/v1/chat/completions',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}}),env,fetchImpl);
  assert.equal(response.status,204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  assert.match(response.headers.get('Access-Control-Allow-Headers'),/Authorization/i);
}
{
  const response=await worker.handleRequest(new Request('https://proxy.workers.dev/health',{headers:{Origin:origin}}),env,fetchImpl);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{ok:true,service:'1xAi relay'});
}
{
  const payload={model:'gpt-4o-mini',messages:[{role:'user',content:'Reply exactly OK'}],max_tokens:32};
  const response=await worker.handleRequest(new Request('https://proxy.workers.dev/v1/chat/completions',{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${env.APP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(payload)}),env,fetchImpl);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  assert.deepEqual(await response.json(),{choices:[{message:{content:'OK'}}]});
  assert.equal(calls[0].url,'https://1xai.ir/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization,'Bearer upstream-secret');
  assert.deepEqual(JSON.parse(new TextDecoder().decode(calls[0].init.body)),payload);
}
{
  const response=await worker.handleRequest(new Request('https://proxy.workers.dev/v1/models',{headers:{Origin:origin,Authorization:`Bearer ${env.APP_ACCESS_TOKEN}`}}),env,async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify({data:[{id:'gpt-4o-mini'}]}),{headers:{'content-type':'application/json'}});});
  assert.equal(response.status,200);
  assert.equal(calls.at(-1).url,'https://1xai.ir/v1/models');
}
{
  const badToken=await worker.handleRequest(new Request('https://proxy.workers.dev/v1/chat/completions',{method:'POST',headers:{Origin:origin,Authorization:'Bearer wrong','Content-Type':'application/json'},body:'{"model":"gpt-4o-mini","messages":[]}'}),env,fetchImpl);
  assert.equal(badToken.status,401);
  const badOrigin=await worker.handleRequest(new Request('https://proxy.workers.dev/v1/models',{headers:{Origin:'https://evil.example',Authorization:`Bearer ${env.APP_ACCESS_TOKEN}`}}),env,fetchImpl);
  assert.equal(badOrigin.status,403);
  assert.equal(badOrigin.headers.get('Access-Control-Allow-Origin'),null);
  assert.equal(calls.length,2,'invalid tokens and origins are never forwarded upstream');
}
console.log('1xAi Cloudflare Worker: PASS — CORS preflight, protected chat/models, server-only upstream key, and origin restriction');
