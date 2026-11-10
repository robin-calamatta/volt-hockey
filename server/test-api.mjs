/* Tests for the online services (server/core.mjs) with an in-memory store:  node test-api.mjs */
import assert from 'node:assert/strict';
import { createApi } from './core.mjs';

const mem = new Map(), outbox = [];
const api = createApi({ get: async k => mem.has(k) ? JSON.parse(mem.get(k)) : null, set: async (k, v) => { mem.set(k, JSON.stringify(v)); }, del: async k => { mem.delete(k); }, list: async p => [...mem.keys()].filter(k => k.startsWith(p)) }, { admin: { user: 'boss', pass: 's3cret-pass' }, siteUrl: 'https://volt.example', sendEmail: async m => { outbox.push(m); } });
const call = async (m, p, body, token, q) => { const r = await api(m, p, q || {}, body, token ? { authorization: 'Bearer ' + token } : {}); return { ...r.body, _status: r.status }; };
let pass = 0; const ok = (name, cond) => { assert.ok(cond, name); pass++; console.log('  ok  ' + name); };

// accounts
let r = await call('POST', '/register', { legal: 'test', username: 'Robin', password: 'hunter22', age: 34, email: 'robin@example.com' }); ok('register an adult', r.token && r.user.adult === true);
const robin = r.token;
r = await call('POST', '/register', { legal: 'test', username: 'robin', password: 'whatever1', age: 20, email: 'other@example.com' }); ok('usernames are unique (any case)', r._status === 409);
r = await call('POST', '/register', { legal: 'test', username: 'xx_fuck_xx', password: 'whatever1', age: 20, email: 'x@example.com' }); ok('rude usernames refused', r._status === 400);
r = await call('POST', '/register', { username: 'NoTerms', password: 'hunter22', age: 30, email: 'nt@example.com' }); ok('sign-up without agreeing to the EULA refused', r._status === 400);
r = await call('POST', '/register', { legal: 'test', username: 'Kid', password: 'abc', age: 12, email: 'kid@example.com' }); ok('short passwords refused', r._status === 400);
r = await call('POST', '/register', { legal: 'test', username: 'Kid', password: 'abcdef', age: 12, email: 'kid@example.com' }); ok('register an under-18 player', r.user.adult === false);
const kid = r.token;
r = await call('POST', '/register', { legal: 'test', username: 'Sam', password: 'abcdef', age: 25, email: 'sam@example.com' }); const sam = r.token;
r = await call('POST', '/login', { username: 'ROBIN', password: 'wrong!!' }); ok('wrong password refused', r._status === 401);
r = await call('POST', '/login', { username: 'ROBIN', password: 'hunter22' }); ok('log in (any case)', !!r.token);
r = await call('POST', '/login', { username: 'Robin@Example.com', password: 'hunter22' }); ok('log in with your email', !!r.token && r.user.name === 'Robin');
r = await call('GET', '/me', null, 'nonsense'); ok('bad token refused', r._status === 401);

// preferences and progress -> leaderboard
r = await call('PUT', '/prefs', { prefs: { musicVolume: 0.2, camMode: 'first' } }, robin); ok('save preferences', r.ok);
r = await call('PUT', '/progress', { career: { games: 12, wins: 9, goals: 31, shots: 80, cups: 2 }, season: { v: 1, year: 3 }, history: [{ year: 1 }, { year: 2 }] }, robin); ok('save progress', r.ok);
await call('PUT', '/progress', { career: { games: 20, wins: 5, goals: 12, shots: 40, cups: 0 } }, sam);
r = await call('GET', '/me', null, robin); ok('preferences and progress come back', r.prefs.camMode === 'first' && r.progress.career.cups === 2 && r.progress.season.year === 3);
r = await call('GET', '/leaderboard'); ok('leaderboard ranks World Cups', r.cups[0].name === 'Robin' && r.cups[0].seasons === 2);
ok('leaderboard ranks wins', r.wins[0].name === 'Robin' && r.wins.length === 2);
ok('win % needs 10 games', r.winPct.length === 2 && r.winPct[0].pct === 75);

// username search
r = await call('GET', '/search', null, robin, { q: 'sa' }); ok('search by the first letters', r.users.length === 1 && r.users[0].name === 'Sam');
r = await call('GET', '/search', null, robin, { q: 'k' }); ok('under-18 players are not listed by a partial search', !r.users.some(x => x.name === 'Kid'));
r = await call('GET', '/search', null, robin, { q: 'kid' }); ok('...but an exact username finds them', r.users.some(x => x.name === 'Kid'));
r = await call('GET', '/search', null, robin, { q: 'rob' }); ok('you are not in your own results', r.users.length === 0);

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

// email and password reset
r = await call('POST', '/register', { legal: 'test', username: 'Dupe', password: 'abcdef', age: 30, email: 'ROBIN@example.com' }); ok('an email can only belong to one account', r._status === 409);
r = await call('POST', '/register', { legal: 'test', username: 'NoMail', password: 'abcdef', age: 30, email: 'nope' }); ok('a valid email is required', r._status === 400);
r = await call('GET', '/me', null, sam); ok('your email is shown masked', r.user.email === 's•••m@example.com');
r = await call('POST', '/reset/request', { who: 'nobody@example.com' }); ok('reset for an unknown email looks the same', r.ok && outbox.length === 0);
r = await call('POST', '/reset/request', { who: 'Sam' }); ok('reset by username sends an email', r.ok && outbox.length === 1 && outbox[0].to === 'sam@example.com');
const link = /https:\/\/volt\.example\/\?reset=([0-9a-f]+)/.exec(outbox[0].text); ok('the email has a reset link', !!link);
r = await call('POST', '/reset/request', { who: 'sam@example.com' }); ok('repeat requests within a minute are not re-sent', r.ok && outbox.length === 1);
r = await call('POST', '/reset/confirm', { token: 'bad', password: 'newpass1' }); ok('a bad reset code is refused', r._status === 410);
r = await call('POST', '/reset/confirm', { token: link[1], password: 'newpass1' }); ok('reset sets a new password and logs in', !!r.token && r.user.name === 'Sam');
const sam2 = r.token;
r = await call('GET', '/me', null, sam); ok('the old login stops working after a reset', r._status === 401);
r = await call('POST', '/login', { username: 'sam', password: 'newpass1' }); ok('log in with the new password', !!r.token);
r = await call('POST', '/reset/confirm', { token: link[1], password: 'again123' }); ok('a reset link works only once', r._status === 410);
r = await call('POST', '/email', { email: 'sam2@example.com', password: 'wrong' }, sam2); ok('changing email needs your password', r._status === 403);
r = await call('POST', '/email', { email: 'sam2@example.com', password: 'newpass1' }, sam2); ok('change your email', r.ok && r.user.email.endsWith('@example.com'));
r = await call('POST', '/register', { legal: 'test', username: 'Sam3', password: 'abcdef', age: 30, email: 'sam@example.com' }); ok('the old email is free again', !!r.token);

// admin
const adm = async (m, p, body, t, q) => { const r = await api(m, p, q || {}, body, t ? { 'x-admin-token': t } : {}); return { ...r.body, _status: r.status }; };
r = await adm('GET', '/admin/users'); ok('admin pages need the admin login', r._status === 401);
r = await adm('POST', '/admin/login', { user: 'boss', pass: 'wrong' }); ok('wrong admin password refused', r._status === 401);
r = await adm('POST', '/admin/login', { user: 'boss', pass: 's3cret-pass' }); const at = r.token; ok('admin login', !!at);
r = await adm('GET', '/admin/users', null, at, { q: 'sam' }); ok('find players', r.users.some(u => u.name === 'Sam'));
r = await adm('GET', '/admin/user', null, at, { name: 'Sam' }); ok('see a player (no password hash)', r.user.name === 'Sam' && !r.user.hash);
r = await adm('POST', '/admin/user', { name: 'Sam3', patch: { banned: true } }, at); ok('suspend a player', r.user.banned === true);
r = await call('POST', '/login', { username: 'Sam3', password: 'abcdef' }); ok('a suspended player cannot log in', r._status === 403);
r = await adm('POST', '/admin/user', { name: 'Robin', patch: { career: { games: 99, wins: 50, goals: 10, shots: 20, cups: 7 } } }, at); r = await call('GET', '/leaderboard'); ok('edit career totals (leaderboard follows)', r.cups[0].name === 'Robin' && r.cups[0].cups === 7);
r = await adm('GET', '/admin/reports', null, at); ok('read reports', r.reports.length >= 1);
r = await adm('GET', '/admin/keys', null, at, { prefix: 'u/' }); ok('browse the stored data', r.keys.includes('u/robin'));
r = await adm('PUT', '/admin/raw', { key: 'note/test', value: { hi: 1 } }, at); r = await adm('GET', '/admin/raw', null, at, { key: 'note/test' }); ok('edit raw data', r.value.hi === 1);
r = await adm('POST', '/admin/user/delete', { name: 'Sam3' }, at); r = await adm('GET', '/admin/user', null, at, { name: 'Sam3' }); ok('delete a player', r._status === 404);

// sessions
r = await call('POST', '/logout', {}, robin); r = await call('GET', '/me', null, robin); ok('log out ends the session', r._status === 401);
console.log(`\n${pass} checks passed`);
