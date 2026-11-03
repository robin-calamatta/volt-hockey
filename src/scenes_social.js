/* Screens for the online services: log in / sign up, Friends and party, one friend's options, the global leaderboard,
   plus the Sound and Voice chat settings pages. Forms (typing a username or password) are small HTML pop-ups over the game. */

/* ---------------- pop-up forms ---------------- */
const Forms = {
  isOpen: false, el: null,
  css() {
    if (this.styled) return; this.styled = true; const css = document.createElement('style');
    css.textContent = `#form{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(5,10,14,.6);font-family:"Barlow Condensed",Arial,sans-serif}
      #form .box{width:min(440px,92vw);background:#0f1a22;border:1px solid #2f4a5c;border-radius:14px;padding:18px 20px;color:#e8eef2;box-shadow:0 10px 40px #000a}
      #form h2{margin:0 0 10px;font-size:30px;color:#fff;letter-spacing:.03em}#form .tabs{display:flex;gap:6px;margin-bottom:12px}
      #form .tabs button.on{background:#19c3ff;color:#06222f;border-color:#19c3ff}#form label{display:block;font-size:17px;color:#9fb2bf;margin:8px 0 3px}
      #form input{width:100%;box-sizing:border-box;font:inherit;font-size:20px;background:#0a1116;color:#fff;border:1px solid #3c5566;border-radius:8px;padding:6px 10px}
      #form button{font:inherit;font-size:18px;background:#1b2a35;color:#fff;border:1px solid #3c5566;border-radius:8px;padding:6px 14px;cursor:pointer}
      #form .go{background:#19c3ff;color:#06222f;border-color:#19c3ff;font-weight:700}#form .row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
      #form .err{color:#ff7a59;min-height:22px;margin-top:8px;font-size:17px}#form .note{color:#9fb2bf;font-size:15px;margin-top:8px;line-height:1.3}
      #form .list{max-height:46vh;overflow:auto;display:flex;flex-direction:column;gap:6px}#form .list div{display:flex;align-items:center;gap:8px}#form .list span{flex:1}`;
    document.head.append(css);
  },
  show(html, wire) {
    this.close(); this.css(); this.isOpen = true; Controls.keys = {};
    const el = this.el = document.createElement('div'); el.id = 'form'; el.innerHTML = `<div class="box">${html}</div>`; document.body.append(el);
    el.addEventListener('pointerdown', e => { if (e.target === el) this.close(); });
    el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') this.close(); });
    wire(el); const first = el.querySelector('input'); if (first) setTimeout(() => first.focus(), 0);
  },
  close() { if (this.el) this.el.remove(); this.el = null; setTimeout(() => { this.isOpen = false; }, 120); Controls.keys = {}; },
  /* Log in or sign up. done() runs once you are logged in. */
  account(done, mode = 'login') {
    if (!Account.available()) return Toasts.show('Online services need the game to be opened from its website.', [], 5000);
    const signup = mode === 'signup';
    this.show(`<h2>${signup ? 'Create an account' : 'Log in'}</h2>
      <div class="tabs"><button data-m="login" class="${signup ? '' : 'on'}">Log in</button><button data-m="signup" class="${signup ? 'on' : ''}">Sign up</button></div>
      <label>Username</label><input name="u" maxlength="16" autocomplete="username" placeholder="3-16 letters, numbers or _">
      <label>Password</label><input name="p" type="password" maxlength="100" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'at least 6 characters' : ''}">
      ${signup ? '<label>Your age</label><input name="a" type="number" min="5" max="120" inputmode="numeric" placeholder="e.g. 16">' : ''}
      <div class="err"></div>
      ${signup ? '<div class="note">Your age is used for chat safety: players under 18 can only text and voice chat with friends they have accepted. Only "under 18" or "18 and over" is kept, not your age.</div>' : ''}
      <div class="row"><button data-a="guest">Play as guest</button><button class="go" data-a="go">${signup ? 'Create account' : 'Log in'}</button></div>`, el => {
      const err = el.querySelector('.err'), val = n => (el.querySelector(`[name=${n}]`) || {}).value || '';
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => this.account(done, b.dataset.m));
      el.querySelector('[data-a=guest]').onclick = () => this.close();
      const go = async () => {
        err.textContent = 'One moment...';
        try { if (signup) await Account.register(val('u').trim(), val('p'), val('a')); else await Account.login(val('u').trim(), val('p')); this.close(); Toasts.show(`Welcome, <b>${esc(Account.name)}</b>! Your progress is now saved online.`, [], 4500); done && done(); }
        catch (e) { err.textContent = e.message; }
      };
      el.querySelector('[data-a=go]').onclick = go; el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
  },
  /* One line of text (e.g. a friend's username). */
  ask(title, placeholder, done) {
    this.show(`<h2>${esc(title)}</h2><input maxlength="40" placeholder="${esc(placeholder)}"><div class="err"></div><div class="row"><button data-a="x">Cancel</button><button class="go" data-a="go">OK</button></div>`, el => {
      const input = el.querySelector('input'), go = async () => { const v = input.value.trim(); if (!v) return; this.close(); await done(v); };
      el.querySelector('[data-a=x]').onclick = () => this.close(); el.querySelector('[data-a=go]').onclick = go; input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
  },
  /* Pick friends to invite (to your party or your room). */
  invite(kind, code) {
    const list = Social.data.friends;
    this.show(`<h2>Invite to your ${kind === 'party' ? 'party' : 'room'}</h2><div class="list">${list.length ? list.map((f, i) => `<div><span>${f.online ? '🟢' : '⚪'} ${esc(f.name)}</span><button data-i="${i}">Invite</button></div>`).join('') : '<div class="note">No friends yet. Add one by username on the Friends screen.</div>'}</div><div class="row"><button data-a="x">Done</button></div>`, el => {
      el.querySelector('[data-a=x]').onclick = () => this.close();
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { Social.invite(list[+b.dataset.i].name, kind, code); b.textContent = 'Sent'; b.disabled = true; });
    });
  }
};

/* ---------------- Friends and party ---------------- */
const statusText = f => !f.online ? 'offline' : !f.status ? 'online' : f.status.where === 'game' ? 'in a match' : f.status.where === 'room' ? 'in room ' + f.status.room : f.status.where === 'party' ? 'in a party' : 'in the menus';
class SocialScene extends ListMenuScene {
  constructor() { super('Social'); }
  init(data) { this.cursorAt = (data && data.cursor) || 0; }
  create() {
    const items = [], S = Social.data, restart = () => this.scene.restart({ cursor: this.cursor });
    if (!Account.available()) items.push({ label: () => 'Online services need the game opened from its website' });
    else if (!Account.loggedIn) items.push({ label: () => 'Log in or sign up   (guests can still play everything)', hint: 'Save your progress online, add friends, party up and chat', select: () => Forms.account(restart) });
    else items.push({ label: () => `Logged in as ${Account.name}${Account.adult ? '' : '   (under 18: chat with friends only)'}   ·   A: log out`, select: async () => { await Account.logout(); Party.reset(); restart(); } });
    if (Account.loggedIn) {
      if (!Party.active) items.push({ label: () => 'Start a party', hint: 'Friends in your party follow you into your online rooms, each with their own local players', select: async () => { try { await Party.create(); Forms.invite('party', Party.id); } catch (e) { /* shown */ } restart(); } });
      else {
        items.push({ label: () => `Party (${Party.members.length}/${Party.max}):  ${Party.members.map(m => m.name + (m.leader ? ' ★' : '')).join(', ')}`, hint: Party.role === 'leader' ? 'Create a room under Online and everyone in the party joins it' : 'You will join the rooms your party leader opens' });
        if (Party.role === 'leader') items.push({ label: () => 'Invite friends to the party', select: () => Forms.invite('party', Party.id) });
        items.push({ label: () => Party.role === 'leader' ? 'End the party' : 'Leave the party', select: () => { Party.leave(); restart(); } });
      }
      items.push({ label: () => 'Add a friend by username', select: () => Forms.ask('Add a friend', 'Their username', async n => { await Social.request(n); restart(); }) });
      for (const inv of S.invites) items.push({ label: () => `${inv.from} invited you to ${inv.kind === 'party' ? 'their party' : 'room ' + inv.code}   ·   A: join`, select: () => Social.acceptInvite(inv) });
      for (const n of S.incoming) items.push({ label: () => `Friend request from ${n}   ·   A: accept   ◀ decline`, select: async () => { await Social.accept(n); restart(); }, change: async d => { if (d < 0) { await Social.remove(n); restart(); } } });
      const shown = S.friends.slice(0, 10);
      for (const f of shown) items.push({ label: () => `${f.online ? '●' : '○'} ${f.name}   ${statusText(f)}${S.unread[f.name.toLowerCase()] ? `   ✉ ${S.unread[f.name.toLowerCase()]}` : ''}`, hint: 'A: message, invite, join, remove or block', select: () => this.scene.start('Friend', { name: f.name, cursor: this.cursor }) });
      if (S.friends.length > shown.length) items.push({ label: () => `+ ${S.friends.length - shown.length} more friends (message them from the chat button)` });
      for (const n of S.outgoing) items.push({ label: () => `Request sent to ${n}   ·   A: cancel`, select: async () => { await Social.remove(n); restart(); } });
      if (!S.friends.length && !S.incoming.length) items.push({ label: () => 'No friends yet: add one by their username' });
    }
    items.push({ label: () => 'Back', select: () => this.scene.start('Main') });
    this.buildMenu('FRIENDS AND PARTY', items, 200);
    this.onBack = () => this.scene.start('Main'); this.cursor = Math.min(this.cursorAt, this.items.length - 1);
    this.sig = this.signature(); this.offs = [Social.on(() => this.changed()), Party.on(() => this.changed()), Account.on(() => this.changed())];
    this.events.once('shutdown', () => this.offs.forEach(f => f()));
    if (Account.loggedIn) Social.tick();
  }
  signature() { const S = Social.data; return JSON.stringify([Account.name, Party.members.map(m => m.name), S.invites.map(i => i.id), S.incoming, S.outgoing, S.friends.map(f => [f.name, f.online, f.status && f.status.where, f.status && f.status.room]), S.unread]); }
  changed() { if (!this.sys.isActive() || Forms.isOpen) return; const sig = this.signature(); if (sig !== this.sig) { this.sig = sig; this.scene.restart({ cursor: this.cursor }); } }
}

class FriendScene extends ListMenuScene {
  constructor() { super('Friend'); }
  init(data) { this.name = data.name; this.back = data.cursor || 0; }
  create() {
    const f = Social.data.friends.find(x => x.name === this.name) || { name: this.name, online: false }, back = () => this.scene.start('Social', { cursor: this.back }), items = [];
    items.push({ label: () => 'Message', select: () => Chat.openDm(f.name) });
    if (Party.role === 'leader') items.push({ label: () => 'Invite to my party', select: () => Social.invite(f.name, 'party', Party.id) });
    else if (!Party.active) items.push({ label: () => 'Start a party and invite them', select: async () => { try { await Party.create(); Social.invite(f.name, 'party', Party.id); } catch (e) { /* shown */ } } });
    if (Online.current && Online.current.code) items.push({ label: () => `Invite to my room (${Online.current.code})`, select: () => Social.invite(f.name, 'room', Online.current.code) });
    if (f.online && f.status && f.status.open && f.status.room) items.push({ label: () => `Join their room (${f.status.room})`, select: () => joinRoomFromAnywhere(f.status.room) });
    if (f.online && f.status && f.status.party) items.push({ label: () => 'Join their party', select: () => { Party.join(f.status.party); back(); } });
    items.push({ label: () => this.stats ? `Career: ${this.stats.career.games} games, ${this.stats.career.wins} wins, ${this.stats.career.goals} goals, ${this.stats.career.cups} World Cups` : 'Career: loading...' });
    items.push({ label: () => 'Remove friend', select: async () => { await Social.remove(f.name); back(); } });
    items.push({ label: () => 'Block', select: async () => { await Social.block(f.name); back(); } });
    items.push({ label: () => 'Back', select: back });
    this.buildMenu(f.name.toUpperCase() + (f.online ? '' : '  (offline)'), items, 210); this.onBack = back;
    Account.req('GET', '/profile', null, { name: f.name }).then(r => { this.stats = r; }).catch(() => {});
  }
}

/* ---------------- global leaderboard ---------------- */
class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }
  create() {
    menuBackdrop(this); this.tab = 0; this.data = null; this.error = '';
    this.tabs = [['World Cups', 'cups', r => r.cups], ['Wins', 'wins', r => r.wins], ['Goals', 'goals', r => r.goals], ['Win %', 'winPct', r => r.pct + '%']];
    this.add.text(CX, 44, 'LEADERBOARD', { ...STYLE.title, fontSize: '52px' }).setOrigin(0.5); this.add.rectangle(CX, 82, 130, 4, THEME.gold, 0.95);
    this.tabText = this.add.text(CX, 118, '', { ...STYLE.hud, fontSize: '28px' }).setOrigin(0.5);
    panel(this, 190, 145, 900, 515, { depth: -40 });
    this.rows = Array.from({ length: 15 }, (_, i) => this.add.text(230, 162 + i * 32, '', { ...MONO_LB, color: '#e8eef2' }));
    this.note = this.add.text(CX, 400, '', { ...STYLE.hint, fontSize: '24px', color: '#9fb2bf', align: 'center', wordWrap: { width: 820 } }).setOrigin(0.5);
    this.add.text(CX, 696, '◀ ▶  category        B  back' + (Account.loggedIn ? '' : '        log in from Friends and party to get on the board'), { ...STYLE.hint, fontSize: '19px', color: '#9fb2bf' }).setOrigin(0.5);
    const z = this.add.zone(CX, 118, 700, 50).setInteractive({ useHandCursor: true }); z.on('pointerdown', p => { this.tab = (this.tab + (p.x < CX ? 3 : 1)) % 4; this.draw(); });
    const b = this.add.zone(CX, 696, 400, 40).setInteractive({ useHandCursor: true }); b.on('pointerdown', () => this.scene.start('Main'));
    if (!Account.available()) this.error = 'The leaderboard needs the game opened from its website.';
    else Account.leaderboard().then(d => { this.data = d; this.draw(); }).catch(e => { this.error = e.message; this.draw(); });
    this.draw();
  }
  draw() {
    const [name, key, val] = this.tabs[this.tab]; this.tabText.setText(this.tabs.map((t, i) => i === this.tab ? `▶ ${t[0]} ◀` : t[0]).join('     '));
    const list = this.data ? this.data[key] || [] : [];
    this.note.setText(this.error || (!this.data ? 'Loading...' : !list.length ? (key === 'winPct' ? 'Win % needs 10 games played.' : 'Nobody on the board yet. Log in and play!') : ''));
    this.rows.forEach((t, i) => {
      const r = list[i]; if (!r) return t.setText('');
      t.setText(`${String(i + 1).padStart(2)}.  ${r.name.padEnd(17)} ${String(val(r)).padStart(6)}     ${r.games} games   ${r.seasons} seasons`).setColor(r.name === Account.name ? '#ffe27a' : '#e8eef2');
    });
  }
  update() {
    Controls.update(this.game.loop.frame); const e = Controls.menu();
    if (e.left) { this.tab = (this.tab + 3) % 4; Sound.play('blip'); this.draw(); } if (e.right) { this.tab = (this.tab + 1) % 4; Sound.play('blip'); this.draw(); }
    if (e.b || e.a || e.start) { Sound.play('back'); this.scene.start('Main'); }
  }
}
const MONO_LB = { fontFamily: 'monospace', fontSize: '21px' };

/* ---------------- Sound and Voice chat settings ---------------- */
const AudioDevices = { list: [], async load() { this.list = await Voice.devices(); return this.list; }, of(kind) { return this.list.filter(d => d.kind === kind); } };
const deviceItem = (title, kind, key, apply) => {
  const opts = () => [{ id: '', label: 'System default' }, ...AudioDevices.of(kind).filter(d => d.id && d.id !== 'default')];
  const step = d => { const o = opts(), i = Math.max(0, o.findIndex(x => x.id === (Settings[key] || ''))); Settings[key] = o[(i + d + o.length) % o.length].id; Settings.save(); apply(); };
  return { label: () => { const o = opts(), cur = o.find(x => x.id === (Settings[key] || '')) || o[0]; return `${title}   ◀ ${cur.label.slice(0, 34)} ▶`; }, change: step, select: () => step(1) };
};
const meter = v => '▮'.repeat(Math.round(v * 12)) + '▯'.repeat(12 - Math.round(v * 12));
const VOICE_MODES = { open: 'Open mic', ptt: 'Push to talk', mute: 'Mic off (listen only)', off: 'Off (no voice chat)' };
const cycleVoiceMode = d => { const k = Object.keys(VOICE_MODES), i = Math.max(0, k.indexOf(Voice.mode())); Settings.voiceMode = k[(i + (d || 1) + k.length) % k.length]; Settings.save(); Voice.refresh(); Voice.updateGate(); };
Object.assign(SETTINGS_PAGES, {
  'Voice chat': () => [
    { label: () => `Voice chat   ◀ ${VOICE_MODES[Voice.mode()]} ▶`, change: cycleVoiceMode, select: () => cycleVoiceMode(1) },
    deviceItem('Microphone', 'audioinput', 'micId', () => { Voice.closeMic(); Voice.refresh(); if (Voice.testing) Voice.test(true); }),
    { label: () => `Mic volume   ◀ ${pct(Settings.micVolume === undefined ? 1 : Settings.micVolume)} ▶`, change: d => { Settings.adjust('micVolume', d); Voice.applyVolumes(); } },
    { label: () => `Hear yourself (mic monitoring)   ◀ ${Settings.micMonitor ? 'On' : 'Off'} ▶`, change: () => { Settings.toggle('micMonitor'); Voice.applyVolumes(); }, select: () => { Settings.toggle('micMonitor'); Voice.applyVolumes(); } },
    { label: () => `Mic test   ${Voice.testing ? meter(Voice.micLevel()) + '   A: stop' : (Voice.lastError ? Voice.lastError : 'A: start')}`, select: () => Voice.test(!Voice.testing) },
    { label: () => `Voice chat volume   ◀ ${pct(Settings.voiceVolume === undefined ? 1 : Settings.voiceVolume)} ▶`, change: d => { Settings.adjust('voiceVolume', d); Voice.applyVolumes(); } },
    { label: () => 'Push to talk:  hold L3 (gamepad), G (keyboard 1), L (keyboard 2) or the 🎙 button' },
    { label: () => Account.loggedIn ? (Account.adult ? 'You can talk with anyone in your room or party (mute anyone from the chat)' : 'Under 18: you only hear and talk with friends') : 'Guests do not have voice chat: log in under Friends and party' }]
});
// Sound: master volume and the speakers go at the top of the existing page; nothing is removed
{
  const base = SETTINGS_PAGES['Sound and commentary'];
  SETTINGS_PAGES['Sound and commentary'] = sc => [
    slider('Master volume', 'masterVolume', pct),
    Sound.canPickSpeaker() ? deviceItem('Speakers / headphones', 'audiooutput', 'speakerId', () => Sound.applySpeaker()) : { label: () => 'Speakers / headphones   (this browser always uses your system output)' },
    ...base(sc)];
}
