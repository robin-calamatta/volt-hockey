/* Friends and party: a floating 👥 button in the top-left corner of every screen. It opens a window over the game with everything social:
   your account (log in / out, email), your party (members, voice status, invite, remove, party chat, leave), your room (chat, invite),
   invites and friend requests, unread messages, and every friend (online first) with Message / Party / Room / Join / remove / block.
   Open it with: 'Friends and party' in the main menu or the Start / pause menu (in a match too), or the ` key. (v14.2.4: no button of its own.)
   An offline match pauses while it is open. Mouse, keyboard and gamepad each work on their own (ui_overlay.js). */
const FriendsBar = {
  root: null, modal: null, open: false, confirm: '', tick: 0, pausedGame: false,
  build() {
    if (this.root) return;
    const css = document.createElement('style');
    css.textContent = `#fbtn{position:fixed;left:8px;top:6px;z-index:36;display:none;align-items:center;gap:6px;font:17px "Barlow Condensed",Arial,sans-serif;background:rgba(13,21,27,.9);color:#e8eef2;border:1px solid #2f4a5c;border-radius:20px;padding:4px 12px 4px 8px;cursor:pointer;box-shadow:0 3px 10px #0007}
      #fbtn .ic{font-size:20px}#fbtn b{color:#3dff9a;font-weight:700}#fbtn i{font-style:normal;background:#ff5a3c;color:#fff;border-radius:9px;padding:0 6px;font-size:14px}
      #fmodal{position:fixed;inset:0;z-index:45;display:none;align-items:center;justify-content:center;background:rgba(5,10,14,.62);font-family:"Barlow Condensed",Arial,sans-serif;color:#e8eef2}
      #fmodal.open{display:flex}#fmodal .box{width:min(580px,94vw);max-height:88vh;display:flex;flex-direction:column;background:#0f1a22;border:1px solid #2f4a5c;border-radius:14px;box-shadow:0 10px 40px #000b}
      #fmodal .hd{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid #22384a}#fmodal .hd h2{flex:1;margin:0;font-size:28px;color:#fff}
      #fmodal .bd{overflow-y:auto;padding:4px 16px 14px}#fmodal h4{margin:12px 0 4px;font-size:15px;letter-spacing:.08em;color:#9fb2bf;text-transform:uppercase}
      #fmodal .r{display:flex;align-items:center;gap:6px;padding:4px 0;flex-wrap:wrap;border-bottom:1px solid #15232e}#fmodal .r .n{flex:1;min-width:150px;font-size:19px}#fmodal .s{color:#9fb2bf;font-size:14px;display:block}
      #fmodal button.a{font:inherit;font-size:16px;background:#1b2a35;color:#fff;border:1px solid #3c5566;border-radius:7px;padding:3px 10px;cursor:pointer}
      #fmodal button.go{background:#19c3ff;color:#06222f;border-color:#19c3ff;font-weight:700}#fmodal button.warn{border-color:#ff7a59;color:#ffb39f}
      #fmodal .on{color:#3dff9a}#fmodal .off{color:#5f7280}#fmodal .ft{color:#9fb2bf;font-size:14px;text-align:center;padding:6px 0 10px}`;
    document.head.append(css);
    this.root = document.createElement('button'); this.root.id = 'fbtn'; document.body.append(this.root);
    this.modal = document.createElement('div'); this.modal.id = 'fmodal'; document.body.append(this.modal);
    PadNav.guard(this.root); this.root.onclick = () => this.toggle();
    this.modal.addEventListener('click', e => { if (e.target === this.modal) return this.toggle(false); const b = e.target.closest('[data-act]'); if (b) this.act(b.dataset.act, b.dataset.who || ''); });
    this.modal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.toggle(false); } });
    addEventListener('keydown', e => { if (e.code === 'Backquote' && !(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) { e.preventDefault(); this.toggle(); } });
    for (const src of [Social, Party, Account]) src.on(() => { this.renderButton(); if (this.open) this.render(); });
    const loop = () => { try { this.watch(); } catch (e) { console.error(e); } requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    this.renderButton();
  },
  watch() {
    const g = window.voltGame; if (!g) return;
    const show = !g.scene.isActive('Title') && Account.available() && !Forms.isOpen && !(Settings.touch && TouchPad.inGame);   // touch, mid-match: the button would cover the touch controls (it is in the pause menu)
    if (this.pausedGame && !this.open && !Forms.isOpen) { this.pausedGame = false; if (g.scene.isPaused('Game') && !g.scene.isActive('Pause')) g.scene.resume('Game'); }   // login form closed without logging in
    this.root.style.display = 'none';                          // (v14.2.4: no button of its own: it's in the Start / pause menu and the main menu)
    if (++this.tick % 60 === 0) { this.renderButton(); if (this.open && Party.active && !this.modal.contains(document.activeElement)) this.render(); }
    if (!show || (typeof OSK !== 'undefined' && OSK.input)) return;
    Controls.update(g.loop.frame);                             // keep presses fresh even while the match is paused (once per frame; repeats are ignored)
    const t = performance.now();
  },
  pauseGame() {                                                // an offline match waits while the window (or the login form) is up
    const g = window.voltGame;
    if (g && g.scene.isActive('Game') && !g.scene.getScene('Game').online && !g.scene.isPaused('Game')) { g.scene.pause('Game'); this.pausedGame = true; }
  },
  toggle(on = !this.open) {
    if (on && !Account.loggedIn) { this.pauseGame(); Forms.account(() => this.toggle(true)); return; }
    if (on === this.open) return; this.open = on; this.confirm = '';
    const g = window.voltGame;
    if (on) {
      this.modal.classList.add('open'); this.render(); PadNav.open(this.modal, { modal: true, onBack: () => this.toggle(false) }); Social.tick();
      this.pauseGame();
    } else {
      this.modal.classList.remove('open'); PadNav.close(this.modal);
      if (this.pausedGame && g) { this.pausedGame = false; if (g.scene.isPaused('Game') && !g.scene.isActive('Pause')) g.scene.resume('Game'); }
    }
    Sound.play(on ? 'select' : 'back'); this.renderButton();
  },
  menuLabel() { if (typeof Account === 'undefined' || !Account.loggedIn) return 'Log in / sign up'; let n = 0; try { n = Social.unreadTotal() + Social.data.invites.length + Social.data.incoming.length; } catch (e) {} return `Friends and party${n ? ` (${n} new)` : ''}`; },
  renderButton() {
    if (!this.root) return;
    if (!Account.loggedIn) { this.root.innerHTML = '<span class="ic">👤</span> Log in'; this.root.title = 'Log in or sign up'; return; }
    const on = Social.data.friends.filter(f => f.online).length, unread = Social.unreadTotal(), inv = Social.data.invites.length + Social.data.incoming.length;
    this.root.innerHTML = `<span class="ic">👥</span><b>${on}</b>${Party.active ? ` · 🎉${Party.members.length}` : ''}${unread + inv ? ` <i>${unread + inv}</i>` : ''}`;
    this.root.title = 'Friends and party (in the menu, or ` on the keyboard)';
  },
  btn(act, label, who = '', cls = '') { return `<button class="a ${cls}" data-act="${act}" data-who="${esc(who)}" data-key="${act}:${esc(who)}">${label}</button>`; },
  render() {
    if (!this.modal) return; const keep = PadNav.current && this.modal.contains(PadNav.current) ? PadNav.current.dataset.key : null, old = this.modal.querySelector('.bd'), scroll = old ? old.scrollTop : 0;
    const S = Social.data, B = (...a) => this.btn(...a), parts = [];
    if (Account.loggedIn) {
      parts.push(`<div class="r"><span class="n">${esc(Account.name)}<span class="s">${Account.user.email ? 'Email ' + esc(Account.user.email) : 'No email yet: add one so you can reset your password'}${Account.adult ? '' : ' · under 18: chat with friends only'}</span></span>${B('email', Account.user.email ? 'Change email' : 'Add email', '', Account.user.email ? '' : 'go')}${B('logout', 'Log out')}</div>`);
      parts.push(`<div class="r">${B('add', '＋ Add a friend', '', 'go')}${B('board', '🏆 Leaderboard')}</div>`);
      parts.push('<h4>Party</h4>');
      if (!Party.active) parts.push(`<div class="r"><span class="n">Not in a party<span class="s">Friends in your party follow you into every game you start, and talk on voice the whole time.</span></span>${B('pstart', 'Start a party', '', 'go')}</div>`);
      else {
        const vs = { connected: '🔊 voice on', connecting: '… voice connecting', failed: "⚠ voice can't connect", blocked: '🔇 no voice (age rule or muted)', off: '🔇 voice off' };
        for (const m of Party.members) parts.push(`<div class="r"><span class="n">${m.leader ? '★ ' : ''}${esc(m.name)}${m.key === Party.myKey ? ' (you)' : ''}<span class="s">${m.leader ? 'leader' : 'member'}${m.key === Party.myKey ? '' : ' · ' + vs[Voice.statusOf(m.acct, m.vid)]}</span></span>${Party.role === 'leader' && !m.leader ? B('lead', 'Make leader', m.key) + B('kick', 'Remove', m.key, 'warn') : ''}</div>`);
        parts.push(`<div class="r">${Party.role === 'leader' ? B('pinvite', '＋ Invite friends') : ''}${B('pchat', '💬 Party chat')}${B('pleave', Party.role === 'leader' ? 'End party' : 'Leave party', '', 'warn')}</div>`);
        parts.push(`<div class="r"><span class="s">${Party.role === 'leader' ? 'You pick the games: start Play, Practice, a Season game or an Online room and your party comes with you.' : 'Your leader picks the games and brings you in.'}</span></div>`);
      }
      if (Online.current && Online.current.code) parts.push(`<h4>Room ${esc(Online.current.code)}</h4><div class="r">${B('rchat', '💬 Room chat')}${B('rinvite', '＋ Invite friends')}</div>`);
      if (S.invites.length || S.incoming.length) {
        parts.push('<h4>Invites and requests</h4>');
        for (const i of S.invites) parts.push(`<div class="r"><span class="n">${esc(i.from)}<span class="s">invited you to ${i.kind === 'party' ? 'their party' : 'room ' + esc(i.code)}</span></span>${B('ijoin', 'Join', i.id, 'go')}${B('ino', 'No thanks', i.id)}</div>`);
        for (const n of S.incoming) parts.push(`<div class="r"><span class="n">${esc(n)}<span class="s">wants to be friends</span></span>${B('accept', 'Accept', n, 'go')}${B('decline', 'Decline', n)}</div>`);
      }
      const chats = S.friends.filter(f => S.unread[f.name.toLowerCase()]);
      if (chats.length) { parts.push('<h4>Unread messages</h4>'); for (const f of chats) parts.push(`<div class="r"><span class="n">✉ ${esc(f.name)} (${S.unread[f.name.toLowerCase()]})</span>${B('msg', 'Read', f.name, 'go')}</div>`); }
      parts.push(`<h4>Friends · ${S.friends.filter(f => f.online).length} online</h4>`);
      if (!S.friends.length) parts.push('<div class="r"><span class="s">No friends yet. Use "Add a friend" and search by username.</span></div>');
      for (const f of S.friends) {
        const st = f.status || {}, joinRoom = f.online && st.open && st.room, joinParty = f.online && st.party && !Party.active;
        parts.push(`<div class="r"><span class="n"><span class="${f.online ? 'on' : 'off'}">●</span> ${esc(f.name)}<span class="s">${esc(statusText(f))}</span></span>
          ${B('msg', '💬 Message', f.name)}${(Party.role === 'leader' || !Party.active) && f.online ? B('pinv1', '＋ Party', f.name) : ''}${Online.current && Online.current.code && f.online ? B('rinv1', '＋ Room', f.name) : ''}
          ${joinRoom ? B('jroom', 'Join room', st.room, 'go') : ''}${joinParty ? B('jparty', 'Join party', st.party, 'go') : ''}
          ${this.confirm === f.name ? B('remove', 'Remove friend', f.name, 'warn') + B('block', 'Block', f.name, 'warn') : B('more', '⋯', f.name)}</div>`);
      }
      for (const n of S.outgoing) parts.push(`<div class="r"><span class="n off">${esc(n)}<span class="s">friend request sent</span></span>${B('decline', 'Cancel', n)}</div>`);
    }
    this.modal.innerHTML = `<div class="box"><div class="hd"><h2>Friends and party</h2>${this.btn('close', '✕ Close')}</div><div class="bd">${parts.join('')}</div><div class="ft">Gamepad: D-pad moves, A selects, B or Select closes · Keyboard: Tab, Enter, Esc or \`</div></div>`;
    this.modal.querySelector('.bd').scrollTop = scroll;
    const again = keep && this.modal.querySelector(`[data-key="${CSS.escape(keep)}"]`); if (again) PadNav.focus(again); else if (this.open && PadNav.padRecently()) PadNav.focus(PadNav.focusables(this.modal)[0]);
  },
  async act(a, who) {
    const close = () => this.toggle(false);
    const go = { close, email: () => { close(); Forms.email(); }, add: () => { close(); Forms.findFriend(); }, logout: async () => { await Account.logout(); Party.reset(); close(); },
      board: () => { close(); const g = voltGame; if (g.scene.isActive('Game') || g.scene.isPaused('Game')) return Toasts.show('Open the leaderboard from the main menu after your match.', [], 4000); g.scene.getScenes(true).forEach(s => g.scene.stop(s.sys.settings.key)); g.scene.start('Leaderboard'); },
      pstart: async () => { try { await Party.create(); close(); Forms.invite('party', Party.id); } catch (e) { /* shown */ } }, pinvite: () => { close(); Forms.invite('party', Party.id); },
      pchat: () => { close(); Chat.openChat('party'); }, pleave: () => Party.leave(), kick: () => Party.kick(who), lead: () => Party.handOver(who),
      rchat: () => { close(); Chat.openChat('room'); }, rinvite: () => { close(); Forms.invite('room', Online.current.code); },
      ijoin: () => { const i = Social.data.invites.find(x => x.id === who); if (i) { close(); Social.acceptInvite(i); } }, ino: () => Social.dismiss(who),
      accept: () => Social.accept(who), decline: () => Social.remove(who), msg: () => { close(); Chat.openDm(who); },
      pinv1: async () => { if (!Party.active) { try { await Party.create(); } catch (e) { return; } } Social.invite(who, 'party', Party.id); },
      rinv1: () => Social.invite(who, 'room', Online.current.code), jroom: () => { close(); joinRoomFromAnywhere(who); }, jparty: () => { close(); Party.join(who); },
      more: () => { this.confirm = who; this.render(); }, remove: () => { this.confirm = ''; Social.remove(who); }, block: () => { this.confirm = ''; Social.block(who); } }[a];
    if (go) { Sound.play('select'); await go(); }
  }
};
