/** Experimental private relay for TokenRouter.com; no credentials stored by this code. */
const UPSTREAM = 'https://api.tokenrouter.com/v1';
const MAX_BODY = 2 * 1024 * 1024;

async function equalSecret(a, b) {
  const encoder = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(a)), crypto.subtle.digest('SHA-256', encoder.encode(b))]);
  const ax = new Uint8Array(x), ay = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ ay[i];
  return diff === 0;
}
function headersFor(origin, allowed) {
  const h = new Headers({'cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin'});
  if (origin && origin === allowed) {
    h.set('access-control-allow-origin', origin);
    h.set('access-control-allow-methods', 'GET, POST, OPTIONS');
    h.set('access-control-allow-headers', 'authorization, content-type, x-hesabrasi-bridge-key');
    h.set('access-control-max-age', '600');
  }
  return h;
}
function error(status, message, headers) {
  const h = new Headers(headers); h.set('content-type','application/json; charset=utf-8');
  return new Response(JSON.stringify({error:{message}}), {status, headers:h});
}
async function limitedBody(request) {
  const length = Number(request.headers.get('content-length') || '0');
  if (length > MAX_BODY) throw new Error('too large');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), chunks = []; let lengthRead = 0;
  for (;;) {
    const {done,value} = await reader.read(); if (done) break;
    lengthRead += value.byteLength;
    if (lengthRead > MAX_BODY) { await reader.cancel(); throw new Error('too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(lengthRead); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk,at); at += chunk.byteLength; }
  return bytes;
}
export async function handleRequest(request, env, fetchImpl = fetch) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || '');
  const headers = headersFor(origin, allowed);
  if (!allowed || !origin || origin !== allowed) return error(403,'Origin not allowed',headers);
  const url = new URL(request.url);
  if (url.search || !['/v1/models','/v1/chat/completions'].includes(url.pathname)) return error(404,'Not found',headers);
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if ((url.pathname === '/v1/models' && request.method !== 'GET') || (url.pathname === '/v1/chat/completions' && request.method !== 'POST')) return error(405,'Method not allowed',headers);
  const secret = String(env.BRIDGE_ACCESS_KEY || '');
  const supplied = request.headers.get('x-hesabrasi-bridge-key') || '';
  if (secret.length < 32 || supplied.length > 512 || !(await equalSecret(supplied,secret))) return error(403,'Bridge access denied',headers);
  const auth = request.headers.get('authorization') || '';
  if (!/^Bearer [\x21-\x7e]{1,4096}$/.test(auth)) return error(401,'Provider API key required',headers);
  const upstreamHeaders = new Headers({authorization:auth});
  let body;
  if (request.method === 'POST') {
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return error(415,'JSON required',headers);
    upstreamHeaders.set('content-type','application/json');
    try { body = await limitedBody(request); } catch { return error(413,'Request too large',headers); }
  }
  try {
    const response = await fetchImpl(UPSTREAM + url.pathname.slice(3), {method:request.method,headers:upstreamHeaders,body,redirect:'manual',signal:AbortSignal.timeout(120000)});
    if (response.status >= 300 && response.status < 400) return error(502,'Upstream redirect refused',headers);
    for (const name of ['content-type','retry-after','retry-after-ms']) { const v = response.headers.get(name); if (v) headers.set(name,v); }
    return new Response(response.body,{status:response.status,headers});
  } catch { return error(502,'Upstream connection failed',headers); }
}
export default { fetch(request, env) { return handleRequest(request,env); } };
