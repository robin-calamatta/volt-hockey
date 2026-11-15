/* v14.3.12 make friends with the people in your party. Three ways (all need you both to have an account):
   - When someone who isn't your friend joins your party, a message pops up with ＋ ADD FRIEND.
   - In the 👥 friends panel, each party member who isn't your friend has ＋ Friend (or Accept, if they asked you first).
   - In the lobby, a ＋ ADD FRIEND tag sits under each party member's cart who isn't your friend: tap or click it.
   Once the request is sent the tag says REQUEST SENT; once they accept, it's gone. */
const PartyFriends = {
  asked: new Set(),
  can(m) { return !!(m && m.acct && Account.loggedIn && m.key !== Party.myKey && m.acct.toLowerCase() !== String(Account.name || '').toLowerCase() && !Social.isFriend(m.acct) && !Social.isBlocked(m.acct)); },
  state(m) { const n = m.acct.toLowerCase(), D = Social.data; if ((D.incoming || []).some(x => String(x.name || x).toLowerCase() === n)) return 'in'; if (this.asked.has(n) || (D.outgoing || []).some(x => String(x.name || x).toLowerCase() === n)) return 'out'; return 'none'; },
  button(m, B) { if (!this.can(m)) return ''; const s = this.state(m); return s === 'in' ? B('facc', '✓ Accept friend', m.acct) : s === 'out' ? '<span class="s" style="margin:0 6px">friend request sent</span>' : B('freq', '＋ Friend', m.acct); },
  async add(name) { if (!name) return; if (!Account.loggedIn) { Toasts.show('Log in to add friends.', [{ label: 'Log in / sign up', go: true, fn: () => FriendsBar.toggle(true) }], 4000); return; }
    this.asked.add(name.toLowerCase()); try { if (this.state({ acct: name }) === 'in') await Social.accept(name); else await Social.request(name); } catch (e) { /* shown */ } Sound.play('select'); },
  /* someone new in the party: offer once */
  seen: new Set(),
  watch() { if (!Party.active || !Account.loggedIn) return; for (const m of Party.members) { if (!this.can(m) || this.seen.has(m.acct.toLowerCase())) continue; this.seen.add(m.acct.toLowerCase()); if (this.state(m) !== 'none') continue;
      Toasts.show(`<b>${esc(m.name)}</b> is in your party. Add them as a friend?`, [{ label: '＋ ADD FRIEND', go: true, fn: () => this.add(m.acct) }], 8000); } }
};
setInterval(() => { try { PartyFriends.watch(); } catch (e) { /* later */ } }, 2000);
/* the lobby: a tag under each party member's cart */
{ const P = LobbyHomeScene.prototype, up = P.update;
  P.update = function (...a) {
    const r = up.apply(this, a);
    try {
      this.pfTags = (this.pfTags || []).filter(t => t && t.active && t.scene === this); let j = 0;
      const playTab = LOBBY_TABS[this.tab] === 'PLAY' && !this.overlay;
      if (playTab && Party.active && this.stage && this.stage.mates && this.stage.screenOf) for (const [key, M] of this.stage.mates) { if (key.startsWith('local-')) continue; const mb = Party.members.find(x => x.key === key); if (!this.pfOk(mb)) continue; const q = this.stage.screenOf(M.cart, 1.45); if (!q) continue;
        const sent = PartyFriends.state(mb) === 'out', t = this.pfTags[j] || (this.pfTags[j] = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', padding: { x: 7, y: 3 } }).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true }).on('pointerdown', function () { if (this.acct && !this.sent) { PartyFriends.add(this.acct); } }));
        j++; t.acct = mb.acct; t.sent = sent; t.setVisible(true).setPosition(q.x, q.y + 46).setText(sent ? '✉ REQUEST SENT' : PartyFriends.state(mb) === 'in' ? '✓ ACCEPT FRIEND' : '＋ ADD FRIEND').setColor(sent ? '#c9d6df' : '#06121a').setBackgroundColor(sent ? '#2d5068cc' : '#19c3ff'); }
      for (; j < this.pfTags.length; j++) this.pfTags[j].setVisible(false);
    } catch (e) { /* the lobby must not break */ }
    return r;
  };
  P.pfOk = function (mb) { return PartyFriends.can(mb); };
}
