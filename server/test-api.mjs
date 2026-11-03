/* Tests for the online services (server/core.mjs) with an in-memory store:  node test-api.mjs */
import assert from 'node:assert/strict';
import { createApi } from './core.mjs';

const mem = new Map();
const api = createApi({ get: async k => mem.has(k) ? JSON.parse(mem.get(k)) : null, set: async (k, v) => { mem.set(k, JSON.stringify(v)); }, del: async k => { mem.delete(k); }, list: async p => [...mem.keys()].filter(k => k.startsWith(p)) });
const call = async (m, p, body, token, q) => { const r = await api(m, p, q || {}, body, token ? { authorization: 'Bearer ' + token } : {}); return { ...r.body, _status: r.status }; };
let pass = 0; const ok = (name, cond) => { assert.ok(cond, name); pass++; console.log('  ok  ' + name); };

// accounts
let r = await call('POST', '/register', { username: 'Robin', password: 'hunter22', age: 34 }); ok('register an adult', r.token && r.user.adult === true);
const robin = r.token;
r = await call('POST', '/register', { username: 'robin', password: 'whatever1', age: 20 }); ok('usernames are unique (any case)', r._status === 409);
r = await call('POST', '/register', { username: 'xx_fuck_xx', password: 'whatever1', age: 20 }); ok('rude usernames refused', r._status === 400);
r = await call('POST', '/register', { username: 'Kid', password: 'abc', age: 12 }); ok('short passwords refused', r._status === 400);
r = await call('POST', '/register', { username: 'Kid', password: 'abcdef', age: 12 }); ok('register an under-18 player', r.user.adult === false);
const kid = r.token;
r = await call('POST', '/register', { username: 'Sam', password: 'abcdef', age: 25 }); const sam = r.token;
r = await call('POST', '/login', { username: 'ROBIN', password: 'wrong!!' }); ok('wrong password refused', r._status === 401);
r = await call('POST', '/login', { username: 'ROBIN', password: 'hunter22' }); ok('log in (any case)', !!r.token);
r = await call('GET', '/me', null, 'nonsense'); ok('bad token refused', r._status === 401);

// preferences and progress -> leaderboard
r = await call('PUT', '/prefs', { prefs: { musicVolume: 0.2, camMode: 'first' } }, robin); ok('save preferences', r.ok);
r = await call('PUT', '/progress', { career: { games: 12, wins: 9, goals: 31, shots: 80, cups: 2 }, season: { v: 1, year: 3 }, history: [{ year: 1 }, { year: 2 }] }, robin); ok('save progress', r.ok);
await call('PUT', '/progress', { career: { games: 20, wins: 5, goals: 12, shots: 40, cups: 0 } }, sam);
r = await call('GET', '/me', null, robin); ok('preferences and progress come back', r.prefs.camMode === 'first' && r.progress.career.cups === 2 && r.progress.season.year === 3);
r = await call('GET', '/leaderboard'); ok('leaderboard ranks World Cups', r.cups[0].name === 'Robin' && r.cups[0].seasons === 2);
ok('leaderboard ranks wins', r.wins[0].name === 'Robin' && r.wins.length === 2);
ok('win % needs 10 games', r.winPct.length === 2 && r.winPct[0].pct === 75);

// friends
r = await call('POST', '/friends/request', { username: 'sam' }, robin); ok('send a friend request', r.status === 'out');
r = await call('POST', '/sync', { status: { where: 'menu' } }, sam); ok('the request shows up', r.incoming.includes('Robin'));
r = await call('POST', '/dm', { to: 'Sam', text: 'hi' }, robin); ok('no messages before you are friends', r._status === 403);
r = await call('POST', '/friends/accept', { username: 'Robin' }, sam); ok('accept', r.status === 'friends');
r = await call('POST', '/sync', { status: { where: 'room', room: 'ABCDE' } }, robin); ok('friend is listed and online', r.friends[0].name === 'Sam' && r.friends[0].online);

// messages
r = await call('POST', '/dm', { to: 'Sam', text: 'what the fuck a goal' }, robin); ok('message is filtered', r.msg.text === 'what the **** a goal');
await new Promise(res => setTimeout(res, 750));
r = await call('POST', '/sync', {}, sam); ok('unread count', r.unread.robin === 1);
r = await call('GET', '/dm', null, sam, { with: 'Robin' }); ok('read the conversation', r.msgs.length === 1 && r.msgs[0].from === 'Robin');
r = await call('POST', '/sync', {}, sam); ok('reading clears unread', !r.unread.robin);

// invites
r = await call('POST', '/invite', { to: 'Sam', kind: 'room', code: 'ABCDE' }, robin); ok('invite a friend to a room', r.ok);
r = await call('POST', '/sync', {}, sam); ok('invite arrives', r.invites.length === 1 && r.invites[0].code === 'ABCDE' && r.invites[0].from === 'Robin');
r = await call('POST', '/invite/dismiss', { id: r.invites[0].id }, sam); r = await call('POST', '/sync', {}, sam); ok('dismiss an invite', r.invites.length === 0);
r = await call('POST', '/invite', { to: 'Kid', kind: 'party', code: 'x' }, robin); ok('no invites to non-friends', r._status === 403);

// blocking
await call('POST', '/friends/request', { username: 'Robin' }, kid); r = await call('POST', '/sync', {}, robin); ok('request from the under-18 player', r.incoming.includes('Kid'));
r = await call('POST', '/block', { username: 'Kid' }, robin); r = await call('POST', '/sync', {}, robin); ok('block removes them', !r.incoming.includes('Kid') && r.blocked.includes('kid'));
r = await call('POST', '/friends/request', { username: 'Robin' }, kid); r = await call('POST', '/sync', {}, robin); ok('blocked players cannot ask again', !r.incoming.includes('Kid'));
r = await call('POST', '/report', { username: 'Kid', where: 'room', text: 'test' }, robin); ok('report', r.ok && [...mem.keys()].some(k => k.startsWith('r/')));

// sessions
r = await call('POST', '/logout', {}, robin); r = await call('GET', '/me', null, robin); ok('log out ends the session', r._status === 401);
console.log(`\n${pass} checks passed`);
