/* Netlify Function: the online services (see server/core.mjs). Data lives in Netlify Blobs (free with every Netlify site, no setup).
   Netlify serves it at /api/* (see the [[redirects]] / config.path below). */
import { getStore } from '@netlify/blobs';
import { createApi } from '../../server/core.mjs';

let api = null;
function blobStore() {
  const s = getStore({ name: 'volt-hockey', consistency: 'strong' });
  return {
    get: k => s.get(k, { type: 'json' }).then(v => v ?? null),
    set: (k, v) => s.setJSON(k, v),
    del: k => s.delete(k),
    list: async prefix => (await s.list({ prefix })).blobs.map(b => b.key)
  };
}

export default async (req) => {
  if (!api) api = createApi(blobStore());
  const url = new URL(req.url), path = url.pathname.replace(/^\/api/, '') || '/', headers = Object.fromEntries(req.headers);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  let body = {}; if (req.method !== 'GET') { try { body = await req.json(); } catch (e) { body = {}; } }
  const out = await api(req.method, path, Object.fromEntries(url.searchParams), body, headers);
  return new Response(JSON.stringify(out.body), { status: out.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors() } });
};
const cors = () => ({ 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' });   // lets the game also run from another address (e.g. embedded on your Wix page)

export const config = { path: '/api/*' };
