import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createTookenProxyServer } from '../tooken-local-proxy.mjs';

const calls = [];
const fetchImpl = async (url, init) => {
  calls.push({ url, init });
  if (url.endsWith('/models')) {
    return new Response(JSON.stringify({ data: [{ id: 'gpt-6.1-sol' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

assert.throws(() => createTookenProxyServer({ apiKey: '' }), /TOOKEN_API_KEY/);
const server = createTookenProxyServer({ apiKey: 'server-secret', port: 0, fetchImpl });
await once(server, 'listening');
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;
const headers = { Origin: origin, 'Sec-Fetch-Site': 'same-origin' };

try {
  const page = await fetch(origin + '/', { headers: { 'Sec-Fetch-Site': 'none' } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /HESABRASI_TOOKEN_LOCAL_PROXY = true/);

  const models = await fetch(origin + '/api/tooken/models', { headers });
  assert.equal(models.status, 200);
  assert.deepEqual(await models.json(), { data: [{ id: 'gpt-6.1-sol' }] });
  assert.equal(calls[0].url, 'https://tooken.club/v1/models');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer server-secret');
  assert.equal(calls[0].init.method, 'GET');

  const chatBody = { model: 'gpt-6.1-sol', messages: [{ role: 'user', content: 'Hello' }] };
  const chat = await fetch(origin + '/api/tooken/chat/completions', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Authorization: 'Bearer browser-secret' },
    body: JSON.stringify(chatBody)
  });
  assert.equal(chat.status, 200);
  assert.deepEqual(await chat.json(), { choices: [{ message: { content: 'OK' } }] });
  assert.equal(calls[1].url, 'https://tooken.club/v1/chat/completions');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer server-secret');
  assert.notEqual(calls[1].init.headers.Authorization, 'Bearer browser-secret');
  assert.deepEqual(JSON.parse(Buffer.from(calls[1].init.body).toString()), chatBody);

  const hostile = await fetch(origin + '/api/tooken/models', {
    headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' }
  });
  assert.equal(hostile.status, 403);
  assert.equal(calls.length, 2, 'untrusted origins must not be forwarded upstream');

  const wrongRoute = await fetch(origin + '/api/other', { headers });
  assert.equal(wrongRoute.status, 404);
  console.log('Tooken local proxy: PASS — same-origin UI, server-side key injection, fixed routes and origin checks');
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
