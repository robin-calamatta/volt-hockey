# Volt Hockey

Phaser 3 game with a Three.js 3D view, no build step. Serve the folder (`npx serve` or `python3 -m http.server`) and open `index.html`.
Phaser loads from a CDN; download `phaser.min.js` and change the first script tag to run offline. Three.js (r149) is bundled in `lib/three.min.js`.

## Minigames (v9)
Main menu > **Minigames** > a game > **Play on this screen** (local: split screen, controllers, CPUs) or **Host an online room**
(a room already set to that game). Also Online > **Create a minigame room**, and every online room has a **Game** row (hockey or any
minigame). A party leader brings the party along either way. Every minigame works with
CPU carts, split screen, every camera (first / third person, broadcast, classic 2D), touch, and online.
- **Balloon Bash** (free for all or teams): balloons on every cart's back (1-5). Hit someone's back with your front: a balloon pops and they
  restart somewhere safe (blinking: 2 s of protection). No balloons left: out, watching from the sin bin. Round clock: when it runs out,
  the most balloons left wins.
- **Race**: a barrier island makes the rink an oval track. Laps and positions are tracked; the winner crossing the line starts a 20 s
  window for the rest to finish.
- **Manhunt**: one random cart is IT. Whoever IT touches turns IT (changes colour and freezes for 2 s). IT wins when everyone is caught;
  anyone still free when the clock runs out wins.
- **Power-ups** (? boxes, on/off per game): **BOOST** (3 s faster), **ZAP** (a shot: pops a balloon in Balloon Bash, spins a cart out
  otherwise) and **OIL** (dropped behind you; whoever drives over it gets reversed steering for 4 s, then the slick is gone).
  Use with **A or X** (keyboard 1: Space or X, keyboard 2: Right Shift or \, touch: A).
- Code: `src/minigames.js` (rules, power-ups, CPU, online state; tuning in `MINI`), `src/scenes_mini.js` (menus and drawing).
- Also: online players get 3x longer before being dropped as "lost" in a match's first 15 s (slow devices building the 3D arena).

## v8.1: friends window, party leader, controller everywhere, password reset, admin page
- **Friends and party window**: the 👥 button in the top-left corner of every screen (or **Select / View** on a gamepad, or the **`** key)
  opens one window with your account, Add a friend, Leaderboard, your party, room, invites and friends list. An offline match pauses while
  it is open. Nothing social is in the menus any more.
- **Camera button moved to D-pad down** on a gamepad (keyboard T / P unchanged), so Select is free for the friends window.
- **Add a friend**: matching usernames drop down as you type; under-18 players only appear on an exact username.
- **Party leader is the boss**: the leader picks Play, Season, Practice or Online and the whole party comes along (members can put local
  players on either team in rooms; in a season the party plays on the leader's team). Members see "waiting for the leader". The leader can
  remove anyone; anyone can leave. Party voice is open mic for the whole time you are in a party, and the window shows who is connected.
- **Accounts**: email at sign-up, confirm password, 👁 to peek, **Forgot password** emails a reset link (DEPLOY.md). Older accounts can add
  an email from the friends window.
- **Mouse, keyboard or controller alone**: pop-ups no longer let clicks through to the menu behind; a gamepad moves around every form with
  the D-pad and types on an **on-screen keyboard** (A types, B deletes, X shift, Y space, Start done).
- **Nothing behind a pop-up reacts**: while the friends window, a form, chat, the on-screen keyboard or the touch-button editor is open,
  every screen behind it gets no keys, controller presses, stick, mouse or taps (`Controls.isBlocked`, `src/input.js`). The key or button
  that closes a pop-up (Esc, B, A) stays dead until it is let go, so it cannot fall through to the menu behind. Fixed: after a pop-up opened by a tap, the next tap on the game was ignored.
- **Esc goes back** in every list menu (it used to act as Start and select the highlighted row). Quick key or touch-button taps
  between two frames are no longer lost.
- **Mouse and touch everywhere**: Back rows on match / practice setup; Back / Continue buttons on standings, your games (with ▲ ▼ and the
  mouse wheel), bracket, trophy, hall of fame, leaderboard (◀ ▶ categories) and the controls guide; the lobby has Back, Join (touch
  controls) and Kick off; a match has a II pause button for the mouse; the end of a match has Rematch / Main menu (or Continue / Back to
  the room) buttons.
- **Phones**: the touch controller only shows during a match (it used to cover the bottom menu rows), taller rows on the camera page,
  the online room's host settings moved to a second page (**Teams and rules ▸**) so rows stay big enough to tap, and a "turn your phone
  sideways" screen when a phone is held upright. During a match on a touch screen the 👥 button steps aside (it covered the speed +
  button); the pause menu has **Friends and party** on every device.
- **Log in with your username or your email.**
- **Connections that fail now say so**: joining a party or room used to hang silently when the two computers could not connect
  directly. It now says why within seconds. Add a free TURN relay to fix such networks: `TURN_CREDENTIALS_URL` (DEPLOY.md).
- **Smoother motion (v8.2)**: carts and the ball are drawn exactly between the fixed 240 Hz simulation steps (`Match.drawBetween`,
  `CONFIG.render.smooth`). Before, first and third person juddered, worst on 120 / 144 Hz monitors (frame-to-frame unevenness 41% -> 3%).
- **The ball is never hidden by a name tag (v8.3)**: a tag fades almost away while the ball is under it or next to it, in the 2D view and every
  3D camera (`CONFIG.render.tagFade`). The mouse pause button moved to the top bar so it no longer covers split-screen names.
- **⚡ quick chat button** next to 💬 and 🎙 (it used to be hidden inside the chat window). Keys 1-9 and D-pad up in a match still work.
- **Long menu text** shrinks to fit its box.
- **Server errors fixed** (the Netlify Function now opens its storage fresh on each call), quieter background traffic.
- **Admin page** at `/admin.html` (DEPLOY.md): players, reports, and every stored item.

## Accounts, leaderboard, friends, parties, chat and voice (v8)
- **Optional login** (Friends and party, or Settings > Account and player). Guests still play everything; their saves stay in that browser.
  Logged-in players have their preferences, career, current season and hall of fame saved online and restored on any device or after
  the browser clears its storage. Sign-up asks for an age: only "under 18 / 18 and over" is kept, for chat safety.
- **Global leaderboard** (main menu): World Cups, wins, goals and win % (10+ games) across every logged-in player.
- **Friends** by username: requests, accept / decline, remove, block, see who is online and where, private messages (with unread counts),
  invites to your party or your room, and join a friend's open room or party.
- **Parties**: start one and invite friends. When the leader creates a room under Online, everyone in the party is taken into it, and each
  member can still add local players on their own controllers. Parties have their own chat and voice.
- **Chat** in rooms (lobby and match) and parties: Tab or 💬, quick-chat phrases (keys 1-9, D-pad up on a gamepad), swear filter, click a
  name to mute, add, block or report. Guests: quick chat only. Under 18: typed chat only with friends.
- **Voice chat** in rooms (everyone in the room) and parties: open mic, push to talk (L3 / G / L / 🎙), mic off, or off. Settings > Voice chat:
  microphone, mic volume, hear yourself, mic test with a level meter, voice volume. Settings > Sound: master volume and speakers / headphones.
  Logged-in players only; anyone under 18 only hears and talks with friends; muted / blocked players are never connected.
- How it runs: `netlify/functions/api.mjs` + Netlify Blobs (free, on your Netlify site). See **DEPLOY.md**. Code: `server/core.mjs` (services),
  `src/account.js`, `src/social.js` (friends, parties), `src/chat.js`, `src/voice.js`, `src/scenes_social.js` (screens), `src/chatfilter.js`.

## First person, third person and broadcast (v7)
The match is now drawn in 3D: a real arena with a hardwood (or tile, concrete, ice, turf) floor, boards, nets with mesh, stands full of fans who cheer, clap, do the wave and hold up signs, and lit, shadowed carts and players.
- **Look around**: the right stick turns your head in first person (up to about 115 degrees each way, and up / down) and swings the camera round your cart in third person. Let go and it springs back to straight ahead. Settings > Camera can invert up / down.
- **The chairs** are modelled on real volt hockey chairs: a bent-plywood bow sweeping from behind the seat down to the nose, a wooden bucket seat and tall backrest (with the player's number on the back), rolled armrest pods with the joystick on the right, grey drive wheels, rear casters, harness straps, and the white plastic "t" stick at ball height. A stripe of team colour runs along each side.
- **v7.4**: a benched player who is not locked can press Y to take a free teammate's cart (the benched cart stays in the box and serves its time; Y never cycles you back into the bin). The only dead ball now is one left untouched in a crease for `CONFIG.creaseIdle.seconds`; the old "puck frozen" face-off anywhere on the court is off (`CONFIG.frozen.enabled`).
- **v7.3**: third person looks down from higher up behind the cart so you can see your blade and the ball over the driver (raise or lower it with the chase distance in Settings > Camera and graphics); **lock one player to one cart** when choosing sides (press **X** next to your name in Choose players, or "Your cart" in an online room); and a **sin bin**: a glass penalty box for each team at the boards on the far side, with a sign and a penalty clock. Benched carts sit in it, and if it is your cart you watch from your seat in the box until your time is up (from v7.4 you can switch to a free cart unless you are locked).
- **v7.2**: longer chairs like the real ones (seat well back, legs out to a footrest near the nose), a rounded backrest with a hand slot and the number on a team-colour badge, nets about as tall as a chair (`CONFIG.view3d.net`), the ball drawn 20% bigger (`CONFIG.ball.drawScale`; the physics size is unchanged), and the chair still collides as the same circle as before.
- **One cart all game**: Match setup, Season setup, the online room and Settings > Game rules have **Switch carts with Y: On / Off**. Off locks everyone to the cart they start in (online it is the host's rule).
- **Settings, regrouped** (nothing removed): Camera and graphics, Sound and commentary, Game rules, Ball and carts, CPU opponent, Controls and screen (controls guide, right-stick look, touch buttons, fullscreen), Player. A line under the menu says what is on the highlighted page. The pause menu has Camera right under Resume.
- **Commentator**: Voice and captions, **Voice only**, Captions only, or Off.
- **Camera button**: D-pad down on a gamepad (View until v8.1), **T** on keyboard 1, **P** on keyboard 2, **◉ VIEW** on the touch pad. It steps through **First person -> Third person -> Broadcast -> Classic 2D**. Also in the pause menu and Settings > Camera.
- **Steering in first and third person is cart-relative**: push forward to drive, left / right to turn. How far you push sideways sets how fast you turn; sideways alone turns on the spot; pull back to reverse. Spin shots work as before (the camera eases round so a 90 degree spin does not whip the view).
- **Broadcast** is a TV camera high on the near side that slides along with the ball; the stick follows the screen like the 2D game.
- **Classic 2D** is the original flat view, unchanged (zoom, tilt, NHL/sideways/whole rink).
- **Split screen**: two or more people on one screen each get their own camera (side by side for two, quarters for three or four; the spare quarter shows the broadcast view). Each player switches their own camera. Classic 2D is shared, so the camera button takes a split screen out of it.
- **Awareness**: a mini-map (top right), a yellow arrow at the edge of your view pointing at the ball when you cannot see it, names over people's carts, ▼ markers over your CPU teammates, and a speed meter (bottom left) because the speed ring on the floor is out of sight in first person. A cart in the sin bin watches the broadcast view until it is back.
- **Settings > Camera**: camera, first-person field of view, third-person chase distance, and **3D graphics** (Auto / Low / Medium / High: resolution, shadows and the crowd; Low suits older phones).
- Online play is unchanged underneath: everyone can use any camera, and the host still simulates everything.
- Code: `src/view3d.js` draws (arena, carts, ball, fans, cameras); `src/scenes_3d.js` adds the cameras, split screen, steering and overlay to the game screen; tuning is in `CONFIG.view3d` in `src/config.js`. The simulation (`match.js`, `chair.js`, `ai.js`, `net.js`) never touches the drawing.

## Where things live
- `src/config.js`  every tunable number (court, nets, physics, spin, fouls, AI, difficulties, slider ranges)
- `src/teams.js`   add / remove / edit teams. Drop logos in `assets/logos/` and point `logo` at them
- `src/audio.js`   `SFX` (sound effects) and `MUSIC` (tracks as note loops). Add an entry, call `Sound.play('x')` / `Sound.playMusic('x')`
- `src/input.js`   keyboard and gamepad mapping (`KEYMAP`, `PAD_BUTTON`)
- `src/match.js`   rules and simulation (no drawing).  `chair.js` the cart, `ai.js` NPCs, `scenes.js` menus and 2D rendering, `view3d.js` + `scenes_3d.js` the 3D view

## Controls
Gamepad: left stick drive, RT spin clockwise, LT spin counter-clockwise, Y switch to nearest free teammate, RB / LB cart speed up / down (5 modes, shown by the ring around your cart; top speed is `chair.maxSpeed`), Start pause, A/B select/back.
Keyboard 1: WASD, E / Q spin, V / C speed up / down, F switch, Space select, Enter / Esc start.  Keyboard 2: arrows, . / , spin, / switch, ' / ; speed up / down, Right Shift select.

Settings menu (also in the pause menu): volumes, cart turning speed, game clock speed, starting cart speed, ball bounce, ball grip, stick length, collisions on/off, penalties on/off, difficulty.

## Your own music
Drop mp3/ogg/wav/m4a/flac files into one folder, `assets/music/`. The menus and the matches both shuffle songs from it. (Files in the older `menu/` and `match/` subfolders are added to the same pool.)
- **Local dev server** (`npx serve`, `python3 -m http.server`): the game reads the folders itself. Nothing to do.
- **Public hosting** (Netlify, GitHub Pages, Wix...): hosts hide folder listings, so run `node tools/make-playlist.js` before uploading.
  It writes `assets/music/playlist.json`, which the game reads. Re-run it whenever you add or remove songs.
- Or list file names by hand in `MUSIC_FILES` in `src/music.js`.
The title screen says how many songs were found. No songs found (or none loadable) = the built-in 8-bit tunes play.
Songs shuffle; "Next song" is in the pause menu.

## Practice mode
Main menu > Practice: pick any team sizes (1 to 3 carts per side, e.g. 1v1, 2v2, 1v3), no clock, and the pause menu has every setting
plus "Reset score and kickoff". Ball friction (Settings) controls how quickly the ball slows; default 1.2.

## Online play (new)
Main menu -> Online -> Create room (you get a 5-letter code) or Join room (type it). Up to 6 humans; the host picks sides, team sizes and CPU skill, then presses START MATCH. The host's browser runs the match (CPUs included); everyone else gets smooth, predicted controls. The host must stay in the room. It uses PeerJS (free public broker, bundled in lib/). Players behind strict NAT may need a TURN server: add it to `CONFIG.online.iceServers` in src/config.js. Host the game over https.

## CPU
Five levels: Easy, Normal, Hard, Pro, Superstar (`CONFIG.difficulties`, behaviour in `CONFIG.ai`). CPUs play as a team (carry, pass, crash the net, screen for a human ball carrier), avoid nets, and scoop balls off the boards.

## Look and speed
`CONFIG.look` controls shadows and depth. `CONFIG.chair.maxSpeed` and `CONFIG.speedLevels` set how fast the carts are and the five RB/LB speed modes (now 20% to 100%).

## Crease rule
With Penalties on, a cart that enters the crease of the net it is attacking goes to the sin bin. The CPU stays out and shoots from the crease edge. Tune in `CONFIG.crease` and `CONFIG.ai` (creasePad, edgeRange).

## CPU plays
On offence the CPUs set up like a hockey team: one carries (and charges at the net flat out when nothing is ahead), one crashes the slot at the crease edge, one goes wide on the far side for a cross-slot pass and one-timer, and one stays close for a give-and-go. They do the same for a human carrier. Tune in `CONFIG.ai` (wingWide, wingBack, rushClear, rushSpeed).

## Public and private rooms
Online > Create room. In the room, the host picks **Room: PUBLIC (listed)** or **Private (code only)** and a **Lobby name**. Public rooms show up under Online > **Browse public rooms** (lobby name, host, players, teams, CPU skill, JOIN / IN MATCH / FULL). Up/Down choose, A join, Y refresh, LT / Q join with a code, B back.
There is no game server: the first public host's browser also acts as the room directory (another takes over within a couple of seconds if it leaves). If nobody public is online, the list is empty; private rooms always work with the 5-letter code.

## Look
Animated menu backdrop, broadcast-style scoreboard, goal celebration (confetti, flash, shake). Colours and timings are in `THEME` in `src/ui.js`.

## The CPU learns
**1. Self-tuning (you run it, once in a while).** `node tools/tune.js [generations] [games] [minutes]` (e.g. `node tools/tune.js 20 6 3`) plays the game headless, many times faster than real time, using every CPU core. Each round it mutates the CPU's numbers, plays the copies against the current defaults with sides swapped, and keeps the winner. Results go to `src/tuned.js`, which Hard (half way), Pro and Superstar load. It can be stopped and resumed; delete `src/tuned.js` (leave an empty file) to go back to the hand-set values. The list of numbers it may change is `KNOBS` at the top of `tools/tune.js`.
**2. Learning from you (automatic).** While a human plays, `src/learn.js` notes which part of the net you shoot at, how often you pass instead of shooting and which wing you carry down. It is saved in your browser and fades slowly. Opposing CPU carts then lean towards those habits when guarding and cut your passing lanes more if you pass a lot. Higher levels adapt more (Easy not at all). Turn it off, or forget what it learned, in Settings.

## Board play
A ball on the boards is attacked at full speed on a slant, passing the ball a little off-centre, then the cart swings its nose off the board so the ball rolls up the cup and away along the wall towards the net (`scoop*` values in `src/config.js`). Once the ball is just ahead of the cup it still counts as that cart's ball, so the carrier keeps driving it instead of dropping it for another job.

## Goalies
With two or more CPU carts on a team, one is the goalie: it stands in front of the net, turned side-on, slides along the goal line to where a shot will cross it, shades towards the ball otherwise, steps out to cut the angle as the ball gets close and clears slow loose balls when no rival is near. Its numbers are the `goalie*` values in `src/config.js` (`useGoalie: false` turns it off). Weaker levels misjudge by more and move slower. The self-tuned values in `src/tuned.js` were found before goalies existed; re-run `tools/tune.js` to retune with them.

## Phones and tablets (on-screen controller)
`src/touch.js` adds a touch controller that works like a gamepad: a move stick, spin left / right, cart speed + / -, switch cart, A, B and pause. It starts **on** automatically on touch devices; on the title screen the pills under PRESS START turn it on or off, open **ADJUST BUTTONS**, and go **FULLSCREEN** (the same items are in Settings and the pause menu). In menus only the stick, A, B and pause show, and menu rows can be tapped (left / right quarter of a row = change, middle = select).
**Adjust buttons:** drag any button where you want it, tap one to select it and use Smaller / Bigger (with nothing selected they all resize), Opacity cycles the see-through level, Reset restores the default layout, and **Lock it in** saves it in the browser and stops the buttons moving. Layouts are stored as fractions of the screen, so they survive rotating the phone.
Tips: hold the phone sideways. On Android use FULLSCREEN (it also tries to lock landscape). On iPhone, Safari has no fullscreen for web pages: use Share > Add to Home Screen and open it from there. A touch device is "Touch controls" in the player lobby: tap A to join, push the stick left / right to pick a team, tap the pause button to start.

## Screen layout, settings pages and fullscreen
- During play the court fills the screen under a slim scoreboard and is centred; the controls list moved to **Settings > Controls guide** (edit `CONTROLS_GUIDE` in `src/scenes.js`). Sizes: `view` in `src/config.js`.
- Settings are split into pages: Sound, Match rules, Ball and carts, CPU opponent, Touch and screen (`SETTINGS_PAGES` in `src/scenes.js`). The pause menu now just has a Settings entry that returns to it.
- **Fullscreen** (hides the browser bars, including the address bar): Settings > Touch and screen > Fullscreen, or the pill on the title screen. "Fullscreen on first tap" does it automatically on touch devices. Android Chrome and iPad support it. iPhone Safari does not allow it for web pages: use Share > Add to Home Screen, then open the new icon (the included `manifest.webmanifest` and icons make it launch fullscreen, landscape, with no address bar; Android Chrome's "Install app" does the same). The page must be served over https (or localhost) for the install options to appear.

## Online fixes (phones)
- **Public rooms did not show up when a phone hosted.** The menus re-drew their text every frame, which kept a phone's main thread too busy to answer the room list in time. They now redraw only when something changes (`skipNoOpTextStyle` in `src/main.js`), and the list waits up to 12 s (`CONFIG.online.directory.listTimeoutMs`).
- **Join with a code on a phone:** tap the code boxes to open the keyboard, then tap Join or Back. Browse now has tappable rows plus Back, Refresh and Join with code buttons.

## Online: how a joining player's screen stays accurate
The host's snapshot is the truth, but it is old when it arrives and the host has not yet seen your latest inputs. So every frame a joining player's game runs the game's real physics forward from the newest snapshot to "now" (`ClientSim.project` in `src/net.js`): your cart with the inputs the host has not seen yet, the ball with the same ball physics (`Match.stepBall`) against every cart, other carts on their last velocity. Your cart and the ball come from one consistent simulation, so the ball never moves before your cart touches it and never sits inside it. When a new snapshot disagrees, the difference fades out over a few frames (`fadeRate`, `fadeMax`). The ball is held at the mouth of a net until the host's own ball is in, so it is never drawn in the net before the goal counts. Snapshots and inputs go out 60 times a second (`snapshotHz`, `inputHz`).

## Speed lock, collisions, event text
- **Maximum cart speed** (Settings > Match rules, the Match setup screen, and a row in the online room for the host; tapping it steps through every option and wraps round): caps every cart, CPU carts included, and RB / LB can't go past it. 5 of 5 = no limit. Joining players get the host's lock when the match starts.
- **Cart collisions** start on every time the game launches (you can still switch them off for that session).
- Fouls and other notices now show over the top of the court in smallish gold text (`noticeText` in `src/scenes.js`).

## Smarter CPU, names, menu owner, host-only rules
- **CPU**: on a loose ball the quickest cart attacks it, the next one backs it up ahead of the ball (rebounds) or cuts off goal-side, the rest crash the net or cover. Nobody parks. Carriers "bombard": any look at the net is shot (`bombard` in `CONFIG.difficulties`), and the crashers take the rebounds. The goalie mirrors the carrier across the mouth as they come in, and never drops below `goalieMinSpeed`, even on Easy. Easy is faster and quicker to react than before; Superstar keeps the highest speed, turning, reaction and aim. Numbers live in `CONFIG.ai` (`support*`, `cover*`, `goalie*`, `bombardMin`).
- **Names**: Settings > Player (left/right for presets, A to type your own). In the local lobby, ▲ ▼ pick a preset and Y types a name. Names show above carts and in the online roster (the room's "Your name" row).
- **Pause menu**: only the player who pressed Start drives the pause menu and the settings opened from it (`Controls.owner`).
- **Online rules**: only the host sets max cart speed, collisions, penalties, game clock, teams, sizes and CPU skill (Room screen). Rule rows are read-only in settings during an online match.
- Benchmarks used: `tools/tune.js` is unchanged; headless drills were run with Node (shots, goals, goalie save rate).
- **Wall play / ball / names (later pass)**: carts route round nets with a wider corner pad (they used to crawl past the crease), and a ball within 0.8 of a board moving under 2 m/s now counts as a wall ball to scoop. The ball is drawn as a rolling sphere with spots. Names: on-screen letter grid (gamepad, touch, or just type on a keyboard) via `Settings.askName`.
- **Local games with nobody**: in the lobby press Start with nobody joined to watch CPU v CPU. Anyone can jump in during play by pressing Start on a spare device (JOIN THE GAME menu: pick a side). The pause menu has "Leave the match" for people.
- **Crease**: now reaches `CONFIG.crease.wing` (0.3 m) past each post. Two carts of one team in their own crease: the second to enter takes a penalty (CPU field carts keep out of their own crease; the goalie is exempt).
- **Scoreboard**: second strip under the bar with shots on net, big penalty clocks and the power-play count (3 v 2). Shots on net (`CONFIG.stats`) sync online; career totals are in Settings > Player.
- **Full press (X)**: toggles per team during a match (pad X, kb1 X, kb2 \, touch PRESS). While the ball is in the foe's end the CPU goalie joins the attack and runs back when it comes out (`Match.press`, synced online). **Half spin**: RB / LB (kb1 R / Z, kb2 ] / [, touch small buttons) turn half as far as RT / LT. Cart speed moved to the D-pad ◀ ▶ on gamepads.
- CPU offense: faster approach into the ball, fewer passes, shots only from `bombardRange`; goalie also sweeps slow balls close to the line.
- **Shot counter**: a shot on net is counted when the ball enters a crease and the last cart to touch it belonged to the attacking team (`Match.lastTouch`, `countShots`). Saves and goals both count; an own-touch ball rolling into a crease does not.
- **Crashing the net**: a CPU carrier with the ball, lined up on the net with a look at it, no longer stops at the crease: it drives flat out through (`crash` in `CONFIG.difficulties`, `crash*` in `CONFIG.ai`), takes the crease penalty and lets the ball carry in. A goal clears the penalty at the kick-off anyway.

## Learned finisher (CPU brain)
- `src/brain.js`: a tiny neural net (16 inputs, 6 hidden, 124 weights) that the CPU consults when it has the ball near the foe's net. It scores candidate actions (crash/shoot at left, middle or right of the net, keep driving, pass) and picks the best. Every difficulty has a `brain` flag and `brainNoise` (Easy is sloppy, Superstar has none) in `src/config.js`.
- `src/brain_weights.js`: the trained weights (generated). Delete the file or its script tag in `index.html` and the CPU falls back to the scripted decisions.
- `tools/train_brain.js`: trains it with evolution strategies in short attack drills, using several CPU cores. `node tools/train_brain.js 60 8 20` (generations, pairs, trials). It only overwrites `brain_weights.js` when a held-out score improves. Re-run it after changing physics or the AI to keep the brain current.

## Local guests in online rooms
- In the room (host or joiner), choose **Add a local guest...** and have the guest press A on their own controller (Space on keyboard 1, Right Shift on keyboard 2). They get a cart, a name and a side (change it with ◀ ▶; A removes them). Up to 3 guests per machine. You keep every device nobody has claimed, so at least one must stay free.
- Guests share your connection: their inputs ride in the same `in` message (`g`), the host lists them in the roster with `own` set to your id, and `ClientSim` predicts each local cart. If you leave, your guests leave with you. Protocol version is now 2, so everyone should reload.

## Dead ball in the crease
- A ball nobody touches while it sits in a crease for 3 seconds (`CONFIG.creaseIdle.seconds`) is reset to centre with a "GOALIE RESET" notice.
- New defaults: ball stickiness 30, cart bounce 10%, ball friction 1.6 (players can still change them; browsers that already saved settings keep their old values until changed).

## Teams, bigger practice games and Season mode
- **15 teams** in `src/teams.js` (new ones were added at the end). Each has a three-letter `abbr` and a `rating` (about 55 to 90) that Season mode uses. Logos are generated SVGs in `assets/logos/`.
- **Practice** now allows up to 5 carts per side. The kickoff lines the field carts up across the court, the sin bin has room for everyone, and the CPU hands out extra roles when a team has more carts than roles.
- **Season** (Main menu > Season; rules and data in `src/season.js`, screens in `src/scenes_season.js`): pick your team, CPU skill, game length (2 to 15 minute periods) and a single or double round robin. Everybody plays everybody, one matchday at a time. For your game you can play it (friends join your team in the lobby) or simulate it. Every other game is simulated from the team ratings. Wins are 2 points, an overtime loss 1. The top 8 play off (quarterfinals and semifinals are best of 3, the **Volt Hockey World Cup** final best of 5; change `CONFIG.season.series`). Standings, your games, a bracket, a trophy screen and a hall of fame are included. The season saves itself in the browser, so you can leave and continue, and after the final you can start the next season (ratings drift a little each year).
- In games you play, each CPU team plays one skill step above or below your chosen CPU skill depending on whether it is a top or bottom team.
- Overtime is sudden death for 3 minutes (`CONFIG.match.overtimeSeconds`). If nobody scores, the team with more shots on net wins, and a coin toss decides it if shots are level.

## NHL-style view
- The rink is now **vertical** (goals top and bottom) and the camera **follows the puck**, with a little look-ahead so you see where it is going. Stick up = toward the top of the screen.
- If one of your local carts (you or a local guest) leaves the camera's view, an **arrow in that player's colour** sits on the screen edge pointing to them, and disappears once they are back on screen under their own steam.
- Settings > Touch and screen: **Rink view** (upright / sideways), **Camera zoom** (Auto fills the screen with the rink width; or pick your own) and the commentary switches. Tuning lives in `CONFIG.camera`.
- Online clients convert the stick the same way for prediction, so host and client agree.

## Commentary
Recorded play-by-play with two voices: an excited play-by-play caller and a calmer British colour commentator. Each call is a chain of short recorded clips (wording, a team name, a number), so it is real speech, not the browser's robot voice. There are roughly 250 lines across about 30 situations: the opening face-off, shots, saves, goals (first goal, equalizer, go-ahead, extending the lead, a goal back, hat tricks, late goals, own goals), big hits, penalties, rushes, steals, corner scrums, goalie resets, frozen pucks, period ends, switching ends, the last minute and ten seconds, overtime and the final result. Lines are dealt out shuffled and recent ones are skipped, so you should not hear the same call twice in a row. Players are called by team and cart number ("Volts number two"); captions show their names. Settings > **Commentary**: Voice and captions / Captions only / Off, a volume slider, and buttons to hear each commentator. If the clips cannot be loaded the browser's own voice is used instead.

The clips in `assets/commentary/` are made offline with the Kokoro neural voice: `node tools/dump_commentary.js > clips.json`, then `python3 tools/make_commentary.py clips.json MODEL.onnx VOICES.bin` (see the notes at the top of that file). Edit the lines in `src/commentary.js` and re-run it to record the new ones.

## Camera
Settings > **Camera** has its own page with a live picture of the game behind the options, so you can see what each choice does:
- **View**: Upright and follows the puck (NHL), Sideways and follows the puck, or the Whole rink (the original view).
- **Zoom**: 70% to 150% (100% = the width of the rink nearly fills the screen).
- **Tilt**: 0 to 60 degrees. It leans the upright view back so you look down the court in perspective. Sideways and Whole rink are never tilted. Needs WebGL.
Changing these from the pause menu applies as soon as you go back to the match. The stick always moves the cart the way it appears to move on the screen, whatever the view or tilt. After half time the teams switch ends and the view turns round with them.

## Frozen pucks
If the ball sits still for 5 seconds anywhere (behind a net, jammed in a corner) it is whistled dead and dropped at the nearest face-off spot.

## CPU levels
The ladder is now Easy, Normal, Hard, Pro, Superstar and **Legend**. Normal and Hard are sharper than before, and Normal, Hard and above use the self-play-tuned tactics.

## Switching carts
Press switch (Y / the switch button) to take the free cart nearest the ball. Keep tapping within 2 seconds to walk outward through the rest of the team, goalie included, and back to the cart you started on. Pause for a moment and the next press starts from the ball again.

## Player names in commentary
The play-by-play announcer says the scorer's/passer's name (~210 recorded names, `tools/make_commentary.py`); other names fall back to "Team number N". Colour-commentator lines use team/number.

## Online rules
Rules are editable by the host only and synced live to all clients (`rules` message in `src/net.js`).

## Exit guard
Backing out to the menu mid-game is guarded against updating destroyed objects.

## Arena: court materials, crowd, carts
- **Court material** (Settings > Camera, with the live preview): Hardwood, Blue sport court, Polished concrete, Ice white, Green turf. Add your own in `CONFIG.surfaces` (`src/config.js`) and a drawing branch in `drawSurface` (`src/scenes.js`).
- **Crowd** (`src/crowd.js`, on/off in Settings > Camera; volume in Settings > Sound): bleachers along both long sides. About 500 fans, each with their own shirt, skin, hair, energy and reaction delay, different every match. They cheer, groan, boo, clap, do the wave, hold up signs (#INCLUSIVESPORTS, SPORTS FOR ALL, GO <team>...), sometimes take their jerseys off to show the team name painted on their chests, and beer / hot-dog vendors walk the aisle now and then. They react to goals, shots (rise, then fall if it misses), steals, penalties and full time. A team piling on while the other side is a cart short gets booed.
- **Crowd sound** is synthesised (`Sound.crowd` in `src/audio.js`): a murmur that follows the excitement, roars, applause, "ooh" / "aww", boos. No audio files.
- **Carts** are drawn with drive wheels, casters, a team-coloured shell, footplate, joystick and a seated player (varied skin and hair).
- **Full time** shows a result panel (winner, score, shots, shooting %, penalties) before any button counts.
- **Errors** show a small dismissible toast ("An error has occurred. Please check the console or report it to the admin") with Details / Copy.
- **Commentary clips** are no longer all fetched at start-up: a match fetches only its two teams, shirt numbers and the players' names, and the rest load the first time a call needs them.
