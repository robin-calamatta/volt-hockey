/* v14.1.7: the legal side.
   - LEGAL_DOCS: the End User Licence Agreement (with the terms of use), the privacy notice, the health and safety warning (photosensitive
     seizures), the content notice (violence, online play), and the copyright / trademark notice.
   - A first-run gate: nobody plays until they tick that they've read and agree to the EULA and privacy notice and have read the
     health and content warnings. When LEGAL.version changes (the text changes in a way that matters) everyone is asked again.
   - Sign-up needs its own tick: the agreement plus "the age I entered is my real age". The server refuses a sign-up without it and
     records the version and the time on the account.
   - Settings > Legal and agreements: read any of them again at any time. The title screen carries a short warning line.
   Set LEGAL.owner / LEGAL.contact before going public. A lawyer licensed where you operate should review this text: it's a sound starting
   point, not legal advice. */
const LEGAL = {
  version: '2026-11-09',
  owner: 'the developer of Volt Hockey',          // who "we" are: a person's or company's legal name
  contact: '',                                     // an email address for legal, privacy and copyright notices (empty: "through the game's website")
  law: 'the Province of Ontario and the federal laws of Canada that apply there',
  courts: 'Ontario, Canada',
  key: 'volt.legal',
  accepted() { try { const s = JSON.parse(localStorage.getItem(this.key) || 'null'); return !!(s && s.v === this.version); } catch (e) { return !!this.sessionOk; } },
  accept() { this.sessionOk = true; try { localStorage.setItem(this.key, JSON.stringify({ v: this.version, at: new Date().toISOString() })); } catch (e) { /* storage blocked: asked again next visit */ } },
  reach() { return this.contact ? `by email at ${this.contact}` : 'through the contact details on the website where the Game is published'; }
};

const LEGAL_DOCS = {
  eula: { title: 'End User Licence Agreement and Terms of Use', body: () => `
<p class="lg-date">Version ${LEGAL.version}</p>
<p><b>Please read this agreement carefully.</b> It is a legal agreement between you and ${LEGAL.owner} ("we", "us", "our") about the Volt Hockey game, including Volt Royale, the minigames, the online features, the website and every update ("the Game"). By ticking "I agree", creating an account, or playing the Game, you accept this agreement. If you do not agree, do not play the Game or create an account.</p>
<p>If you are under the age of majority where you live (18 in most places, 19 in some Canadian provinces), a parent or legal guardian must read this agreement and agree to it for you, and is responsible for your use of the Game.</p>

<h3>1. Licence</h3>
<p>We give you a personal, limited, non-exclusive, non-transferable, revocable licence to play the Game for your own non-commercial entertainment, under this agreement. The Game is licensed, not sold. We and our licensors keep all rights not expressly given to you.</p>
<p>You must not: copy, sell, rent, sublicense or distribute the Game or any part of it; reverse engineer, decompile or modify it, except as the law allows despite this restriction; use cheats, bots, exploits, automation or unauthorised software; interfere with servers, networks or other players; harvest data about other players; get around bans, age limits or safety features; or use the Game for anything unlawful.</p>

<h3>2. Accounts and the age you give</h3>
<p>An account is optional. If you create one, the information you give must be true, accurate and yours. <b>The age you enter must be your real age.</b> It decides which features you can use, such as who can chat with you and whether you can play Volt Royale (16 or over).</p>
<p><b>Entering an age that is not your own is a misrepresentation and a breach of this agreement.</b> If you, or anyone using your account, give a false age, you do so at your own risk and you are solely responsible for the consequences. We rely on the age given and are not liable for any loss, harm or exposure to content or contact that follows from a false age. We may suspend or delete accounts that give false information.</p>
<p>You are responsible for keeping your password safe and for everything done with your account. Tell us at once if you think someone else has used it.</p>

<h3>3. Conduct and online play</h3>
<p>Be respectful. Do not harass, bully, threaten, or abuse anyone; do not post hateful, sexual, violent, illegal or personal information; do not impersonate anyone; do not spam or advertise; and do not ask other players, especially minors, for personal information or to meet or talk outside the Game.</p>
<p>Text chat, voice chat, usernames and other things players create ("User Content") come from other players, not from us. <b>We do not pre-screen User Content and are not responsible for it.</b> We use filters and moderation, but they cannot catch everything. You use online features at your own risk. Use the report, block and mute tools, and tell a trusted adult if something worries you.</p>
<p>You keep any rights you have in your User Content, but you give us a worldwide, royalty-free licence to host, store, show, transmit and moderate it as needed to run the Game. You must have the rights to anything you share. We may remove User Content, and may warn, mute, suspend or ban any account, at our discretion, for breaking this agreement or to keep players safe.</p>

<h3>4. Health and safety</h3>
<p>The Game contains flashing lights, fast motion, and patterns that may trigger seizures in people with photosensitive epilepsy, and may cause motion sickness. Read the Health and Safety Warning before playing. Play in a well-lit room, take regular breaks, and stop at once if you feel unwell. You play at your own risk.</p>

<h3>5. Content</h3>
<p>The Game includes competitive sport, collisions and cartoon-style combat (including toy-like guns and knockouts in Volt Royale). Read the Content Notice. Parents and guardians decide whether the Game is suitable for their child.</p>

<h3>6. Ownership, copyright and your own files</h3>
<p>The Game, its code, art, characters, music, sounds, text and the names and logos used in it are owned by us or our licensors and are protected by copyright, trademark and other laws.</p>
<p>The Game lets you add your own music files (the music folders) and similar content. <b>You are solely responsible for having the right to use any file you add.</b> Do not add material you do not own or have a licence for. We do not supply, host, check or endorse those files, and we are not responsible for any infringement caused by them.</p>
<p>Any resemblance between the Game's original characters, skins, emotes, sounds or designs and any real person, team, brand or other work is unintentional. The Game is not affiliated with, endorsed by, or sponsored by any sports league, team, game publisher or other company named or referred to in it or in player-made content. See the Copyright and Trademark Notice for how to report infringement.</p>

<h3>7. Virtual items and progress</h3>
<p>Skins, emotes, XP, levels, season and pass progress and other virtual items have no money value, cannot be exchanged for money, and are part of the licence, not property you own. We may change, rebalance or remove them. Progress may be lost (for example if your browser clears its storage or a service fails) and we are not liable for that.</p>

<h3>8. Changes and availability</h3>
<p>We may update, change, suspend or stop the Game or any feature at any time, with or without notice. We may change this agreement; if a change matters, we will ask you to agree again. If you keep playing after a change, you accept it.</p>

<h3>9. Disclaimer of warranties</h3>
<p><b>The Game is provided "as is" and "as available", without warranties of any kind, express or implied</b>, including warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, and that the Game will be uninterrupted, secure or error-free, to the fullest extent the law allows.</p>

<h3>10. Limitation of liability</h3>
<p>To the fullest extent the law allows, we and our contributors, licensors and service providers are <b>not liable for any indirect, incidental, special, consequential, exemplary or punitive damages</b>, or for loss of data, progress, goodwill or profits, or for personal injury or harm arising from your use of the Game (including seizures, motion sickness, strain or injury), from the conduct or content of other players, from a false age or false information, or from files you add, even if we were told such damage was possible. Our total liability for any claim is limited to the greater of the amount you paid us for the Game in the twelve months before the claim, or ten Canadian dollars (CAD $10). Some places do not allow some of these limits; there, they apply as far as allowed.</p>

<h3>11. Indemnity</h3>
<p>You agree to defend, indemnify and hold harmless us and our contributors from any claims, losses, damages, costs and expenses (including reasonable legal fees) arising from your breach of this agreement, your User Content, files you add, a false age or false information you gave, or your misuse of the Game.</p>

<h3>12. Ending this agreement</h3>
<p>You may stop using the Game and delete your account at any time. We may suspend or end your licence or account if you break this agreement or if we need to for legal or safety reasons. Sections 2, 3 (licence to User Content), 6, 7, 9, 10, 11 and 13 survive the end of this agreement.</p>

<h3>13. General</h3>
<p>This agreement is governed by the laws of ${LEGAL.law}, without regard to conflict-of-law rules, and the courts of ${LEGAL.courts} have exclusive jurisdiction, except where your local consumer law gives you rights that cannot be waived. If any part of this agreement is found unenforceable, the rest stays in force. Our failure to enforce a term is not a waiver. You may not transfer this agreement; we may. This agreement, with the Privacy Notice, Health and Safety Warning, Content Notice and Copyright and Trademark Notice, is the whole agreement between you and us about the Game.</p>
<p>Questions: contact us ${LEGAL.reach()}.</p>` },

  privacy: { title: 'Privacy Notice', body: () => `
<p class="lg-date">Version ${LEGAL.version}</p>
<p>This notice explains what the Game keeps about you and why.</p>
<h3>Without an account</h3>
<p>Your settings, progress, unlocks and the agreements you accepted are stored in your own browser (local storage) on your device. They are not sent to us unless you create an account or play online.</p>
<h3>With an account</h3>
<p>We keep: your username; your password (stored only as a secure, salted hash, never in plain text); your email address if you give one (used only to reset your password and for important account notices, never shown to other players); whether you are under 18, 16 or over, or 18 or over (we keep the age group, not the exact age); your settings and game progress; your friends, blocks, invites and messages; when you were last online; the version and time of the agreements you accepted; and moderation records (such as reports and bans).</p>
<h3>Online play and chat</h3>
<p>Online matches and voice chat connect players' browsers directly (peer-to-peer) or through a relay server. This can reveal your IP address to the other players or the relay, as with most online games. Text messages are stored so they can be delivered and moderated. Voice chat is not recorded by us. Reports you make, and the messages they concern, may be reviewed by our moderators.</p>
<h3>Why, and who we share it with</h3>
<p>We use this information only to run the Game, keep players safe, enforce our rules and comply with the law. We do not sell your personal information or use it for advertising. Our hosting and email providers process it for us under their own security terms. We may disclose information if the law requires it or to protect someone's safety.</p>
<h3>Children</h3>
<p>Players under 18 can only chat with friends they have accepted. If you are a parent or guardian and want to see or delete your child's account information, contact us.</p>
<h3>Your choices</h3>
<p>You may ask to see, correct or delete your account information, subject to the law. You can block and mute players, and log out at any time. Clearing your browser's data removes what is stored on your device.</p>
<h3>Security and retention</h3>
<p>We take reasonable steps to protect your information, but no system is perfectly secure. We keep account information while your account exists and for a limited time after, as needed for safety, legal and backup purposes.</p>
<p>Contact us ${LEGAL.reach()}.</p>` },

  health: { title: 'Health and Safety Warning', body: () => `
<h3>⚠ Photosensitive seizure warning</h3>
<p><b>Read this before you or your child play.</b> A very small percentage of people may have a seizure when exposed to certain visual images, including flashing lights or patterns that may appear in video games. Even people with no history of seizures or epilepsy may have an undiagnosed condition that can cause these "photosensitive epileptic seizures" while playing video games.</p>
<p>These seizures may have a variety of symptoms, including lightheadedness, altered vision, eye or face twitching, jerking or shaking of arms or legs, disorientation, confusion, or momentary loss of awareness. Seizures may also cause loss of consciousness or convulsions that can lead to injury from falling down or striking nearby objects.</p>
<p><b>Stop playing immediately and consult a doctor if you experience any of these symptoms.</b> Parents should watch for or ask their children about the above symptoms; children and teenagers are more likely than adults to experience these seizures.</p>
<p>If you or anyone in your family has ever had seizures or epilepsy, consult a doctor before playing.</p>
<p>The risk may be reduced by: sitting farther from the screen; using a smaller screen; playing in a well-lit room; not playing when you are drowsy or tired; and taking a break of at least 10 to 15 minutes every hour.</p>
<h3>Motion sickness and strain</h3>
<p>First-person and fast-moving views can cause motion sickness, dizziness or nausea. Gaming can also cause eye strain and discomfort in the hands, wrists, arms or neck. Take breaks, and stop if you feel unwell, tired or sore. If discomfort continues, see a doctor.</p>
<h3>Your surroundings and hearing</h3>
<p>Keep the volume at a safe level, especially with headphones. If you play with a phone or controller, stay aware of the people and things around you.</p>
<p>Volt Hockey is a game. It is not a training tool for real power-chair driving or sport; do not copy in-game driving, jumps or collisions in real life.</p>` },

  content: { title: 'Content Notice', body: () => `
<h3>Violence</h3>
<p>The Game contains <b>cartoon and fantasy violence</b>: carts colliding and knocking each other over in sports games and minigames, and, in <b>Volt Royale</b>, combat with toy-like and futuristic guns, explosives, melee hits, players being "downed" and eliminated, and damage numbers. There is no blood or gore. Volt Royale is limited to players who say they are 16 or over.</p>
<h3>Online interactions</h3>
<p>Online play includes text and voice chat and player-made usernames. <b>Online interactions are not rated</b> and are not controlled by us. Filters and moderation reduce, but cannot remove, the risk of offensive content or contact. Players under 18 can only chat with accepted friends.</p>
<h3>Other content</h3>
<p>The Game includes competitive scoring, crowds and commentary, celebration emotes, flashing effects, and optional cosmetic progression (a pass, levels and skins earned by playing). There are no real-money purchases in the Game.</p>
<p>Parents and guardians: please review these features and decide whether the Game is right for your child, and talk with them about staying safe online.</p>` },

  copyright: { title: 'Copyright and Trademark Notice', body: () => `
<p>© ${new Date().getFullYear()} ${LEGAL.owner}. All rights reserved. Volt Hockey, Volt Royale and their logos are names used by ${LEGAL.owner}.</p>
<h3>Third-party software</h3>
<p>The Game uses open-source software, including Phaser (MIT licence), three.js (MIT licence) and PeerJS (MIT licence). Their copyright notices and licences belong to their authors and are included with their files.</p>
<h3>Original content</h3>
<p>The Game's music, jingles, emote sounds, sound effects, characters, skins, emotes and maps were made for the Game (much of it generated by code) and are not copies of other works. Any similarity to existing songs, characters, products, places or works is unintentional and coincidental.</p>
<h3>Trademarks and affiliations</h3>
<p>All other names, brands and trademarks mentioned in the Game or by players belong to their owners. Their mention does not mean the owner endorses, sponsors or is affiliated with the Game. Volt Hockey is not affiliated with any professional sports league, team, governing body, game, or game publisher. Flags and national symbols on cosmetic items are used decoratively.</p>
<h3>Your own files and player content</h3>
<p>Music you place in the music folders, and anything players type, say or create, is the responsibility of the person who adds it. Only use material you own or have permission to use. We do not distribute those files.</p>
<h3>Reporting infringement</h3>
<p>If you believe something in the Game, or content a player shared through it, infringes your copyright or trademark, send us a notice ${LEGAL.reach()} including: your name and contact details; a description of the work you say is infringed; where the material is in the Game; a statement that you believe in good faith the use is not authorised; a statement that your notice is accurate and that you own the rights or are authorised to act for the owner; and your physical or electronic signature. We will review it and, where appropriate, remove the material or forward the notice under the Copyright Act (Canada) notice-and-notice regime or the U.S. Digital Millennium Copyright Act. We may suspend repeat infringers. Knowingly false notices may make you liable for damages.</p>` }
};
const LEGAL_ORDER = ['eula', 'privacy', 'health', 'content', 'copyright'];

const Legal = {
  css() {
    if (this.styled) return; this.styled = true; const c = document.createElement('style');
    c.textContent = `#legal,#lgdoc{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(4,8,12,.94);font-family:"Barlow Condensed",Arial,sans-serif;color:#e8eef2}
      #legal{z-index:80}#lgdoc{z-index:85;background:rgba(4,8,12,.8)}
      #legal .box,#lgdoc .box{width:min(760px,94vw);max-height:94vh;display:flex;flex-direction:column;box-sizing:border-box;background:#0f1a22;border:1px solid #2f4a5c;border-radius:16px;box-shadow:0 10px 50px #000c}
      #legal h1,#lgdoc h1{margin:0;padding:14px 20px 8px;font-size:32px;color:#fff;letter-spacing:.03em}
      #legal .bd,#lgdoc .bd{overflow-y:auto;padding:0 20px 8px;font-size:18px;line-height:1.38}
      #legal .warn{border:2px solid #ffb02e;background:#2a1d08;border-radius:10px;padding:8px 12px;margin:8px 0}#legal .warn b{color:#ffd23f}
      #legal .note{border:1px solid #3c5566;background:#0b141b;border-radius:10px;padding:8px 12px;margin:8px 0}
      #legal .docs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
      #legal button,#lgdoc button{font:inherit;font-size:18px;background:#1b2a35;color:#fff;border:1px solid #3c5566;border-radius:8px;padding:6px 14px;cursor:pointer}
      #legal button.go{background:#19c3ff;color:#06222f;border-color:#19c3ff;font-weight:700}#legal button.go:disabled{opacity:.4;cursor:not-allowed}
      #legal label{display:flex;gap:10px;align-items:flex-start;margin:8px 0;font-size:18px;cursor:pointer}#legal input[type=checkbox]{width:22px;height:22px;flex:none;margin-top:2px}
      #legal .ft,#lgdoc .ft{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:10px 20px 14px;border-top:1px solid #22384a;flex-wrap:wrap}
      #legal .msg{flex:1;color:#ff8a6b;font-size:16px}#legal .tip,#lgdoc .tip{flex:1;color:#9fb2bf;font-size:14px}
      #lgdoc h3,#legal h3{color:#7fd3ff;margin:14px 0 4px;font-size:21px}#lgdoc p{margin:6px 0}#lgdoc .lg-date{color:#9fb2bf;font-size:15px}`;
    document.head.append(c);
  },
  /* read one document (scrolls with the D-pad / stick, B or ✕ closes) */
  show(key, onClose) {
    this.css(); const D = LEGAL_DOCS[key]; if (!D) return; this.closeDoc();
    const el = this.doc = document.createElement('div'); el.id = 'lgdoc';
    el.innerHTML = `<div class="box" role="dialog" aria-label="${D.title}"><h1>${D.title}</h1><div class="bd" tabindex="0">${D.body()}</div><div class="ft"><span class="tip">Gamepad: ▲ ▼ scroll, B closes · Keyboard: arrows / Page Up / Page Down, Esc</span><button data-x>✕ Close</button></div></div>`;
    document.body.append(el); const bd = el.querySelector('.bd'), close = () => { this.closeDoc(); onClose && onClose(); };
    el.querySelector('[data-x]').onclick = close; el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });
    el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
    PadNav.open(el, { modal: true, focusFirst: true, onBack: close, onKey: p => { if (p('up')) { bd.scrollBy({ top: -160, behavior: 'smooth' }); return true; } if (p('down')) { bd.scrollBy({ top: 160, behavior: 'smooth' }); return true; } return false; } });
    this.docTick = setInterval(() => { if (!this.doc) return clearInterval(this.docTick); const pads = Controls.list().filter(s => s.id.startsWith('pad')); const y = pads.reduce((a, s) => Math.abs(s.ay || 0) > Math.abs(a) ? s.ay : a, 0); if (Math.abs(y) > 0.3) bd.scrollBy(0, y * 14); }, 30);   // (the stick scrolls smoothly)
    setTimeout(() => bd.focus({ preventScroll: true }), 0);
  },
  closeDoc() { if (this.doc) { PadNav.close(this.doc); this.doc.remove(); this.doc = null; clearInterval(this.docTick); const g = document.getElementById('legal'); if (g) { const b = g.querySelector('[data-doc]'); if (b) PadNav.focus(this.lastBtn || b); } } },
  /* the first-run gate: nothing else can be clicked or pressed until it is accepted */
  gate(done) {
    if (LEGAL.accepted()) return done && done();
    this.css(); if (document.getElementById('legal')) return;
    const el = document.createElement('div'); el.id = 'legal';
    el.innerHTML = `<div class="box" role="dialog" aria-label="Before you play"><h1>Before you play</h1><div class="bd">
      <div class="warn"><b>⚠ PHOTOSENSITIVE SEIZURE WARNING.</b> This game contains flashing lights, sparks, explosions and fast-moving patterns that may trigger seizures in people with photosensitive epilepsy, even with no history of seizures. Stop playing immediately and see a doctor if you feel dizzy, have altered vision, twitching, disorientation or any involuntary movement. Play in a well-lit room and take regular breaks.</div>
      <div class="warn"><b>⚠ CONTENT: CARTOON VIOLENCE.</b> Carts crash and knock each other over, and Volt Royale (16+) has combat with toy-like guns, explosives and knockouts. No blood or gore. <b>Online interactions are not rated</b>: other players' chat, voice and names are not controlled by us.</div>
      <div class="note"><b>Your age.</b> If you create an account you must enter your real age. Entering an age that is not your own is a misrepresentation and a breach of the EULA; you are responsible for the consequences and we are not liable for them. If you are under the age of majority where you live, a parent or guardian must read and accept these terms for you.</div>
      <div class="note"><b>Copyright.</b> Only add music or other files you own or have permission to use; you are responsible for them. The Game is not affiliated with any sports league, team or game publisher.</div>
      <p>Please read the full documents:</p>
      <div class="docs">${LEGAL_ORDER.map(k => `<button data-doc="${k}">📄 ${LEGAL_DOCS[k].title}</button>`).join('')}</div>
      <label><input type="checkbox" name="agree"> <span>I have read and agree to the <b>End User Licence Agreement and Terms of Use</b> and the <b>Privacy Notice</b>. If I am under the age of majority, my parent or guardian has read and agrees to them for me.</span></label>
      <label><input type="checkbox" name="warn"> <span>I have read the <b>Health and Safety (seizure) Warning</b> and the <b>Content Notice</b>, and I play at my own risk.</span></label>
    </div><div class="ft"><span class="msg"></span><button data-a="no">Decline</button><button class="go" data-a="yes" disabled>Agree and continue</button></div></div>`;
    document.body.append(el);
    const yes = el.querySelector('[data-a=yes]'), msg = el.querySelector('.msg'), boxes = [...el.querySelectorAll('input[type=checkbox]')];
    const sync = () => { yes.disabled = !boxes.every(b => b.checked); if (!yes.disabled) msg.textContent = ''; };
    boxes.forEach(b => b.addEventListener('change', sync));
    el.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => { this.lastBtn = b; this.show(b.dataset.doc); });
    el.querySelector('[data-a=no]').onclick = () => { msg.textContent = 'You need to accept the agreements to play Volt Hockey. You can read them first, or close this page.'; Sound.play && Sound.play('back'); };
    yes.onclick = () => { if (!boxes.every(b => b.checked)) { msg.textContent = 'Tick both boxes to continue.'; return; } LEGAL.accept(); PadNav.close(el); el.remove(); Sound.play && Sound.play('select'); done && done(); };
    el.addEventListener('keydown', e => e.stopPropagation());
    const lin = p => { const d = p('down') || p('right') ? 1 : p('up') || p('left') ? -1 : 0; if (!d) return false; const L = PadNav.focusables(el), i = L.indexOf(PadNav.current), n = L[Math.max(0, Math.min(L.length - 1, (i < 0 ? 0 : i + d)))]; if (n && n !== PadNav.current) { PadNav.focus(n); Sound.play && Sound.play('blip'); } return true; };   // (the controller steps through it in order)
    PadNav.open(el, { modal: true, focusFirst: true, onBack: () => {}, onKey: lin });   // (B does nothing: there is no way past it but agreeing)
    setTimeout(() => { el.querySelector('.bd').scrollTop = 0; }, 30);   // (start at the top: the seizure warning first)
  }
};

/* sign-up: one more tick, sent to the server (which won't create an account without it) */
{ const acc = Forms.account.bind(Forms);
  Forms.account = function (done, mode = 'login') {
    const r = acc(done, mode); const el = this.el; if (mode !== 'signup' || !el) return r;
    const err = el.querySelector('.err'); if (!err || el.querySelector('[name=legal]')) return r;
    err.insertAdjacentHTML('beforebegin', `<label style="display:flex;gap:8px;align-items:flex-start;color:#e8eef2;font-size:16px;margin-top:10px;cursor:pointer"><input type="checkbox" name="legal" style="width:20px;height:20px;flex:none;margin-top:2px"><span>I confirm <b>the age above is my real age</b> (a false age is a misrepresentation I am responsible for), and I agree to the <button type="button" class="link" data-ld="eula">EULA and Terms of Use</button> and the <button type="button" class="link" data-ld="privacy">Privacy Notice</button>. Under the age of majority: my parent or guardian agrees for me.</span></label>`);
    el.querySelectorAll('[data-ld]').forEach(b => b.onclick = e => { e.preventDefault(); Legal.show(b.dataset.ld); });
    const go = el.querySelector('[data-a=go]'), box = el.querySelector('[name=legal]');
    const block = e => { if (!box.checked) { e.stopImmediatePropagation(); e.preventDefault(); err.textContent = 'Please confirm your age is real and agree to the EULA and Privacy Notice.'; } };
    el.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-a=go]')) block(e); }, true); el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target !== box) block(e); }, true);
    PadNav.close(el); PadNav.open(el, { onBack: () => this.close(), modal: true, focusFirst: true });   // (so the new tick box is in the gamepad's reach)
    return r;
  };
  Account.register = async function (username, password, age, email) {
    const r = await this.req('POST', '/register', { username, password, age, email, legal: LEGAL.version }); await this.begin(r, true); return r;
  };
}

/* Settings > Legal and agreements */
SETTINGS_ORDER.push('Legal and agreements');
SETTINGS_HINTS['Legal and agreements'] = 'EULA and terms of use, privacy, the seizure warning, the content notice, copyright';
SETTINGS_PAGES['Legal and agreements'] = () => [
  ...LEGAL_ORDER.map(k => ({ label: () => LEGAL_DOCS[k].title, hint: 'Read it', select: () => Legal.show(k) })),
  { label: () => `You agreed to version ${LEGAL.version}${(() => { try { const s = JSON.parse(localStorage.getItem(LEGAL.key) || 'null'); return s && s.at ? ' on ' + s.at.slice(0, 10) : ''; } catch (e) { return ''; } })()}`, hint: 'Agreeing again shows the first-run screen' , select: () => { try { localStorage.removeItem(LEGAL.key); } catch (e) { /* */ } LEGAL.sessionOk = false; Legal.gate(); } }
];

/* the title screen: a short line of warnings at the top, every visit */
{ const P = TitleScene.prototype, cr = P.create;
  P.create = function (...a) { const r = cr.apply(this, a);
    this.add.text(CX, 20, '⚠ Seizure warning: flashing lights   ·   Cartoon violence   ·   Online interactions not rated   ·   Legal: Settings ▸ Legal and agreements', { ...STYLE.hint, fontSize: '15px', color: '#ffcf6b' }).setOrigin(0.5).setDepth(50).setAlpha(0.9);
    this.add.text(CX, 712, `© ${new Date().getFullYear()} ${LEGAL.owner === 'the developer of Volt Hockey' ? 'Volt Hockey' : LEGAL.owner}. Use of this game is subject to the EULA. Not affiliated with any sports league or game publisher.`, { ...STYLE.hint, fontSize: '12px', color: THEME.dim }).setOrigin(0.5).setDepth(50);
    return r; };
  const bg = P.begin; P.begin = function (...a) { if (!LEGAL.accepted()) { Legal.gate(); return; } return bg.apply(this, a); };   // (nothing starts until the agreements are accepted)
}
/* the gate opens as soon as the page has loaded */
Legal.gate();
