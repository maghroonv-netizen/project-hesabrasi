import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHesabrasiLocalProxyServer } from '../tooken-local-proxy.mjs';

const calls=[];
const fetchImpl=async(url,init)=>{
  calls.push({url,init});
  return new Response(JSON.stringify({choices:[{message:{content:'OK'}}]}),{
    status:200,
    headers:{'content-type':'application/json'}
  });
};
assert.throws(()=>createHesabrasiLocalProxyServer({}),/TOOKEN_API_KEY or ONEXAI_API_KEY/);
const server=createHesabrasiLocalProxyServer({
  oneXAiApiKey:'server-only-key',
  port:0,
  appFile:new URL('../audit-google-auto.html',import.meta.url),
  fetchImpl
});
await once(server,'listening');
const {port}=server.address();
const origin=`http://127.0.0.1:${port}`;
const sameOrigin={Origin:origin,'Sec-Fetch-Site':'same-origin'};
try{
  const page=await fetch(origin+'/',{headers:{'Sec-Fetch-Site':'none'}});
  assert.equal(page.status,200);
  const source=await page.text();
  assert.match(source,/HESABRASI_ONEXAI_LOCAL_PROXY = true/);
  assert.match(source,/HESABRASI_TOOKEN_LOCAL_PROXY = false/);
  assert.doesNotMatch(source,/server-only-key/);

  const body={model:'claude-sonnet-4-5',messages:[{role:'user',content:'Reply exactly OK'}],max_tokens:32};
  const response=await fetch(origin+'/api/one-xai/chat/completions',{
    method:'POST',
    headers:{...sameOrigin,'Content-Type':'application/json',Authorization:'Bearer browser-should-not-be-used'},
    body:JSON.stringify(body)
  });
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{choices:[{message:{content:'OK'}}]});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://1xai.ir/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization,'Bearer server-only-key');
  assert.deepEqual(JSON.parse(Buffer.from(calls[0].init.body).toString()),body);

  const hostile=await fetch(origin+'/api/one-xai/chat/completions',{
    method:'POST',headers:{Origin:'https://evil.example','Sec-Fetch-Site':'cross-site','Content-Type':'application/json'},body:'{}'
  });
  assert.equal(hostile.status,403);
  assert.equal(calls.length,1,'untrusted browser origins are not forwarded upstream');
  const notFound=await fetch(origin+'/api/one-xai/models',{headers:sameOrigin});
  assert.equal(notFound.status,404,'only the documented chat-completions endpoint is exposed');
  console.log('1xAi local proxy: PASS — same-origin route, server-only key, fixed upstream, and origin checks');
}finally{
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
