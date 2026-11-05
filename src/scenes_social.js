/* Screens for the online services: log in / sign up, Friends and party, one friend's options, the global leaderboard,
   plus the Sound and Voice chat settings pages. Forms (typing a username or password) are small HTML pop-ups over the game. */

/* ---------------- pop-up forms ----------------
   Work with a mouse, a keyboard, touch or a gamepad alone (PadNav and the on-screen keyboard, ui_overlay.js). While one is open the game behind
   it does not react to clicks or buttons. Password boxes have a 👁 button to peek. */
const Forms = {
  isOpen: false, el: null,
  css() {
    if (this.styled) return; this.styled = true; const css = document.createElement('style');
    css.textContent = `#form{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(5,10,14,.66);font-family:"Barlow Condensed",Arial,sans-serif}
      #form .box{width:min(460px,92vw);max-height:94vh;overflow:auto;box-sizing:border-box;background:#0f1a22;border:1px solid #2f4a5c;border-radius:14px;padding:16px 20px;color:#e8eef2;box-shadow:0 10px 40px #000a}
      #form h2{margin:0 0 8px;font-size:30px;color:#fff;letter-spacing:.03em}#form .tabs{display:flex;gap:6px;margin-bottom:8px}
      #form .tabs button.on{background:#19c3ff;color:#06222f;border-color:#19c3ff}#form label{display:block;font-size:17px;color:#9fb2bf;margin:7px 0 3px}
      #form .pw{display:flex;gap:6px}#form .pw input{flex:1;min-width:0}#form .pw button{padding:4px 10px}
      #form input{width:100%;box-sizing:border-box;font:inherit;font-size:20px;background:#0a1116;color:#fff;border:1px solid #3c5566;border-radius:8px;padding:6px 10px}
      #form button{font:inherit;font-size:18px;background:#1b2a35;color:#fff;border:1px solid #3c5566;border-radius:8px;padding:6px 14px;cursor:pointer}
      #form .go{background:#19c3ff;color:#06222f;border-color:#19c3ff;font-weight:700}#form .row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}
      #form .link{background:none;border:0;color:#7fd3ff;padding:2px 0;font-size:17px;text-decoration:underline}
      #form .err{color:#ff7a59;min-height:22px;margin-top:8px;font-size:17px}#form .ok{color:#3dff9a}#form .note{color:#9fb2bf;font-size:15px;margin-top:6px;line-height:1.3}
      #form .list{max-height:46vh;overflow:auto;display:flex;flex-direction:column;gap:6px}#form .list div{display:flex;align-items:center;gap:8px}#form .list span{flex:1}
      #form .pads{color:#9fb2bf;font-size:14px;text-align:center;margin-top:8px}`;
    document.head.append(css);
  },
  show(html, wire) {
    this.close(true); this.css(); this.isOpen = true; Controls.keys = {};
    const el = this.el = document.createElement('div'); el.id = 'form';
    el.innerHTML = `<div class="box">${html}<div class="pads">Gamepad: move with the D-pad, A selects (and opens the keyboard), B goes back</div></div>`; document.body.append(el);
    el.addEventListener('pointerdown', e => { if (e.target === el) this.close(); });
    el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') this.close(); });
    for (const b of el.querySelectorAll('[data-peek]')) b.onclick = () => { const inp = el.querySelector(`[name=${b.dataset.peek}]`); const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; inp.dataset.peek = show ? '1' : ''; b.textContent = show ? '🙈' : '👁'; };
    wire(el);
    PadNav.open(el, { onBack: () => this.close(), modal: true, focusFirst: true });
    const first = el.querySelector('input'); if (first && !PadNav.padRecently()) setTimeout(() => first.focus(), 0);
  },
  close(quiet) {
    if (this.el) { PadNav.close(this.el); this.el.remove(); } this.el = null; if (typeof OSK !== 'undefined') OSK.close(false);
    setTimeout(() => { this.isOpen = !!this.el; }, 150); Controls.keys = {};
  },
  pw(name, label, auto, ph = '') { return `<label>${label}</label><div class="pw"><input name="${name}" type="password" maxlength="100" autocomplete="${auto}" placeholder="${ph}" aria-label="${label}"><button type="button" data-peek="${name}" title="Show / hide">👁</button></div>`; },
  field(name, label, type = 'text', extra = '') { return `<label>${label}</label><input name="${name}" type="${type}" aria-label="${label}" ${extra}>`; },
  /* Log in, sign up, or "forgot password". done() runs once you are logged in. */
  account(done, mode = 'login') {
    if (!Account.available()) return Toasts.show('Online services need the game to be opened from its website.', [], 5000);
    if (mode === 'forgot') return this.forgot(done);
    const signup = mode === 'signup';
    this.show(`<h2>${signup ? 'Create an account' : 'Log in'}</h2>
      <div class="tabs"><button data-m="login" class="${signup ? '' : 'on'}">Log in</button><button data-m="signup" class="${signup ? 'on' : ''}">Sign up</button></div>
      ${this.field('u', signup ? 'Username' : 'Username or email', 'text', `maxlength="${signup ? 16 : 120}" autocomplete="username" ${signup ? 'placeholder="3-16 letters, numbers or _"' : ''}`)}
      ${signup ? this.field('e', 'Email (only for resetting your password)', 'email', 'maxlength="120" autocomplete="email"') : ''}
      ${this.pw('p', 'Password', signup ? 'new-password' : 'current-password', signup ? 'at least 6 characters' : '')}
      ${signup ? this.pw('p2', 'Confirm password', 'new-password') + this.field('a', 'Your age', 'number', 'min="5" max="120" inputmode="numeric" maxlength="3"') : '<button class="link" data-a="forgot">Forgot your password?</button>'}
      <div class="err"></div>
      ${signup ? '<div class="note">Your age is used for chat safety: players under 18 can only text and voice chat with friends they have accepted. Only "under 18" or "18 and over" is kept. Your email is never shown to anyone.</div>' : ''}
      <div class="row"><button data-a="guest">Play as guest</button><button class="go" data-a="go">${signup ? 'Create account' : 'Log in'}</button></div>`, el => {
      const err = el.querySelector('.err'), val = n => (el.querySelector(`[name=${n}]`) || {}).value || '';
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => this.account(done, b.dataset.m));
      el.querySelector('[data-a=guest]').onclick = () => this.close();
      const f = el.querySelector('[data-a=forgot]'); if (f) f.onclick = () => this.forgot(done);
      const go = async () => {
        if (signup && val('p') !== val('p2')) { err.textContent = "The passwords don't match."; return; }
        err.textContent = 'One moment...';
        try {
          if (signup) await Account.register(val('u').trim(), val('p'), val('a'), val('e').trim());
          else { let who = val('u').trim(); await Account.login(who, val('p')); }
          this.close(); Toasts.show(`Welcome, <b>${esc(Account.name)}</b>! Your progress is now saved online.`, [], 4500); done && done();
        } catch (e) { err.textContent = e.message; }
      };
      el.querySelector('[data-a=go]').onclick = go; el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') go(); });
      for (const i of el.querySelectorAll('input')) i.dataset.enter = '';
    });
  },
  forgot(done) {
    this.show(`<h2>Forgot your password?</h2>${this.field('w', 'Your username or email', 'text', 'maxlength="120" autocomplete="username"')}
      <div class="note">We'll email you a link to choose a new password. It works for 30 minutes.</div><div class="err"></div>
      <div class="row"><button data-a="back">Back</button><button class="go" data-a="go">Send the link</button></div>`, el => {
      const err = el.querySelector('.err');
      el.querySelector('[data-a=back]').onclick = () => this.account(done, 'login');
      const go = async () => {
        const who = el.querySelector('[name=w]').value.trim(); if (!who) return; err.textContent = 'Sending...';
        try { await Account.requestReset(who); err.className = 'err ok'; err.textContent = 'If that account has an email, a link is on its way. Check your inbox (and spam).'; }
        catch (e) { err.className = 'err'; err.textContent = e.message; }
      };
      el.querySelector('[data-a=go]').onclick = go; el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') go(); });
    });
  },
  /* opened by the link in the reset email (?reset=...) */
  reset(token) {
    this.show(`<h2>Choose a new password</h2>${this.pw('p', 'New password', 'new-password', 'at least 6 characters')}${this.pw('p2', 'Confirm new password', 'new-password')}
      <div class="err"></div><div class="row"><button data-a="x">Cancel</button><button class="go" data-a="go">Save and log in</button></div>`, el => {
      const err = el.querySelector('.err'), val = n => el.querySelector(`[name=${n}]`).value;
      el.querySelector('[data-a=x]').onclick = () => this.close();
      const go = async () => {
        if (val('p') !== val('p2')) { err.textContent = "The passwords don't match."; return; }
        err.textContent = 'Saving...';
        try { await Account.confirmReset(token, val('p')); this.close(); Toasts.show(`Password changed. Welcome back, <b>${esc(Account.name)}</b>!`, [], 5000); }
        catch (e) { err.textContent = e.message; }
      };
      el.querySelector('[data-a=go]').onclick = go; el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') go(); });
    });
  },
  /* add or change the email on your account */
  email() {
    if (!Account.loggedIn) return this.account();
    this.show(`<h2>${Account.user.email ? 'Change your email' : 'Add an email'}</h2>
      <div class="note">${Account.user.email ? 'Now: ' + esc(Account.user.email) : 'Add one so you can reset your password if you forget it.'}</div>
      ${this.field('e', 'Email', 'email', 'maxlength="120" autocomplete="email"')}${this.pw('p', 'Your password (to confirm it is you)', 'current-password')}
      <div class="err"></div><div class="row"><button data-a="x">Cancel</button><button class="go" data-a="go">Save</button></div>`, el => {
      const err = el.querySelector('.err'), val = n => el.querySelector(`[name=${n}]`).value;
      el.querySelector('[data-a=x]').onclick = () => this.close();
      el.querySelector('[data-a=go]').onclick = async () => { err.textContent = 'Saving...'; try { await Account.setEmail(val('e').trim(), val('p')); this.close(); Toasts.show('Email saved.', [], 3000); } catch (e) { err.textContent = e.message; } };
    });
  },
  /* Add a friend: matching usernames drop down as you type (mouse, keyboard or gamepad + on-screen keyboard). */
  findFriend() {
    if (!Account.loggedIn) return this.account();
    this.show(`<h2>Add a friend</h2><input name="q" maxlength="16" placeholder="Start typing their username" aria-label="Their username" autocomplete="off"><div class="list" data-res></div><div class="err"></div><div class="row"><button data-a="x">Done</button></div>`, el => {
      const input = el.querySelector('input'), res = el.querySelector('[data-res]'), err = el.querySelector('.err'); let timer = null, seq = 0;
      const label = f => f === 'friends' ? 'Friends' : f === 'out' ? 'Request sent' : f === 'in' ? 'Accept' : 'Add';
      const draw = users => {
        res.innerHTML = users.map((u, i) => `<div><span>${esc(u.name)}</span><button data-i="${i}" ${u.friend === 'friends' || u.friend === 'out' ? 'disabled' : ''}>${label(u.friend)}</button></div>`).join('') || (input.value.trim() ? '<div class="note">No players found. An under-18 player only shows up when you type their exact username.</div>' : '');
        res.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => { const u = users[+b.dataset.i]; b.disabled = true; b.textContent = '...'; const ok = await (u.friend === 'in' ? Social.accept(u.name) : Social.request(u.name)); b.textContent = ok ? (u.friend === 'in' ? 'Friends' : 'Request sent') : label(u.friend); });
      };
      const search = () => { clearTimeout(timer); timer = setTimeout(async () => {
        const q = input.value.trim(), my = ++seq; if (!q) return draw([]);
        try { const r = await Account.req('GET', '/search', null, { q }); if (my === seq) { err.textContent = ''; draw(r.users); } } catch (e) { err.textContent = e.message; }
      }, 180); };
      input.addEventListener('input', search); input.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = res.querySelector('[data-i]:not([disabled])'); if (b) b.click(); } });
      el.querySelector('[data-a=x]').onclick = () => this.close();
    });
  },
  /* One line of text (e.g. a friend's username). */
  ask(title, placeholder, done) {
    this.show(`<h2>${esc(title)}</h2><input name="q" maxlength="40" placeholder="${esc(placeholder)}" aria-label="${esc(title)}"><div class="err"></div><div class="row"><button data-a="x">Cancel</button><button class="go" data-a="go">OK</button></div>`, el => {
      const input = el.querySelector('input'), go = async () => { const v = input.value.trim(); if (!v) return; this.close(); await done(v); };
      input.dataset.enter = ''; el.querySelector('[data-a=x]').onclick = () => this.close(); el.querySelector('[data-a=go]').onclick = go; input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
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
const agoText = ms => { const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : h < 24 ? h + (h === 1 ? ' hour ago' : ' hours ago') : d < 30 ? d + (d === 1 ? ' day ago' : ' days ago') : 'over a month ago'; };
const statusText = f => !f.online ? (f.ago != null ? 'last online ' + agoText(f.ago) : 'offline') : !f.status ? 'online' : f.status.where === 'game' ? 'in a match' : f.status.where === 'room' ? 'in room ' + f.status.room : f.status.where === 'party' ? 'in a party' : 'in the menus';
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
    this.add.text(CX - 60, 696, '◀ ▶  category        B  back' + (Account.loggedIn ? '' : '        log in from Friends and party to get on the board'), { ...STYLE.hint, fontSize: '19px', color: '#9fb2bf' }).setOrigin(0.5);
    const z = this.add.zone(CX, 118, 700, 50).setInteractive({ useHandCursor: true }); z.on('pointerdown', p => { this.tab = (this.tab + (p.x < CX ? 3 : 1)) % 4; this.draw(); });
    tapButton(this, 150, 118, 120, '◀', () => { this.tab = (this.tab + 3) % 4; this.draw(); }); tapButton(this, 1130, 118, 120, '▶', () => { this.tab = (this.tab + 1) % 4; this.draw(); });
    tapButton(this, 1170, 690, 160, 'Back', () => this.scene.start('Main'));
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
    { label: () => { const c = [...Voice.calls.values()], ok = c.filter(e => e.state === 'connected').length, bad = c.filter(e => e.state === 'failed').length; return !c.length ? 'Voice links: nobody to talk to right now' : `Voice links: ${ok} connected${bad ? `, ${bad} can't connect (their network needs a TURN relay: see DEPLOY.md)` : ''}`; } },
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

/* ---------------- party-led games ----------------
   In a party the leader picks every game. Starting a match, practice or a season game as leader opens a room set up the same way and
   brings the whole party in (each member can still add local players). Members' Play / Season / Practice / Online wait for the leader. */
function partyGame(scene, preset) {
  if (Party.role !== 'leader' || !Party.others().length) return false;
  Sound.play('select'); scene.scene.start('Room', { role: 'host', preset });
  return true;
}
const leaderPicks = () => Party.role === 'member' ? '   (your party leader picks)' : '';
function memberWaits() {
  if (Party.role !== 'member') return false;
  Toasts.show('Your party leader picks the game and will bring you in. Leave the party to play on your own.', [{ label: 'Leave party', fn: () => Party.leave() }, { label: 'OK' }], 6000);
  return true;
}
