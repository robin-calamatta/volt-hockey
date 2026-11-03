/* Netlify Function: the online services (see server/core.mjs). Data lives in Netlify Blobs (free with every Netlify site, no setup).
   Netlify serves it at /api/* (see the [[redirects]] / config.path below). */
import { getStore } from '@netlify/blobs';
import { createApi } from '../../server/core.mjs';

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
  // a fresh store for every request: Netlify hands each request its own access to Blobs (reusing one between requests fails)
  const api = createApi(blobStore(), { sendEmail: mailer(), siteUrl: () => process.env.SITE_URL || process.env.URL || new URL(req.url).origin, ice: () => process.env.ICE_SERVERS, admin: () => ({ user: process.env.ADMIN_USER, pass: process.env.ADMIN_PASSWORD }) });
  const url = new URL(req.url), path = url.pathname.replace(/^\/api/, '') || '/', headers = Object.fromEntries(req.headers);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  let body = {}; if (req.method !== 'GET') { try { body = await req.json(); } catch (e) { body = {}; } }
  const out = await api(req.method, path, Object.fromEntries(url.searchParams), body, headers);
  return new Response(JSON.stringify(out.body), { status: out.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors() } });
};
const cors = () => ({ 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization, x-admin-token', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' });   // lets the game also run from another address (e.g. embedded on your Wix page)

/* Sending the password-reset email. Set these in Netlify (Site configuration > Environment variables), then redeploy:
     EMAIL_API_KEY   your Brevo API key (free: brevo.com, 300 emails a day)   or a Resend key with EMAIL_PROVIDER=resend
     EMAIL_FROM      the sender address you verified with them, e.g. you@gmail.com
     EMAIL_FROM_NAME optional, e.g. Volt Hockey
   Without EMAIL_API_KEY, "Forgot password" says it is not set up yet (everything else works). */
function mailer() {
  const key = process.env.EMAIL_API_KEY, from = process.env.EMAIL_FROM, name = process.env.EMAIL_FROM_NAME || 'Volt Hockey', provider = (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase();
  if (!key || !from) return null;
  return async ({ to, subject, text, html }) => {
    const res = provider === 'resend'
      ? await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, body: JSON.stringify({ from: `${name} <${from}>`, to: [to], subject, text, html }) })
      : await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ sender: { email: from, name }, to: [{ email: to }], subject, textContent: text, htmlContent: html }) });
    if (!res.ok) throw new Error('email provider said ' + res.status + ': ' + (await res.text()).slice(0, 200));
  };
}

export const config = { path: '/api/*' };
