/* Text chat: in an online room (lobby and match), in your party, and private messages with a friend. An HTML overlay on top of the game.
   Open it with Tab (or the 💬 button), type, Enter sends, Esc closes. Quick chat: keys 1-9, D-pad up on a gamepad (keep pressing to step
   through the phrases, A sends, B closes), or the phrase buttons.
   Who sees what:
   - Guests (not logged in) can send and see quick-chat phrases only.
   - Logged-in players can type. Under-18 players only send typed messages to friends, and only see typed messages from friends.
   - Every typed message is filtered for swearing (ChatFilter) and anyone can be muted, blocked or reported by clicking their name. */
const QUICK = ['Nice shot!', 'Pass!', 'Shoot!', 'Defend!', 'Good game!', 'Thanks!', 'Sorry!', 'Wow!', 'One more game?'];

const Chat = {
  log: [], root: null, open: false, dmWith: '', dmAfter: 0, dmTimer: null, quickOpen: false, quickIdx: 0, quickSrc: null, quickAt: 0, shown: 0,
  channel() { if (this.dmWith) return 'dm'; if (this.want === 'party' && Party.active) return 'party'; if (Online.current) return 'room'; if (Party.active) return 'party'; return ''; },   // want: 'party' to talk to your party while in a room
  canType() { return Account.loggedIn; },
  build() {
    if (this.root) return;
    const css = document.createElement('style');
    css.textContent = `#chat{position:fixed;left:12px;bottom:104px;width:min(430px,62vw);z-index:30;font-family:"Barlow Condensed",Arial,sans-serif;font-size:19px;color:#e8eef2;display:none;pointer-events:none}
      #chat .head{display:none;align-items:center;gap:8px;background:rgba(13,21,27,.92);border:1px solid #2f4a5c;border-bottom:0;border-radius:10px 10px 0 0;padding:6px 10px;pointer-events:auto}
      #chat .head b{flex:1;color:#ffe27a;letter-spacing:.04em}#chat .head button,#chat .bar button,#chatq button,#chatbtns button,#chatmenu button{font:inherit;font-size:16px;background:#1b2a35;color:#fff;border:1px solid #3c5566;border-radius:7px;padding:3px 10px;cursor:pointer}
      #chat .log{max-height:34vh;overflow-y:auto;padding:6px 10px;display:flex;flex-direction:column;gap:3px;text-shadow:0 1px 3px #000,0 0 6px #000}
      #chat.open .log{background:rgba(13,21,27,.88);border:1px solid #2f4a5c;border-top:0;pointer-events:auto}#chat.open .head{display:flex}
      #chat .m{opacity:1;transition:opacity .6s}#chat .m.old{opacity:0}#chat.open .m.old{opacity:1}
      #chat .m .n{font-weight:700;cursor:pointer}#chat .m .q{color:#9fd8ff;font-style:italic}#chat .m.sys{color:#9fb2bf;font-style:italic}
      #chat .bar{display:none;gap:6px;background:rgba(13,21,27,.94);border:1px solid #2f4a5c;border-top:0;border-radius:0 0 10px 10px;padding:6px;pointer-events:auto}
      #chat.open .bar{display:flex}#chat .bar input{flex:1;min-width:0;font:inherit;font-size:18px;background:#0a1116;color:#fff;border:1px solid #3c5566;border-radius:7px;padding:4px 8px}
      #chatq{position:fixed;z-index:31;display:none;flex-direction:column;gap:4px;background:rgba(13,21,27,.95);border:1px solid #2f4a5c;border-radius:10px;padding:8px;font-family:"Barlow Condensed",Arial,sans-serif}
      #chatq button.on{background:#19c3ff;color:#06222f;border-color:#19c3ff;font-weight:700}#chatq .hint{color:#9fb2bf;font-size:15px;text-align:center}
      #chatbtns{position:fixed;left:12px;top:calc(14vh + 6px);z-index:30;display:none;gap:8px;pointer-events:none}
      #chat.right{left:auto;right:12px}#chatbtns.right{left:auto;right:12px}#voicelist.right{left:auto;right:12px;top:calc(14vh + 60px);align-items:flex-end}#chatbtns button{pointer-events:auto;font-size:22px;padding:4px 12px;opacity:.85}
      #chatbtns button.live{background:#19c3ff;color:#06222f}#chatbtns .dot{display:inline-block;min-width:18px;font-size:14px;background:#ff5a3c;border-radius:9px;margin-left:4px}
      #voicelist{position:fixed;left:12px;top:calc(14vh + 60px);z-index:30;display:none;flex-direction:column;gap:4px;font-family:"Barlow Condensed",Arial,sans-serif;font-size:17px;pointer-events:none}
      #voicelist div{background:rgba(13,21,27,.8);border-radius:14px;padding:2px 10px 2px 8px;color:#cfe3ef;border:2px solid transparent}#voicelist div.talk{border-color:#3dff9a;color:#fff}#voicelist div.mute{opacity:.6}
      #chatmenu{position:fixed;z-index:41;display:none;flex-direction:column;gap:4px;background:rgba(13,21,27,.97);border:1px solid #2f4a5c;border-radius:10px;padding:8px;font-family:"Barlow Condensed",Arial,sans-serif;color:#ffe27a}`;
    document.head.append(css);
    const el = (tag, id, html) => { const e = document.createElement(tag); if (id) e.id = id; if (html) e.innerHTML = html; document.body.append(e); return e; };
    this.root = el('div', 'chat', `<div class="head"><b></b><button data-a="switch" style="display:none"></button><button data-a="quick">Quick chat</button><button data-a="close">✕</button></div><div class="log"></div><div class="bar"><input maxlength="200" placeholder="Type a message..." autocomplete="off"><button data-a="send">Send</button></div>`);
    this.logEl = this.root.querySelector('.log'); this.input = this.root.querySelector('input'); this.headEl = this.root.querySelector('.head b');
    this.root.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; if (a === 'switch') { this.want = this.channel() === 'party' ? 'room' : 'party'; this.render(); } else if (a === 'close') this.close(); else if (a === 'send') this.sendTyped(); else if (a === 'quick') this.showQuick(null); });
    this.input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); this.sendTyped(); } else if (e.key === 'Escape') { e.preventDefault(); this.close(); } });
    this.quickEl = el('div', 'chatq'); this.menuEl = el('div', 'chatmenu'); this.voiceEl = el('div', 'voicelist');
    this.btns = el('div', 'chatbtns', `<button data-a="chat">💬<span class="dot" style="display:none"></span></button><button data-a="quick" title="Quick chat (keys 1-9)">⚡</button><button data-a="mic">🎙</button>`);
    this.btns.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'chat') (this.open ? this.close() : this.openChat()); else if (b.dataset.a === 'quick') (this.quickOpen ? this.hideQuick() : this.showQuick(null)); });
    const mic = this.btns.querySelector('[data-a=mic]');                         // touch: hold to talk (push to talk), tap to switch mic on / off in open-mic mode
    mic.addEventListener('pointerdown', e => { e.preventDefault(); Voice.touchTalk = true; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) mic.addEventListener(ev, () => { Voice.touchTalk = false; });
    mic.addEventListener('click', () => { if (Voice.mode() === 'open') { Settings.voiceMode = 'mute'; } else if (Voice.mode() === 'mute') { Settings.voiceMode = 'open'; } Settings.save(); Voice.refresh(); this.say(Voice.mode() === 'mute' ? 'Your mic is off.' : Voice.mode() === 'open' ? 'Your mic is on.' : 'Hold the mic button to talk.'); });
    addEventListener('keydown', e => this.key(e), true);
    addEventListener('pointerdown', e => { if (!this.menuEl.contains(e.target)) this.menuEl.style.display = 'none'; });
    const loop = () => { try { this.frame(); } catch (e) { console.error(e); } requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  },
  key(e) {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (!this.channel() || Controls.isModal()) return;                           // the friends window or a form is in front
    if (e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); this.open ? this.close() : this.openChat(); return; }
    const n = /^Digit([1-9])$/.exec(e.code); if (n && !this.open && this.channel() !== 'dm') { e.preventDefault(); this.sendQuick(+n[1]); }
  },
  openChat(want) {
    this.build(); if (want) this.want = want; if (!this.channel()) return; this.open = true; this.root.classList.add('open'); this.render();
    PadNav.open(this.root, { onBack: () => this.close() });                     // a gamepad can use it too (A on the box opens the on-screen keyboard)
    Controls.keys = {};                                                          // nothing stays held while you type
    this.input.disabled = !this.canType(); this.input.placeholder = this.canType() ? 'Type a message...' : 'Log in to type. Guests can use quick chat.';
    this.input.dataset.enter = '';                                              // the on-screen keyboard's Done sends
    if (this.canType() && !PadNav.padRecently()) setTimeout(() => this.input.focus(), 0);
  },
  close() { this.open = false; this.want = ''; if (this.root) { this.root.classList.remove('open'); this.input.blur(); PadNav.close(this.root); } this.quickOpen = false; if (this.quickEl) this.quickEl.style.display = 'none'; if (this.dmWith) this.closeDm(); else this.render(); },
  refresh() { this.build(); if (!this.channel() && this.open) this.close(); this.render(); },

  /* ---- who sees what ---- */
  canSee(m) {
    if (m.acct && Social.isMuted(m.acct)) return false;
    if (m.q) return true;
    if (!Account.loggedIn || !m.acct) return false;                              // guests only ever see quick chat
    return Account.adult || Social.isFriend(m.acct) || m.channel === 'dm';
  },
  targets(channel) {                                                             // under 18: typed messages go to friends only
    if (Account.adult) return null;
    if (channel === 'room') return Online.roster().filter(r => r.acct && Social.isFriend(r.acct)).map(r => r.id);
    if (channel === 'party') return Party.others().filter(m => m.acct && Social.isFriend(m.acct)).map(m => m.key);
    return null;
  },
  receive(m) {
    const msg = { channel: m.channel, from: cleanText(m.from, 24) || '?', acct: cleanText(m.acct, 24), q: m.q | 0, text: m.q ? QUICK[(m.q | 0) - 1] || '' : ChatFilter.clean(cleanText(m.text, 300)), at: Date.now() };
    if (!msg.text || !this.canSee(msg)) return;
    this.push(msg); if (msg.channel !== 'dm') Sound.play('blip');
  },
  push(msg) { this.log.push(msg); if (this.log.length > 120) this.log.shift(); this.render(); },
  say(text) { this.push({ channel: this.channel() || 'sys', sys: true, text, at: Date.now() }); },

  /* ---- sending ---- */
  sendTyped() {
    const text = ChatFilter.clean(this.input.value).trim(); if (!text || !this.canType()) return; this.input.value = '';
    const ch = this.channel(), to = this.targets(ch);
    if (ch === 'dm') return this.sendDm(text);
    if (to && !to.length) { this.say('Only your friends can see what you type. None of them are here, so use quick chat.'); return; }
    if (ch === 'room') Online.current.sendChat(text, 0, to); else if (ch === 'party') Party.sendChat(text, 0, to);
    this.push({ channel: ch, from: Settings.myName() || 'You', acct: Account.name, text, me: true, at: Date.now() });
  },
  sendQuick(i) {
    const ch = this.channel(); if (!ch || ch === 'dm' || !QUICK[i - 1]) return;
    if (ch === 'room') Online.current.sendChat('', i, null); else Party.sendChat('', i, null);
    this.push({ channel: ch, from: Settings.myName() || 'You', acct: Account.name, q: i, text: QUICK[i - 1], me: true, at: Date.now() }); Sound.play('select');
  },
  showQuick(src) {                                                               // the phrase list (mouse / touch, or a gamepad stepping through it)
    this.build(); this.quickOpen = true; this.quickSrc = src; this.quickAt = performance.now();
    this.quickEl.innerHTML = QUICK.map((q, i) => `<button data-i="${i + 1}" class="${src && this.quickIdx === i ? 'on' : ''}">${i + 1}. ${esc(q)}</button>`).join('') + `<div class="hint">${src ? 'D-pad up: next   A: send   B: close' : 'Keys 1-9 send these any time'}</div>`;
    this.quickEl.querySelectorAll('button').forEach(b => b.onclick = () => { this.sendQuick(+b.dataset.i); this.hideQuick(); });
    const r = this.root.getBoundingClientRect(); Object.assign(this.quickEl.style, { display: 'flex', left: (r.left || 12) + 'px', bottom: (innerHeight - (this.open ? r.top : r.bottom) + 6) + 'px' });
  },
  hideQuick() { this.quickOpen = false; this.quickSrc = null; this.quickEl.style.display = 'none'; },

  /* ---- private messages with a friend (stored on the server) ---- */
  openDm(name) {
    this.build(); this.dmWith = name; this.dmAfter = 0; this.log = this.log.filter(m => m.channel !== 'dm'); this.openChat(); this.pollDm();
  },
  closeDm() { this.dmWith = ''; clearTimeout(this.dmTimer); this.log = this.log.filter(m => m.channel !== 'dm'); this.render(); },
  async pollDm() {
    clearTimeout(this.dmTimer); if (!this.dmWith) return; const who = this.dmWith;
    try { const r = await Account.req('GET', '/dm', null, { with: who, after: this.dmAfter }); if (this.dmWith !== who) return; for (const m of r.msgs) { this.dmAfter = Math.max(this.dmAfter, m.at); this.push({ channel: 'dm', from: m.from, acct: m.from, text: m.text, me: m.from === Account.name, at: m.at }); } }
    catch (e) { this.say(e.message); }
    this.dmTimer = setTimeout(() => this.pollDm(), document.hidden ? 20000 : 6000);   // each check is a server call: not too often
  },
  async sendDm(text) { try { const r = await Account.req('POST', '/dm', { to: this.dmWith, text }); this.dmAfter = Math.max(this.dmAfter, r.msg.at); this.push({ channel: 'dm', from: r.msg.from, acct: r.msg.from, text: r.msg.text, me: true, at: r.msg.at }); } catch (e) { this.say(e.message); } },

  /* ---- clicking a name: mute, add friend, block, report ---- */
  nameMenu(m, x, y) {
    const name = m.acct || m.from, items = [];
    items.push([Social.isMuted(name) ? 'Unmute' : 'Mute', () => Social.toggleMute(name)]);
    if (Account.loggedIn && m.acct && m.acct !== Account.name) {
      if (!Social.isFriend(m.acct)) items.push(['Add friend', () => Social.request(m.acct)]);
      items.push(['Block', () => Social.block(m.acct)], ['Report', () => Social.report(m.acct, this.channel(), m.text)]);
    }
    this.menuEl.innerHTML = `<div>${esc(m.from)}</div>`; for (const [label, fn] of items) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { this.menuEl.style.display = 'none'; fn(); this.render(); }; this.menuEl.append(b); }
    Object.assign(this.menuEl.style, { display: 'flex', left: x + 'px', top: Math.max(8, y - 40) + 'px' });
  },

  /* ---- drawing ---- */
  render() {
    if (!this.root) return; const ch = this.channel(), now = Date.now();
    const show = !!ch && !(window.voltGame && voltGame.scene.isActive('Title'));
    this.root.style.display = show ? 'block' : 'none'; this.btns.style.display = show ? 'flex' : 'none';
    const right = !!(window.voltGame && voltGame.scene.isActive('Room'));          // in a room lobby the menu is on the left: chat goes right
    for (const e of [this.root, this.btns, this.voiceEl]) e.classList.toggle('right', right);
    if (!show) return;
    this.headEl.textContent = ch === 'dm' ? 'Messages with ' + this.dmWith : ch === 'room' ? 'Room ' + (Online.current.code || '') + ' chat' : 'Party chat';
    const sw = this.root.querySelector('[data-a=switch]'); if (sw) { sw.style.display = this.open && Online.current && Party.active && ch !== 'dm' ? '' : 'none'; sw.textContent = ch === 'party' ? 'Room chat' : 'Party chat'; }
    const list = this.log.filter(m => m.channel === ch || (m.sys && m.channel === 'sys')).slice(this.open ? -80 : -6);
    this.logEl.innerHTML = '';
    for (const m of list) {
      const d = document.createElement('div'); d.className = 'm' + (m.sys ? ' sys' : '') + (!this.open && now - m.at > 12000 ? ' old' : '');
      if (m.sys) d.textContent = m.text;
      else { const n = document.createElement('span'); n.className = 'n'; n.textContent = m.from + ': '; n.style.color = m.me ? '#ffe27a' : '#7fd3ff'; if (!m.me) n.onclick = e => this.nameMenu(m, e.clientX, e.clientY); const t = document.createElement('span'); t.textContent = m.text; if (m.q) t.className = 'q'; d.append(n, t); }
      this.logEl.append(d);
    }
    this.logEl.scrollTop = this.logEl.scrollHeight;
    const dot = this.btns.querySelector('.dot'), unread = Social.unreadTotal(); dot.style.display = unread ? 'inline-block' : 'none'; dot.textContent = unread || '';
  },
  frame() {
    if (!this.root) { if (Online.current || Party.active) this.build(); else return; }
    Voice.frame();
    // gamepad quick chat during a match: D-pad up opens / steps, A sends, B closes
    const g = window.voltGame, playing = g && g.scene.isActive('Game') && !g.scene.isActive('Pause') && this.channel() && this.channel() !== 'dm';
    if (playing) for (const src of Controls.list()) {
      if (!src.id.startsWith('pad')) continue;
      if (src.quickTap) { src.quickTap = false;   /* a quick tap of D-pad up: holding it opens the emoji wheel instead (emotes.js) */ if (this.quickOpen && this.quickSrc === src) this.quickIdx = (this.quickIdx + 1) % QUICK.length; else this.quickIdx = 0; this.showQuick(src); }
      else if (this.quickOpen && this.quickSrc === src) { if (src.pressed.a) { this.sendQuick(this.quickIdx + 1); this.hideQuick(); } else if (src.pressed.b) this.hideQuick(); }
    }
    if (this.quickOpen && this.quickSrc && performance.now() - this.quickAt > 5000) this.hideQuick();
    if (!this.open && ++this.shown % 30 === 0) this.render();                    // let old lines fade
    // voice: who is on, who is talking
    const sp = Voice.speakers(); this.voiceEl.style.display = sp.length ? 'flex' : 'none';
    if (sp.length) this.voiceEl.innerHTML = sp.map(s => `<div class="${s.level > 0.08 ? 'talk' : ''} ${s.muted ? 'mute' : ''}">${s.me ? (s.muted ? '🔇' : '🎙') : '🔊'} ${esc(s.name)}</div>`).join('');
    const mic = this.btns && this.btns.querySelector('[data-a=mic]'); if (mic) { mic.style.display = Account.loggedIn && Voice.mode() !== 'off' ? '' : 'none'; mic.classList.toggle('live', Voice.talking() && Voice.calls.size > 0); mic.textContent = Voice.mode() === 'mute' ? '🔇' : '🎙'; }
  }
};
