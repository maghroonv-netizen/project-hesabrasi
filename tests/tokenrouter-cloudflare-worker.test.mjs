import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../tokenrouter-cloudflare-worker.mjs';
const secret='s'.repeat(48),env={ALLOWED_ORIGIN:'null',BRIDGE_ACCESS_KEY:secret};
const headers={'origin':'null','x-hesabrasi-bridge-key':secret,'authorization':'Bearer provider-secret'};
const hits=[];
const upstream=async(url,init)=>{hits.push({url,init});return new Response('{"data":[{"id":"sample"}]}',{status:200,headers:{'content-type':'application/json'}})};
const req=(path,init={})=>new Request('https://private-worker.example'+path,init);
test('relay forwards only authorized fixed TokenRouter routes without bridge secret',async()=>{
 const res=await handleRequest(req('/v1/models',{headers:{...headers,cookie:'bad=1','x-random':'no'}}),env,upstream);
 assert.equal(res.status,200);assert.equal(res.headers.get('access-control-allow-origin'),'null');
 assert.equal(hits.at(-1).url,'https://api.tokenrouter.com/v1/models');assert.equal(hits.at(-1).init.headers.get('authorization'),'Bearer provider-secret');
 assert.equal(hits.at(-1).init.headers.get('x-hesabrasi-bridge-key'),null);assert.equal(hits.at(-1).init.headers.get('cookie'),null);assert.equal(hits.at(-1).init.redirect,'manual');
 const chat=await handleRequest(req('/v1/chat/completions',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'{"model":"x"}'}),env,upstream);
 assert.equal(chat.status,200);assert.equal(hits.at(-1).url,'https://api.tokenrouter.com/v1/chat/completions');assert.equal(new TextDecoder().decode(hits.at(-1).init.body),'{"model":"x"}');
});
test('preflight and rejected requests cannot proxy unauthorized traffic',async()=>{
 let r=await handleRequest(req('/v1/models',{method:'OPTIONS',headers:{origin:'null'}}),env,upstream);assert.equal(r.status,204);assert.match(r.headers.get('access-control-allow-headers'),/x-hesabrasi-bridge-key/);
 let before=hits.length;
 for (const [path,init,status] of [
  ['/v1/models',{headers:{...headers,origin:'https://evil.example'}},403],
  ['/v1/models',{headers:{...headers,'x-hesabrasi-bridge-key':'wrong'}},403],
  ['/v1/models',{headers:{...headers,authorization:''}},401],
  ['/v1/models?url=https://evil.example',{headers},404],
  ['/v1/other',{headers},404],
  ['/v1/models',{method:'POST',headers},405],
  ['/v1/chat/completions',{method:'POST',headers:{...headers,'content-type':'text/plain'},body:'x'},415],
  ['/v1/chat/completions',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'x'.repeat(2*1024*1024+1)},413]
 ]) {r=await handleRequest(req(path,init),env,upstream);assert.equal(r.status,status,path);}
 assert.equal(hits.length,before);
 assert.equal((await handleRequest(req('/v1/models',{headers}),{...env,BRIDGE_ACCESS_KEY:'short'},upstream)).status,403);
 assert.equal((await handleRequest(req('/v1/models',{headers}),{...env,ALLOWED_ORIGIN:''},upstream)).status,403);
});
test('upstream errors and redirects do not expose bridge data or retry',async()=>{
 const moved=async()=>new Response(null,{status:302,headers:{location:'https://evil.example'}});
 let r=await handleRequest(req('/v1/models',{headers}),env,moved);assert.equal(r.status,502);assert.equal(r.headers.get('location'),null);
 r=await handleRequest(req('/v1/models',{headers}),env,async()=>{throw Error(secret)});assert.equal(r.status,502);assert.doesNotMatch(await r.text(),new RegExp(secret));
 r=await handleRequest(req('/v1/models',{headers}),env,async()=>new Response('{}',{status:429,headers:{'retry-after':'10'}}));assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'10');
});
