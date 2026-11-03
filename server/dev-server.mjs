/* Run the whole game locally, online services included, without Netlify:
     cd server && npm install && node dev-server.mjs      then open http://localhost:8888
   Serves the game files, the API (/api/*, same code as the Netlify Function, data kept in server/.data/) and a PeerJS server (/peerjs)
   so parties, rooms, chat and voice can be tested on one machine even with no internet. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from './core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..'), dataDir = process.env.VOLT_DATA || path.join(here, '.data');
const PORT = +process.env.PORT || 8888;
fs.mkdirSync(dataDir, { recursive: true });
const file = k => path.join(dataDir, encodeURIComponent(k) + '.json');
const store = {
  get: async k => { try { return JSON.parse(fs.readFileSync(file(k), 'utf8')); } catch (e) { return null; } },
  set: async (k, v) => fs.writeFileSync(file(k), JSON.stringify(v)),
  del: async k => { try { fs.unlinkSync(file(k)); } catch (e) { /* gone */ } },
  list: async prefix => fs.readdirSync(dataDir).map(f => decodeURIComponent(f.replace(/\.json$/, ''))).filter(k => k.startsWith(prefix))
};
// Locally, "emails" are written to server/.data/outbox.txt (and the console) instead of being sent.
const api = createApi(store, { admin: { user: process.env.ADMIN_USER || 'admin', pass: process.env.ADMIN_PASSWORD || 'admin' },   // local only: admin / admin unless you set them
  siteUrl: () => `http://localhost:${PORT}`, sendEmail: async m => { const line = `\n--- ${new Date().toISOString()}  to: ${m.to}\n${m.subject}\n${m.text}\n`; fs.appendFileSync(path.join(dataDir, 'outbox.txt'), line); console.log(line); } });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    let raw = ''; for await (const c of req) raw += c;
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) { body = {}; }
    const out = await api(req.method, url.pathname.slice(4), Object.fromEntries(url.searchParams), body, req.headers);
    res.writeHead(out.status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify(out.body));
  }
  if (url.pathname.startsWith('/peerjs')) return;                                    // handled by the PeerJS server below
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, ''); if (!p || p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root) || f.includes(`${path.sep}server${path.sep}.data`)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, data) => { if (e) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(data); });
});

// PeerJS signalling for local testing (optional dependency: npm install peer)
try {
  const { ExpressPeerServer } = await import('peer');
  const express = (await import('express')).default, app = express();
  const peer = ExpressPeerServer(server, { path: '/', allow_discovery: false });
  app.use('/peerjs', peer); server.on('request', (req, res) => { if (req.url.startsWith('/peerjs')) app(req, res); });
  console.log('PeerJS server at /peerjs');
} catch (e) { console.log('(PeerJS server not installed: online play will use the public PeerJS server)'); }

server.listen(PORT, () => console.log(`Volt Hockey on http://localhost:${PORT}   (data in ${dataDir})`));
