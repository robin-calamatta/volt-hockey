# Volt Hockey

Phaser 3 game with a Three.js 3D view, no build step. Serve the folder (`npx serve` or `python3 -m http.server`) and open `index.html`.
Phaser loads from a CDN; download `phaser.min.js` and change the first script tag to run offline. Three.js (r149) is bundled in `lib/three.min.js`.

## v14.3.0: online first, like Fortnite

- **A switch on the game card: 🌐 ONLINE or 🏠 THIS SCREEN.** It sits just above the selected game in the lobby. Tap it, or press ◀ ▶ on the PLAY tab. ONLINE is the default, and the game remembers your choice.
- **ONLINE: PLAY goes straight into matchmaking.** There is no team screen and nothing to edit first. ▼ shows the online playlists:
  | Playlist | What it is | Players | Starts |
  | --- | --- | --- | --- |
  | **Volt Royale** | Public match, Solos to Fives (◀ ▶ on the search screen) | 32 (30 in Trios and Fives) | When it's full, when everyone presses START NOW, or after 5 minutes |
  | **Volt Hockey** | Quick match, 3 v 3 | 6 | When it's full, when everyone presses START NOW, or after 1 minute |
  | **Minigame Mix** | A different minigame each match | Up to 8 | Same as Volt Hockey |
  | **Private Room** | Make a room for friends (share its code), or join one | Up to 6 | When the host starts |

  CPUs fill every empty spot.
- **Your party and local players come with you.**
  - **Party:** the leader presses PLAY and the whole party queues as one group, taking as many spots as it has people. If someone else ends up hosting the match, your party still follows you into it.
  - **Local players** on your screen come along too.
- **THIS SCREEN** keeps everything as before: Volt Hockey with team picking, Volt Royale, any minigame, seasons and practice, against the CPU or with players on your screen.
- **Not logged in?** PLAY on ONLINE offers to log you in, or you can switch to THIS SCREEN. The search screen also has a LOG IN / SIGN UP button, and joins the queue as soon as you're logged in.
- **Server:** `/mm/poll` takes `mode` (`br`, `hockey` or `mini`), `n` (spots your group needs) and `accts` (accounts in your group). Volt Royale keeps its old queues, so older versions still match with this one.
- **Tested:** two accounts queued online for each playlist and landed in the same match:
  - Volt Hockey: 3 v 3, one player on each side
  - Minigame Mix: Manhunt with 6 carts
  - Volt Royale: 32 carts

## v14.2.25: party guests in Volt Royale, and voice chat

- **A guest's screen shows their own cart.** On a guest's screen, Volt Royale picked "your" cart from the host's player list. So the hotbar came up empty, the crosshair was missing, and some panels followed the leader's cart instead. Now every part of the guest's screen uses the cart the host gave them:
  - the hotbar, crosshair and health
  - the bag, the map and the markers
  - the kill-feed colours and the result screen
- **Your messages and sounds are only yours.** Messages like "ROBIN: CHEST OPENED" and "OUT OF AMMO", and the pick-up sounds, used to go to everyone in the match. That is why guests saw everything the party leader picked up. Now each one only shows and plays on the screen of the player it happened to.
- **The stats line under the clock** only shows your own eliminations. It used to list everyone in the match.
- **Much less data for guests, so less lag.**
  - **Before:** a snapshot was 7 to 14 KB, 30 times a second. On a phone, or through a relay (TURN) server, guests fell behind. The host then skipped them, which caused the stutter.
  - **Now:** about 2 to 3 KB, still 30 times a second:
    - the carts' state goes whole twice a second, with only what changed in between
    - the loot goes in smaller pieces
    - picked-up items are named one by one, instead of the full 1,300-item list every few snapshots
    - doors only go when they change
  - Tested with two players online: the guest's loot matches the host's item for item.
- **Voice chat fixes.**
  - If a microphone can't be opened, you still hear everyone (listen-only), and a message says so.
  - Phones that block sound until you touch the screen now play voices after your next tap.
  - Calls that never connect are retried.
  - The relay (TURN) settings load before voice starts, so calls between a phone and a PC can get through.
  - **Note:** voice only connects when both accounts are 18+, or when the two players are friends.

## v14.2.24: more CPUs, and Fortnite-length storm stages

- **Bigger Volt Royale matches.**
  - **Public matches** have 32 spots (30 in Trios and Fives, so the teams come out even), and CPU carts fill whatever players don't.
  - **On this screen**, the Carts setting goes up to 24, 32 and 40, and new players start on 24.
  - Tested: a 40-cart game on a huge map runs at about 7 ms a game step on average, with peaks of 20 to 30 ms when a lot of CPUs land or plan routes at once.
- **The storm takes its time, like Fortnite.** There are seven stages now, with long waits and slow closes:

  | Stage | Waits | Closes over | Circle left |
  | --- | --- | --- | --- |
  | 1 | 2:30 | 2:00 | 62% of the map |
  | 2 | 1:50 | 1:30 | 42% |
  | 3 | 1:30 | 1:15 | 26% |
  | 4 | 1:10 | 1:00 | 13% |
  | 5 | 0:50 | 0:45 | 6% |
  | 6 | 0:35 | 0:35 | 2% |
  | 7 | 0:20 | 0:25 | nothing |

  That's about 16 minutes in all on the huge maps (it was about 5). The older, smaller maps scale the times down (to 40% at the least), so a small map isn't a long wait. The CPUs plan around the same stages, and the storm still hurts more each stage.

## v14.2.23: public match screen like Fortnite / Apex, matches as big as the carts

- **The matchmaking screen works like Fortnite's and Apex's:**
  - a MATCHMAKING timer counting up while you search;
  - players found as a number out of the match's spots (for example **2 / 20**), with a row of pips that light up as players are found;
  - no list of names;
  - how many have pressed START NOW, and when the match will start at the latest.
  - The buttons are START NOW and CANCEL.
- **A match takes as many players as it has spots:** 20 carts (18 in Trios). It starts the moment the queue fills it; CPU carts fill whatever is left. (It was 10.) Online rooms made by matchmaking now take up to 20 players; ordinary rooms keep their 6.
  - Every player's game is carried by the host's upload, so very full matches will lean on the host's connection.
- **Pressing START NOW always reaches the server.** Before, a press made while the game was already checking in could be lost until the next check-in two seconds later.
- **Server:** `/mm/poll` now returns counts (`count`, `ready`, `cap`) instead of names.

## v14.2.22: Volt Royale public matchmaking (the online way to play Volt Royale)

- **"Public match (find players online)" on the Volt Royale page.** Log in, pick **Solos, Duos, Trios, Squads (4) or Fives** with ◀ ▶, and you're queued with everyone else looking for that team size.
- **The queue screen** shows how many people are queued and who they are (✓ means they've pressed START), how long until the match starts, and how many have pressed START.
- **When a match starts:**
  - straight away, as soon as **everyone queued presses START** (for the early days: one or two people can just go);
  - otherwise **5 minutes after the first person queued**;
  - or as soon as **10 people** are queued (the host's connection carries everyone, so a match takes up to 10 people);
  - **CPU carts fill the rest:** 20 carts (18 in Trios).
  - People in the same match fill squads together (like Fortnite's "fill"); CPUs make up the rest of each squad.
- **How it works:** the first person queued hosts. Their game opens the room by itself and the server passes its code to everyone else, whose games join on their own. If the host never opens the room within 45 s, the others go back into the queue.
- Volt Royale is 16+: under-16 accounts are turned away by the server too.
- **Public matches are now the only way to play Volt Royale online:** "Host an online room" is gone from the Volt Royale page, and online rooms can no longer switch to Volt Royale. **"Play on this screen" is still there** for local Volt Royale with CPUs (and split screen).
- **Server:**
  - new routes `POST /api/mm/poll` (join, update, START, leave), `POST /api/mm/code` (the host posts the room code), `POST /api/mm/done` and `GET /api/mm/counts`;
  - stored under `mm/` in Blobs;
  - each match is kept under its own key, so two players checking in at the same moment can't lose it.

## v14.2.21: Tactical layout fixes, no door-bash hint, dropped guns fly out

- **With the Tactical controller layout, B is B again on the result screen.** B and R3 only swap while a match is being played. On the result screen (and every menu) the buttons are where they say, so HOLD B to leave really is B.
- **The door prompt only says "X: open the door"** (or "X: shut the door"). The bash part is gone, because which button bashes depends on your layout.
- "INVENTORY FULL" now says to open your bag to drop something, instead of naming a button.
- **In Volt Royale, things you drop fly out of your cart:** a gun or item you drop from the bag, the one you swap out for something on the ground, and ammo you drop. Each one arcs up, tumbles, lands about 1.5 m away beside you and a little behind, and bounces, like loot spilling from a chest. It never lands in a wall, or off the floor when you're upstairs, and it can't be grabbed mid-air. It works online too.

## v14.2.20: hold B to go back to the lobby after a game; touch result buttons fixed

- **After a game, press and hold B (about 0.8 s) to go back to the lobby** (or to the room when you're hosting online). A red bar fills while you hold. A quick tap does nothing, so you can't leave by accident.
  - If you were already holding B when the game ended (drifting at the whistle), let go first and then hold.
  - The hold is timed in real time, so a slow frame rate doesn't stretch it.
  - The "Back to the lobby" button on screen still works with one click or tap.
  - The result screens say **HOLD B**.
- **Fixed (from v14.2.17): the touch buttons on the result screen show AGAIN and HOLD: LOBBY again.** The line that labels them had been switched off by mistake.

## v14.2.19: the scoreboard makes room for PRACTICE

- The two scores now move out to make room for the word in the middle. PRACTICE, GOLDEN GOAL and the minigames' longer clocks no longer run into the score numbers. With a normal clock (5:00) they stay where they were.

## v14.2.18: a right thumbstick for Volt Royale on touch screens; half turns in the corner in Volt Hockey

- **Volt Royale on a touch screen has an aim stick on the right.** Push it up or down to tilt your gun, and left or right to aim and look to the side. While your thumb is on it you **aim down the sights**, like holding LT. Let go and the view swings back to straight ahead, just as with a gamepad's right stick.
  - It replaces the AIM, AIM UP and AIM DOWN buttons.
  - DRIFT (B) moved up so it no longer sits on the hotbar.
- **Volt Hockey on a touch screen: the half turns are nearest the bottom-right corner**, with the bigger 90° TURN buttons further in.
- Both are each game's starting spots. If you've moved a button yourself in the layout editor, it stays where you put it.

## v14.2.17: touch controls tested in every game, and fixed

**Every game was run on a phone-sized touch screen** (all 19 games: Volt Hockey, the minigames and Volt Royale). For each one: set it up and start it with only the touch buttons, drive with the stick, press every button, open the pause menu and close it again. There were no errors and no buttons overlapping.

**Fixed:**
- **Moving your buttons no longer reaches the menu behind.** While you're moving the touch buttons, the screen is dimmed and taps can't reach the menu underneath. Before, you could turn off touch controls by accident.
- **Turning touch controls off and on again keeps you the same player.** Before, the game made a brand-new touch controller, so pressing START joined you a second time as player 2.
- **Volt Hockey has the half-turn buttons back.** The two big buttons are now **90° TURN** (like RT and LT) and the two small ones are **HALF** turns (like RB and LB). Before, the big buttons did half turns and there were no 90° turns at all.
- **Button names are easier to read:** bigger, bold, white on a dark tag.
- **On the Controllers screen, a touch player joins straight onto a team.** Tap A and you're on the team with room (◀ ▶ still moves you). Pressing START before joining puts you on a team and starts the game. Before, A put you in "Not playing", and START with nobody joined started a CPU-only match.
- **START plays straight away in every minigame's setup**, so you don't have to scroll down to "Play on this screen".
- **Volt Royale gets a PING button** (next to the bag). The **MAP** button moved below the emote button, so it no longer covers GRAB.
- **When a match is over, only AGAIN, LOBBY and pause are shown**, so the game buttons don't cover the results.

## v14.2.16: menu buttons for phones and tablets

- **Every menu now has controller buttons on touch screens.** A small D-pad sits bottom left, and A (OK), B (BACK), X, Y and START sit bottom right. Before, on a phone there was no way to join, choose a side or start the game on the team and controller screens.
  - They work exactly like a controller's buttons: A joins on the Controllers screen, ◀ ▶ moves you to a team, START starts the game. They also work in the game settings, the minigame and Volt Royale setup, the pause menu, online rooms and so on.
  - They show whenever the touch controls are on and you're not in a match. In a match, the full on-screen controller takes over as before.
  - They're hidden on the home screen and the title screen, which are already made for tapping.
- Tested on a phone-sized screen: picked both teams, joined, moved to a side and started a match using only these buttons.

## v14.2.15: 90-degree turns on the triggers in Volt Hockey

- **RT and LT turn your cart 90 degrees again** (clockwise and counter-clockwise) in normal and season matches of Volt Hockey, the quick slap-shot turn. This works online too. RB and LB still do the half turn (45 degrees).
- The triggers in the minigames and Volt Royale are unchanged (use / fire, aim). On a keyboard the turns are E and Q.
- The help page lists both.

## v14.2.14: smoother online Volt Royale for guests

- **About a third of the data per guest.** In Volt Royale the host now sends 30 updates a second instead of 60. The guest's game already smooths between updates (it shows the game 100 ms behind and blends between updates), so movement stays smooth. The door lists (three lists of 400+ numbers) are only sent when a door changes, and every 10th update anyway. Per guest this is roughly 2.5 Mbit/s instead of about 8. Volt Hockey and the other modes still send 60 a second, unchanged.
- **A slow connection no longer snowballs.** Updates are sent in order and can't be dropped, so when a guest's connection couldn't keep up they queued behind each other. The guest's game fell further and further behind (stutter, an inventory that didn't match what they really had) until the connection gave up and dropped them. Now, when a guest still has more than 64 KB waiting to go out, that update is skipped for them, and its sounds and calls are added to their next one.
- **No more drops at kick-off.** The "we haven't heard from you" timer now starts when the match starts, so time waiting in the room no longer counts. For the first 20 s of a match both sides wait 4 times as long (24 s) before deciding the other side is gone, because building a huge map can freeze a slower device for a few seconds.
- Both sides need this version.

## v14.2.13: online Volt Royale no longer drops everyone, no second ready-up, hand over the party, usernames locked, team rings

- **Fixed: friends were booted the moment an online Volt Royale started.**
  - **The cause:** on the huge maps the loot list (about 1,400 items, 50 KB) went out whole in one message. The connection refuses messages over roughly 16 KB ("message-too-big") and closed, dropping every guest. Snapshots with a lot of carts got close to that limit too.
  - **Messages are split up:** any message over 12 KB now goes in pieces and is put back together at the other end (src/net.js). Both sides need this version.
  - **The loot goes a bit at a time** (src/brnet.js):
    - each snapshot carries 80 items, and the whole list comes round about every 18 snapshots;
    - anything new or changed (drops, opened chests) goes at once;
    - every 4th snapshot carries which items still exist.
  - **Tested:** two players on the 760 x 520 map stayed in the game, and the guest saw all the host's loot.
  - The connection now logs why it closed (`[net] connection error: ...`) in the console.
- **No second ready-up.** Party members who readied up in the lobby are marked ready in the room automatically.
- **Hand the party to someone else.** As party leader, pick a member in the lobby (their profile: **Make them party leader**) or in the friends window (**Make leader**). They open a new party, everyone else moves into it automatically, and you join it as a member.
- **Logged-in players can't change their name.** It's always your username: in the lobby, Settings, the team pick screens and online rooms. The host can't rename a logged-in player either. Players who aren't logged in (and local guests) can still pick a name.
- **You can see who's on your team in Volt Hockey.** A ring in your team's colour sits on the floor under each team-mate, with a yellow one under you, in 3D and in the top-down view. Opponents have none.

## v14.2.12: fixes for crashes in the online room and the lobby, party ready-up, controller focus

- **Fixed: "Something broke in RoomScene.update ... Cannot read properties of null (reading 'cut')"**, which booted players when the host started a game.
  - The online room keeps its HOST / READY / NOT READY labels between visits. The second time you were in a room, it tried to change labels that had already been destroyed with the last visit, and the room crashed.
  - It now makes fresh labels when the old ones are gone.
  - The same fix applies to the ready markers on the party in the lobby. That was the second error: "Something broke in LobbyHomeScene.update ... reading 'glTexture'", hundreds of times, back in the lobby after a game.
- **Party members no longer get "your party leader picks the game" over and over.**
  - The leader repeats its pick every few seconds, so a member always knows the game and can ready up. Hearing the same pick again keeps your READY.
  - The message itself has no buttons any more. Its Leave party / OK buttons could take the controller's focus away from READY UP.
  - A message that's already on screen isn't shown again, and the same goes for every pop-up message.
- **A pop-up left behind no longer freezes the controller.** If a pop-up vanished without closing (for example after an error), every button on the screen under it stayed blocked until you changed screens. Pop-ups that are gone, or hidden for a second, are now dropped.

## v14.2.11: your place when you lose, a cheeky kill feed, gentler snipers, one item per press, no random lobby emotes

- **Losing in Volt Royale shows your place, not VICTORY.** While the winners party, your screen says **YOU PLACED #N** (your team's finishing place), with "<WINNER> WINS THIS ONE. Better luck next drop!" underneath.
  - The confetti, fireworks, cheer and flash are only for the winners.
- **Kill feed down the left side**, with the newest line at the top.
  - Each knock-down and elimination gets a cheeky line for how it happened, with a few lines for each kind:
    - Rockets: "ROBIN was splatted by DEVON", "DEVON sent ROBIN to the moon".
    - Sniper, shotgun, SMG, rifle, pistol and melee each have their own.
    - The storm: "ROBIN forgot the storm was purple".
    - Falls: "ROBIN tested gravity. Gravity won".
    - Bleeding out, and blowing yourself up with your own rocket.
    - Knock-downs: "DEVON put ROBIN on the floor".
  - Headshots say (HEADSHOT!).
  - Lines are green when your team got the kill and red when your team was hit. They fade after 7 s.
  - It replaces the old feed under the minimap.
- **Snipers hit a bit less hard, and rarer ones hit harder.**

  | Rarity | Body shot | Headshot |
  | --- | --- | --- |
  | Uncommon | 52 | 65 |
  | Rare | 60 | 75 |
  | Epic | 69 | 86 |
  | Legendary | 78 | 98 |

  The headshot bonus for snipers is now x1.25 (it was x2), so even a legendary never takes a full-health cart out in one shot. The bag shows each gun's real damage for its rarity.
- **Items need a press each time.** Holding the use button keeps firing a gun. A heal, shield drink, boost or wall is used once, and you let go and press again for the next one.
- **No random emotes in the lobby.** Your character used to do a random action from your wheel every 9 to 15 seconds. Now it only emotes when you do, or when you try an action on in the Locker.

## v14.2.10: one third-person camera for every game; Light Trails barriers always show

- **Third person works the same in every game as in Volt Royale.** The old third-person camera is gone.
  - The camera sits behind and above your cart, looks ahead of it, and has the same wide field of view.
  - It moves in closer when a wall is behind you (the Manhunt, Capture the Flag and King of the Hill arenas).
  - It uses the same distance setting, now called **Third-person camera distance** (Settings > Controls and screen; 2.75 m by default, 1.5 to 6 m).
- **Light Trails barriers are always visible.** The 3D barriers were built once and kept. When a new game started on a different map, you saw the old map's barriers (or none) while the new ones still crashed you.
  - The barriers are now rebuilt whenever the map changes.
  - They're taller (1.4 m) and more solid.
  - They also show on the minimap and on the map preview in the game's options.
- The same rebuild-on-map-change fix applies to the Manhunt, Capture the Flag and King of the Hill arena walls. Manhunt's walls also show on the minimap.

## v14.2.9: Volt Royale third-person camera closer, and adjustable

- The third-person camera in Volt Royale now starts closer: 2.75 m behind your cart and about 1.75 m up (it was 4.35 m in v14.2.8).
- **You can set the distance yourself:** go to Settings > Controls and screen > **Volt Royale third-person distance**, from 1.5 m to 6 m in 0.25 m steps. The camera's height goes up with the distance. It's saved with your other settings.

## v14.2.8: Volt Royale third-person camera a bit closer

- The third-person camera in Volt Royale is now two thirds as far away as in v14.2.6: about 4.35 m behind you and 2.3 m up, instead of 6.5 m and 3.4 m. It keeps the wide field of view and still looks well ahead.

## v14.2.7: drive under ramps in Volt Royale

- **You can drive under the open ramps.** From the ground, only the low end of a ramp is solid: the part from its foot to about 60% of the way up, where the deck is too low to fit under. Past that, the deck is high enough (about 1.35 m) for a cart to drive straight underneath, from either side.
  - You still drive onto a ramp at its foot as before. Driving under a ramp never pops you up onto it.
  - Jumping or falling beside a ramp only bumps you off it if your head would actually hit the deck.
- The CPUs still go round ramps rather than under them.

## v14.2.6: smoother Volt Royale, Manhunt walls you can see, a Tactical controller layout, a further-back camera

- **Volt Royale is much smoother.** One step of the game takes about a third of the time it did (about 13 ms down to 4 to 6 ms with 24 carts on the huge maps). The big stutters are gone too, when the storm moves and at the start of the game.
  - **At the start of the game:** the CPU's route map used to be built mid-drop, the moment the first CPU landed, which froze the game for about 0.15 s. It's now built while the match loads.
  - **When the storm moves:** every CPU used to plan a new route in the same moment. A CPU that was chasing someone also re-planned every time its target moved a metre, and one that found no route tried again every step. Now only one CPU plans per step, they re-plan only when their goal has really moved, and the search is several times faster.
  - **Smaller fixes:** walls, trees, doors, floors and loot are kept in grids, so each check only looks at what's nearby (picking up loot, bullets, landing, doors, look-to-pick-up). The map in the bag is drawn once instead of every frame.
  - **CPUs stuck on a roof:** a CPU that can't find a way down may now drive off the edge.
- **Manhunt's walls are drawn.** The arenas' walls were never drawn (Manhunt has no game mode of its own, so the drawing code skipped it). You bumped into invisible walls on what looked like the open rink, and it seemed like there was only one map. They now show in 3D and in the top-down view.
- **Four more Manhunt arenas**, twelve in all:
  - **Crossroads:** four blocks with a spinner in the middle.
  - **The Spiral:** a square spiral of walls.
  - **The Islands:** crates and sandbags with no walls.
  - **The Bunker:** rooms off a corridor, with sliding blast doors.
- **Tactical controller layout:** go to Settings > Controls and screen > Controller layout. In a match, B and R3 (clicking in the right stick) swap places. Menus keep B as back.
- **Volt Royale third person is further back:** the camera sits about 6.5 m behind and 3.4 m up, looks 9 m ahead, and has a wider field of view (at least 80°). It comes in closer when a wall or tree is behind you, and stays under the floor above you indoors.
- **Admin switch for third person in Volt Royale:** a new **Game** tab in admin.html has a "Third person in Volt Royale" checkbox. When it's off, everyone plays Volt Royale in first person (third person and broadcast aren't offered). The game checks it at every match start.
  - **Server:** `GET /api/game` is public. `GET` and `POST /api/admin/game` need the admin login. It's stored under `cfg/game` and defaults to on.

## v14.2.5: fat shield jug, rarity colours in the bag, see which cart is you

- **The SHIELD JUG is now a fat, squat jug** with a white carry handle, in a darker blue than the small SHIELD SIP bottle. Its icon is much wider and says BIG, so you can tell the two apart on the ground, in the bag and on the hotbar.
- **Guns in the inventory show their rarity colour:** the slot is tinted, with a coloured bar along the bottom (green uncommon, blue rare, purple epic, orange legendary). The gun's description line is in the same colour.
- **More room in the inventory:** the panel is taller, and the description line sits under the slots with clear space before the ammo row.
- **You can always tell which cart is yours in the top-down (2D) view:** a pulsing ring sits under your own cart (yellow for player 1, then cyan, pink and green for players 2 to 4 on the same screen). Your name always shows over it, in every minigame, including Light Trails. In the broadcast camera, your name also shows over your cart.

## v14.2.4: controller fixes for the map and the friends bar

- **Select (View) opens the Volt Royale map**, and pressing it again closes it. It no longer also opens the friends bar.
- **You can always leave the map with a controller:** B, Select or Start closes it. Start also opens the pause menu. Before, the map could only be closed the first time it was opened in a match.
- **The friends bar has no button of its own any more**, in a match or in the main menu. Open it from **Friends and party** in the Start / pause menu during a match, or in the main menu (Start on a controller). The menu item shows how many new messages and invites you have, for example "Friends and party (2 new)". The ` key still opens it on a keyboard.
- The help page now says where to find friends and party, and that Select opens the map.

## v14.2.3: massive maps with named places, a full map, CPUs beat the storm
- **Both Volt Royale maps are massive now: 760 x 520 m**, each with **twenty named places**:
  - **Volt Valley:** Volt City, Old Town, The Mines, Harbor Point, Steelworks, Volt Arena, Mount Ember, Maple Grove, Skyfield, Castle Hill, Sunny Acres, Bunker Hill, Dust Canyon, Last Chance Stop, Wildwood, Timber Mill, Crystal Caves, Red Mesas, The Hidden Lab and Thrill Park.
  - **Frostfall Wilds:** Frost Peak, Glacier Caves, Pine Mill, Winterhold, Snowdrift, Frostfall Fair, Copper Mesas, Red Gulch, Black Site, Ice Harbor, Deepwood, Meadow Farm, Frostfall City, Northfield, Junction Nine, Iron Mines, Ash Mountain, Fort Hollow, Frostfall Arena and Old Factory.
  - Each place's **name floats in the sky** over it (fading out when you're right underneath), and a banner shows the name when you drive in.
- **The full map:** the 🗺 MAP button (top right), **M** on the keyboard, or the controller's **View / Back** button.
  - It shows every place with its name, the biomes, buildings and roads, the storm and the next safe circle, rez garages and pings.
  - It also shows **where you and your squad are right now**: arrows that point the way you're facing, with names. A downed team-mate gets a red ring.
  - Click or tap the map to ping a spot. Close it with M, B, Back or ✕.
- **CPUs put the storm first:**
  - While the storm waits, they work out the part of the circle that's safe wherever the next circle lands, and head there in good time. They allow for roads not being straight, with up to 30 seconds to spare.
  - Once it moves, they go well inside the final circle and keep ahead of the edge.
  - Close to the storm, or inside it, they drop everything: no looting, no fights, no healing, no revives.
  - A CPU that's driving but not moving (nosed into a wall, stuck on a ramp or a roof edge) now backs off at an angle and finds a new way.
  - In test games on these maps, storm eliminations dropped from 5-7 a game to about 1.
- **Smoother:**
  - CPUs skip far-away loot before checking it.
  - The path-finder can search further on the massive maps.
  - Loot is drawn within 50 m (was 70).

## v14.2.2: bigger maps with biomes, smoother, fewer trees and rez garages, shield drinks, look to pick up
- **Volt Royale maps are bigger: 580 x 380 m**, fifteen places to land on each:
  - Two new places on both maps: **the Farmstead** (a barn with a hay loft, silos, fields) and **the Truck Stop** (a gas canopy you can drive on, a diner, a garage).
  - **Biomes:**
    - Volt Valley: city, badlands, coast, volcanic ash, forest, farmland and desert.
    - Frostfall Wilds: a snowfield along the north, forest, red desert, farmland and grassland.
    - The ground changes with the biome. Trees grow by biome too: thick in forests, a few on grassland and farmland, pale pines in the snow, cacti instead in the desert.
  - **Far fewer trees** (about 950 down to 180-320 per map), and they're shorter, so the view from a first-floor roof is clear.
  - **Only 3-5 rez garages per map** (was 15-32).
  - **Every building looks different:** twelve wall styles (brick, stucco, teal and navy glass, sandstone, white clapboard, sage, terracotta, mustard, slate, plum...) and six roof colours, mixed through every town. Doors still work.
- **Smoother on big maps** (measured with 24 CPU carts):
  - Simulation time per frame went from about 57 ms to 13 ms. The path-finder no longer builds its search arrays from scratch every time, and walls are kept in an 8 m grid so only nearby ones are checked for collisions and line of sight.
  - Rendering: the world is drawn in 48 m tiles, so far-away parts are skipped, and the camera's view distance dropped from 420 m to 220 m (hidden in the haze).
  - Draw calls dropped from about 1,100 to 480 and triangles from 570,000-880,000 to 130,000-200,000, even on the bigger maps.
- **Shields are sports-drink bottles:** a small blue **SHIELD SIP** (+25, up to 50) and a big **SHIELD JUG** with a handle (+75), each with a white "volt" label and a lightning bolt.
- **Look at it to pick it up:** guns, items and chests have to be in front of your cart (roughly where you're looking), not just touching it. Ammo, and topping up a stack you already carry, still get picked up just by driving over them.
- **Touch screens:** the minigames row in the lobby's games menu has big ◀ ▶ buttons to page left and right.

## v14.2.1: Light Trails fixed, more maps, two huge Volt Royale maps
- **Light Trails:**
  - Hitting your own trail now crashes you. The game clock was rounded to 0 on every step, so your own trail never counted and trails never faded.
  - Trails no longer have gaps (those were the bits that "didn't draw").
  - You crash a little sooner: the hit distance is now about the cart's own size.
- **Light Trails maps:** The Grid, Four Pillars, The Cross, Grand Grid (huge, 60 x 34 m), Islands, Corridors, The Box and Diamond, or Random. On these maps the glowing pink barriers are deadly too.
- **Manhunt maps:** eight arenas plus the open rink, or Random:
  - The Hedge Maze, The Warehouse (with a sliding door), Pillar Park, The Ring Road, Twin Rooms, Zigzag Alley, Spinner City and The Fort.
  - Carts bump off the walls, the CPU finds its way round them, and nobody starts inside a wall.
- **Volt Royale is now two huge maps** (440 x 330 m each; the older maps are still in the code but not in the menu):
  - **Volt Valley:** Volt City, Downtown, the Port, the Suburbs, Volt Arena, the Factory, the Airfield, the Canyon and Castle Hill, plus three new places:
    - **The Mines:** a mountain full of tunnels and caverns, with a summit on top.
    - **The Volcano:** three tiers up to a crater rim, with a lava tube underneath.
    - **Bunker Hill:** a bunker of rooms under a hill, with a pillbox on top.
  - **Frostfall Wilds:** Snow Peak, Thrill Park, the Jungle, the Canyon, Castle Hill, the Port, the Suburbs and Downtown, plus four new places:
    - **The Crystal Caves:** a cave maze under a two-tier mountain.
    - **The Sky Mesas:** mesas at four heights joined by bridges, with kickers.
    - **The Hidden Lab:** an underground lab with a helipad on top.
    - **The Lumber Camp.**
  - **Underground:** tunnels and rooms are carved out of the rock under a hill, with packed-dirt floors and lamps.
- **Volt Royale loot:** chests and items now sit mostly indoors and underground (anywhere with a roof over it). The open ground gets only a light sprinkle (about 8% of what it had).

## v14.2: smarter, self-trained CPUs whose levels really show
**Volt Hockey**
- **Loose-ball fix:** a ball resting just behind a net was off-limits to every CPU, because their keep-out box around the crease ran 0.8 m behind the net. In some games the ball sat there for minutes. The box now stops at the goal mouth. In test games, time with a dead ball nobody could reach dropped from about half the game to 1-3%.
- **Goalies:**
  - They stand on the shooter's angle (the line from the shooter to the middle of the net) and lean to where the shooter's cup is pointing.
  - They sweep a slow ball out of the crease or off a post towards the boards.
  - With the ball, they pass it out or clear it up the boards at once, and they never wander more than a few metres from the net.
  - How fast a goalie reacts follows its level: an Easy goalie reacts about a third of a second late, a Legend almost instantly.
- **Screens:**
  - When a team-mate carries the ball under pressure, another cart parks in the path of the defender who would reach the carrier first, a real pick.
  - When a shot is coming, the cart in front of the net stands beside the goalie on the far side so it can't slide across, and the shooter aims for that side.
- **No retreat:** a carrier under pressure in its own end bumps the ball up the boards or passes instead of driving back at its own net.
- **Self-play training:**
  - The tactics numbers were re-tuned over 14 generations of headless CPU-vs-CPU games (`tools/tune.js`, now with the goalie, screen and crease knobs).
  - The finishing network was retrained in attack drills (`tools/train_brain.js`): goals in the drills doubled (3 of 32 to 6 of 32).
  - In 20 games at Hard, the new AI beat the old one 8 wins to 4.
- **Levels** (3-on-3, 3-minute CPU games, `node tools/eval_hockey.js A B games minutes`):
  - Normal beat Easy 8-0 (2 draws); Legend beat Easy 7-0 and Superstar 4-0.
  - Legend vs Normal: 11-8 over 34 games, with more goals for Legend.
  - Hard, Pro and Superstar are close to each other. The higher one has the edge in reactions and shooting, but games between them are tight.

**Volt Royale**
- **Storm:**
  - CPUs work out how long they need to reach the next safe circle and leave in time.
  - Caught in the storm, they stop fighting, don't stop to heal or start a revive, and drive out (shooting only at what's straight ahead).
  - They never regroup or go to help somewhere the storm is about to reach.
- **Teamwork:** squads stay together, come to help a team-mate under fire, focus the enemy the team is already shooting, and ping what they see.
- **Aim and reactions** follow the level.
- **Results:** in 8 test games each, storm damage per game more than halved (585 to 270), storm eliminations fell from 3.3 to 2.1 per game, and squad-mates stayed about 17 m apart instead of 37 m.

**Minigames**
- Every level now has its own top speed, steering wobble and reaction time. Before, most minigame CPUs drove flat out whatever the level.
- Legend vs Easy, CPUs only: Legend won every test game of Race, Slalom, Stunt, Bowling, Paintball, Imposter and Multiball, and most of Bomb, Hill, Sumo, Lava, Giant, Light Trails and Delivery.
- **Slalom:** a precise CPU used to circle the last gate forever. It now drives straight through each gate.
- **Balloon Bash:** better drivers spot a cart coming for their balloons sooner.
- **Capture the Flag:**
  - The attacker nearest the enemy flag goes for it while the others block the defenders.
  - The carrier swerves round taggers.
  - Carrying the flag now slows you by 5% (was 12%). Before, almost every carrier was caught, so CPU games ended 0-0.
- Infection Night, Manhunt and Balloon Bash are still close between levels.

## v14.1.9: Light Trails replaces mini golf
- **Mini golf is gone** from every menu: the games list, the lobby's games menu, the online room and the party picker. If it was your selected game, you get Light Trails instead.
- **New minigame: Light Trails** (party, free for all, 2-8 carts):
  - Every cart lays a glowing wall of light in its own colour. Touch any trail, even your own older one, and you crash out of the round.
  - You can't stop: let go of the stick and you keep rolling straight on.
  - Every few seconds each trail has a short gap you can squeeze through. Spin to snap round a tight corner, and cut across people to trap them.
  - Trails fade after a while; options: Short, Medium, Long or Endless.
  - **Sudden death:** after 40 seconds the trails stop fading. If two or more carts are still going 45 seconds after that, nobody wins the round.
  - Last cart driving wins the round, and the most rounds wins (3, 5 or 7). Ties are broken by how many people you trapped.
  - The CPU drivers look ahead for open space and try to cut you off.
  - Works in 3D and 2D, and online (the host decides who crashed).

## v14.1.8: ammo that looks like its ammo, no flickering roofs
- **Volt Royale ammo pickups now look like the rounds they hold:**
  - **Light ammo** (pistol, SMG): an open box of short round-nosed rounds.
  - **Shells** (shotgun): red shotgun shells with brass heads.
  - **Medium ammo** (rifle): pointed rifle rounds in a stripper clip.
  - **Heavy ammo** (sniper): three big, long black-tipped rounds on an ammo can.
  - **Rockets** are unchanged.
- The bag screen shows a matching picture above each ammo count instead of a coloured dot.
- **No more flickering roofs.** Driving over a roof, the colours used to flicker back and forth. That happened where the top of a wall was level with the roof, and where two roof decks overlapped on the same level. Wall tops now stop just under the roof, and overlapping decks sit a hair apart.

## v14.1.7: legal agreements, seizure and content warnings
- **First-run agreement.** Before anyone can play, a "Before you play" screen shows the photosensitive seizure warning, a cartoon-violence and online-interactions notice, the real-age rule and a copyright note. Players open and read the full documents from there, tick two boxes (agree to the EULA, Terms and Privacy Notice; read the health and content warnings) and press Agree and continue. There's no way past it without agreeing. It works with mouse, touch, keyboard and controller. When `LEGAL.version` changes, everyone is asked again.
- **Documents** (`src/legal.js`): End User Licence Agreement and Terms of Use (licence, accounts, false-age misrepresentation, conduct, user content, health, content, ownership and your own music files, virtual items, warranty disclaimer, limitation of liability, indemnity, termination, Ontario governing law), Privacy Notice, Health and Safety Warning, Content Notice, Copyright and Trademark Notice (with how to report infringement).
- **Sign-up** needs one more tick: "the age above is my real age, and I agree to the EULA and Privacy Notice". The server refuses a sign-up without it and stores the version and time on the account.
- **Settings ▸ Legal and agreements**: read any document again, see which version you agreed to and when, or go through the agreement again.
- **Title screen:** a warning line at the top (seizures, cartoon violence, online interactions not rated) and a copyright and no-affiliation line at the bottom.
- **Before going public:** set `LEGAL.owner` (your legal name or company) and `LEGAL.contact` (an email for legal, privacy and copyright notices) at the top of `src/legal.js`, and have a lawyer review the text.

## v14.1.5 + v14.1.6: real emote sounds, no speed modes, no bleeding while you're being picked up, controller friends sidebar, the jet leaves
- **Emote sounds:** every emote now has its own sound that matches what it does, and no two are the same. They're played on synthesised instruments (plucked and distorted guitar, piano, electric piano, brass, strings, flute, marimba, bells, organ, accordion, drums) and sound effects (claps, applause, crowds, splashes, whooshes, whistles, zaps), with a little room reverb. For example: Clap claps, Drum Roll rolls into a cymbal, Salute plays a bugle call, Time Out blows a referee's whistle, Swim splashes, Air Bike rings its bell, Robot Arms whirr and beep, Take a Bow gets applause, Air Guitar is a rock riff. Every tune is original. These replace the 8-bit emote jingles.
- **No more cart speed modes.** Every cart always runs at full speed. Gone: the D-pad ◀ ▶ / C V / ; ' speed buttons, the SPEED meter, the speed ring round your cart, the touch SPEED + / − buttons, "Starting cart speed" and the host's "Max cart speed" lock in every menu. Old saves can't turn it down. In Volt Royale, D-pad ◀ / C still pings.
- **Volt Royale: no bleeding out while you're being revived** by team-mates, or while you're getting yourself back up in a rez garage. The storm, gunfire and anything else that hurts still hurts.
- **Volt Royale: an enemy's rez card is invisible to you.** Only their team-mates see it (eliminated carts were already hidden).
- **Volt Royale: the drop jet flies off and disappears** once everyone has jumped (it used to hang at the end of its route for the whole match).
- **Friends sidebar with a controller:** ▲ ▼ now go row by row and ◀ ▶ along a row, so you can reach the party's ＋ invite slots, every friend's ＋ Party button and everything else. Pressing A on a lobby ＋INVITE slot opens the sidebar on the first online friend's ＋ Party button.

## v14.1: the lobby runs everything, grind rails, the XP showcase, more music
- **The lobby is the centre of every pre-game menu.**
  - The live lobby (you and your party on the stage) stays visible behind minigame options, team picking, settings and the online room.
  - Your selected game sits in the bottom left with how many of you are playing (solo, duos, trios, squads). PLAY is in the bottom right.
  - **▼ slides the games menu up from the bottom**: the modes along the top row and every minigame along the second. Pick a minigame there and PLAY goes straight in. Team games show their team screen first. X opens the game's options.
- **Ready up before the game loads.**
  - In a party, the leader picks the game and everyone else presses A to ready up. Pick a different game and everyone readies up again.
  - Ticks over everyone's heads show who's ready. When everyone is, the leader's PLAY goes straight in; pressing it twice goes without whoever isn't ready. The room fills with the party and starts by itself.
  - In an online room, guests press A to ready up, and the host's START waits for everyone (press it again to go anyway). Changing the game resets everyone's ready.
  - There's no more READY UP screen inside the game.
- **Open spots on the stage:** every empty spot in your party shows a ＋ INVITE. Click it (or on a controller press ▲ past your party to highlight it, then A) and the **friends sidebar** slides in from the right.
  - The sidebar shows your party's five spots (who's ready), every friend with their status and whether they're online, and invite, join, message and party buttons.
- **XP showcase:** after every game, the XP you earned comes up line by line: played, time, eliminations, goals, the win, finished quests. Each number fizzes up in sparks, the total counts up, the level bar fills, and levelling up bursts. Any button or a tap skips it.
- **Volt Royale:**
  - Picking up a gun now fills an open slot first. You only swap when your bag is full.
  - **The drop:** every game starts with everyone on the **Volt Jet**, flying across the map.
    - Press A to jump out where you want to land. Your parachute opens and you steer it with the stick as you glide down.
    - The parachute goes away when you land, and the landing never hurts.
    - Your CPU team-mates jump with you. Anyone still on board at the far side gets thrown out, and the storm waits until the jet has gone.
    - Your camera pulls back behind you while you're on the jet or under the parachute.
  - **Pings:** d-pad ◀ (C on the keyboard) pings what you're facing: an enemy (red, follows them for a few seconds), loot (gold, says what it is) or a spot (blue, "go here").
    - Ping twice quickly for **DANGER**.
    - Click the map in your bag to ping a spot there.
    - Pings show for your squad in the world, on screen (with who pinged and how far), on the minimap and on the bag map. They're see-through, fainter near your crosshair, and fade out after a few seconds.
    - A ping makes a double blip; enemy and danger pings sound an alert.
    - The minimap also shows the jet's flight path.
    - There's no on-screen touch button for pinging yet.
  - **Grind rails:** drive (or jump) onto a rail where it comes down low and you lock on and slide along it, up and down the hills. X hops off; at the end you're thrown forwards. Leaving a rail never hurts you.
  - New huge maps:
    - **Volt Zoo:** a safari with giraffes, elephants and zebras, a penguin cove, a monkey tree house, big cats, an aquarium, and the zoo train rail all the way round.
    - **Volt Land:** a theme park with the Mega Coaster rail right round the park, the Wild Mouse, a giant Ferris wheel, a carousel, a castle, a drop tower, a haunted house maze and bumper cars.
    - **Volt World:** the biggest map of all, 486 × 320 m.
  - Up to **40 carts** a game.
- **Mini Golf has 12 holes** (eight new: The Island, Zig Zag, The Gauntlet, Hairpin, Corner Pocket, The Funnel, Bank Shot and The Maze). Holes per game: 3, 6 (the default), 9 or 12.
- **First person follows you into the air:** off any jump, kicker, stunt ramp or race jump, the first-person camera rises and falls with your cart and tips with its nose.
- **Map preview:** in a game's options, highlighting the Map, Track or Course row shows a top-down plan of that map beside the menu (or all the choices side by side for Random), for minigames, races and Volt Royale. In the team games it sits next to the settings window.
- **More minigame maps:** Hot Potato, Sumo, Floor Is Lava, Multiball, Giant Ball, Imposter, Infection Night, Stunt Arena, Slalom and Delivery each have three layouts (Classic plus two new ones) or Random, picked under Map in their options.
- **Skins:**
  - Good Boy is now **Rocky**: a white coat with light brown patches and a patch over one eye.
  - **Lil Bro**: blonde rider and blonde kid. Home kit is a red Canada jersey, away kit a blue one, and the kid always wears the blue maple-leaf jersey.
  - **Ophie** is the second Rocky colourway: black, longer ears, a white chest, a thin white blaze down to a nose that's white on its front third with black nostrils, and a white nape that wraps round to the chest.
  - New cats: **Mew**, a classic grey, black and white tabby with a white neck and a ringed tail, and **Midnight**, a black cat.
  - Every skin's legs and shoes (or paws) now match it instead of the old navy trousers, in emotes too.
- **8-bit music:** 25 new chiptune songs in shuffled pools for the menus, Volt Hockey, Volt Royale, racing games and party minigames, plus the original two. A long session moves on to a new song every couple of minutes. They still only play when your music folders are empty.
- **Emote jingles:** every emote plays a little 8-bit tune that fits it (replaced by real emote sounds in v14.1.5). Other players' emotes play quieter.

## v14: skins, Volt Royale, Victory Royale, jumps everywhere, reconnect
- **Skins replace hats, hair and colours.** The Locker now has three slots: **PLAYER SKIN**, **CART SKIN** and **EMOTE WHEEL**. Player and cart skins are picked separately.
  - Player skins: Rookie and Hometown Hero (free), Lil Bro (a kid on your lap in a blue jersey with a white maple leaf), Biker, Rockstar, Software Engineer, Star Knight, Good Boy (a dog), Hockey Pro, Ace Pilot, Trucker (denim cutoff, VOLT FREIGHT hat), Astronaut, Lumberjack, DJ Volt and Captain Volt. Each pass skin also has a second colourway.
  - Cart skins: Classic Plywood and Street Neon (free), Rocket Ship (fins, portholes, a jet flame that grows when you go), Mouse Mobile (ears, whiskers, a swaying tail), Big Rig (grille, headlights, smoking stacks), Chopper, Tour Rig, Dev Rig, Star Cruiser, Dog House (wagging tail), Ice Machine (spinning beacon), Biplane (spinning prop), Pickup, Moon Rover, Log Hauler and Volt Racer, each with a second colourway. The cart's shape and hitbox never change.
  - In Volt Hockey your team's jersey goes over your skin's top and the cart keeps its team stripe; everything else on the skin stays.
  - Every driver has a neck, ears and a nose now. The seatbelt is gone.
- **Emotes only.** The emoji pop-ups are gone. There are 56 body emotes (arms and legs), 10 of them free. Old wheels with emojis on them get emotes in those slots.
- **Season pass rebuilt:** a player skin, an emote, a cart skin, an emote... across the 100 tiers. Titles are gone everywhere.
- **Battle Royale is now Volt Royale.** The winner screen says **VICTORY ROYALE**, and when the last team is left the game doesn't stop. Confetti and fireworks start, and the winners drive round for 12 seconds. They can't be hurt, their guns never run dry, and they can shoot and emote. Then the results.
- **Volt Royale is 16+.** Only logged-in players who gave an age of 16 or more at sign-up can see or play it. Admins can also approve a player: on the admin page, tick "Allowed to play Volt Royale" (or "16 or over"). Logged-out players don't see it at all, and it's hidden from the public room list for them. A party or room that starts it sends them back out.
- **Gun pickups never add ammo.** Driving onto a gun while holding one swaps them: you drop yours on the ground, even if it's the same gun.
- **New Volt Royale maps, with jumps.** Kickers are ramps that launch you, and a kicker landing never hurts.
  - Volt City: drivable skyscrapers, an elevated highway with a jump over the gap, a mall roof car park and a skate park.
  - Snow Peak: a three-tier mountain with a ski lodge on top.
  - Thrill Park: a raised coaster track, a funhouse maze, a bumper-car pen and a pond jump.
  - Two giant maps: Wild Peaks, and **The Continent**, 432 × 330 m with twelve places to land.
- **Race jumps and the rescue drone.** There are three new tracks: Lava Skyway, Stunt Park and Coastal Cliffs. Some edges have no wall. Drive off one and you fall in, then a drone flies down, grabs your cart and drops you back on the track where you fell, about 2.8 s later. Some of the old tracks have jumps now too.
- **Minigame layouts:** Hot Potato, Sumo, Floor Is Lava, Multiball, Giant Ball, Imposter, Infection Night, Stunt Arena, Slalom and Delivery each have their own kickers, towers and bumpers. Golf, Bowling, King of the Hill, Capture the Flag and Paintball keep their own courses.
- **Team minigames** (Paintball, Capture the Flag, Multiball, Giant Ball) open on the Volt Hockey team screen from the first visit. X opens their settings.
- **Boost is bigger:** a front wheelie and flames when any boost kicks in, and a stronger shove.
- **Minigame power-ups are RT only.** X and A no longer use them, and the help text and touch button say so.
- **League select:** only LB / RB changes the league. D-pad ◀ ▶ picks the team.
- **Party on the home screen:** press ▲ (or tap someone) to pick a party member and A to see their profile: name, level, games, wins, goals, cups and hours. The host can remove local players and party members from there.
- **Reconnect:** if you lose the host mid-game, the Online menu shows **Back into your game** for 20 minutes, and it puts you back in your own cart. If the game ended while you were away, it says so.
- **Crowd:** the crowd holds ARTHROGRYPOSIS letters and #ARTHROGRYPOSIS AWARENESS signs.
- **Fixes:** quests and pass progress count again after "Play again", and progress merges with your account instead of being overwritten. Name changes stick when you're logged in. The nameplate is never blank on side select.

## v13.6: the online room, redone
- **Teams first (host):** a new room opens on the same team cards as Play now and Practice. Each card has the logo and stats, ◀ ▶ picks the team, LB / RB picks the league (Premier League, National Teams, Cities), and ▲ ▼ sets the carts. X opens the room settings: public or private, lobby name, game, CPU skill, practice, carts and Close room. The match rules are one level in, under **Rules ▸**. A goes on to the side picker.
- **Side picker (everyone):** three columns, like the local controller screen: your team's logo on each side and **everyone starts in the middle**.
  - Each player pushes ◀ ▶ (or taps a column) to pick a side, X locks them to one cart, and ▲ ▼ changes their name.
  - Local guests move themselves on their own controllers, and B on a guest's controller removes them.
  - The host has Y for settings, LB to go back to the teams, and START to play.
  - Online everyone plays, so anyone still in the middle at START is moved to the side with room. The host gets a warning first and presses START again to go.
- **Minigames and Volt Royale** with no sides show one list of who's in.
- **After a game** the room comes back on the side picker.

## v13.5.6: pick your side again (everyone starts in the middle)
- Volt Hockey matches, practice and the team minigames (Paintball and Capture the Flag in Teams mode, Multiball, Giant Ball...) open the side picker again after you choose the teams.
- You and your local players are already on it, in the middle. Each player pushes ◀ ▶ to pick a side, and X locks them to one cart (or leaves them free to switch carts). START plays. Anyone still in the middle doesn't play. Other controllers can still join with A.
- Seasons (you always play for your team), free-for-all minigames and Volt Royale go straight in.

## v13.5.5: no more music 404s on Netlify
- Netlify now writes `assets/music/playlist.json` itself on every deploy (the build command runs `tools/make-playlist.js`). Push your songs in `assets/music/menu/`, `game/` and `intro/`, and they're found.
- The game only asks for folder listings (`menu/`, `game/`, `match/`, `intro/`, `music/`) on your own computer or home network with no playlist. Public hosts always answered those with 404s.

## v13.5.4: touch controls for every game
- The on-screen controller now shows only the buttons a game uses, each named for what it does there:
  - **Volt Hockey**: SPIN ↻ / ↺ on the two big buttons (they used to press the triggers, which no longer spin), PRESS, CART, DRIFT (hold), VIEW, EMOTE, A.
  - **Minigames**: SPIN, DRIFT, VIEW, EMOTE, and the X button as the game's action: USE (an item), FIRE (Paintball) or ZAP (Imposter). Games with no action hide it.
  - **Volt Royale**: FIRE, AIM, JUMP, GRAB, AWAY, DRIFT, MELEE, BAG, ◀ ITEM ▶, VIEW, and new **AIM UP / AIM DOWN** buttons (there was no way to tilt your gun on a phone). Volt Royale has its own starting spots so nothing sits on the hotbar.
- A says READY on the ready screen. At the end of a game, A says AGAIN and B says LOBBY.
- The left-hand buttons no longer overlap the stick or the 😀 button.
- Buttons you've moved yourself stay where you put them.
- The how-to-play pages name the touch buttons, and the spin lines that still said "triggers" now say LB / RB.

## v13.5.3: cart driving sound
- **Settings > Sound** has **Cart driving sound** (On / Off) and **Cart driving volume** (10% to 200%).
- The motor whine is quieter: at 100% it is about 40% as loud as before.

## v13.5.2: penalty options
- **Settings > Game rules** (and the online room's rules page) has two new rows:
  - **Penalty time**: how long a cart sits in the sin bin, 5 to 120 s in steps of 5. The default is 10 s (it was a fixed 8 s).
  - **Penalties carry over after a goal** (Off by default). When it's On, a penalty keeps running through the face-off after a goal and into the next period. If the short-handed team gets scored on, all its penalties end and it's back to full strength. A team that scores while short-handed (or takes a penalty after scoring) still serves the full time.

## v13.5.1: music folders, a sizzling opening
- `assets/music/menu/` plays in the menus and the lobby, `assets/music/game/` in the games, and `assets/music/intro/` behind the opening splash (one song picked at random, which keeps playing on the title screen). Each folder is shuffled on its own, carries on with its next song when you come back to it, and plays every song before any repeats.
- Volt Royale has a **Music** option (Off by default).
- `tools/make-playlist.js` writes all three lists.
- The opening sparkler sizzles, crackles and pops as it burns the logo in, whooshes when the logo flares, then fizzles out. (Browsers only allow sound after a click or key press, so on a first visit with no click yet the opening can be silent.)

## v13.5: local players in the lobby, ready up, play again, jerseys, any-league seasons

- **Local players**: a second controller presses START in the lobby (or ＋ PLAYER, then A on their controller) and they stand on the stage with you. They come along into everything: hockey (on your team), seasons, minigames, Volt Royale (your squad), and online rooms and party games (as your local guests). To leave, they hold B. The controller screen after picking a game is gone, which also fixes the empty nameplate there.
- **Ready up**: every game waits until every player has pressed A, online too. The host's START skips the wait.
- **Play again**: at the end, A plays again straight away (minigames and Volt Royale get a new random map) and B goes back to the lobby. Online, the host's A takes the whole room into the next game.
- **Time played** in Volt Hockey, minigames and Volt Royale is on the CAREER tab.
- **Seasons in any league**: LB / RB on the new-season screen picks the league (Premier League, National Teams or Cities). The season is that league's teams only. Old saves carry on as Premier League seasons. The season hub menu is a list again, so it no longer overlaps the info card.
- **Jerseys**: in hockey every shirt has its team's crest on the chest, and national teams wear their flag.
- **Volt Royale**:
  - The gun in your hands lifts up and glows in the hotbar, marked IN HAND.
  - The bag opens on the item you're holding.
  - Using up an item no longer swaps what's in your hands.
  - Being revived shows you the progress and who is reviving you. Two people reviving is twice as quick, and both sides see "⚡ x2".
  - Getting yourself up at a rez garage shows its progress.
  - Rez markers are see-through.
  - Armour plates only go up to 50.
  - Nothing swings into your face on ramps in first person.
- **Drift boost** is faster (×1.55 for longer), with flames from the back wheels, a short fire trail and a wider view.

## v13.4: gun tiers, self-rez, giant maps, party in the lobby

- **Gun tiers**: Uncommon (green), Rare (blue), Epic (purple) and Legendary (gold). Each tier hits harder (×1, ×1.12, ×1.25, ×1.4). The loot glow, hotbar and bag all show the tier colour and name.
- **Sniper scope** is dead centre on screen.
- **Headshots** have a burst of sparks and a ring, a "HEADSHOT!" pop with a gold flash, and a bigger sound.
- **Equipping**: switching guns or items takes a moment, with the hands lowering and coming back up. You can't fire until it's ready.
- **Pistol** is semi-auto and fires as fast as you pull the trigger.
- **Heals**: you can open the bag and move a med or shield you're using, and it keeps applying.
- **Downed** lasts about 38 s. You can't heal while downed. Drive into a ready rez garage and you get yourself back up, with heartbeat and defibrillator sounds (reviving and rezzing teammates have them too).
- **Maps**: four new places (Volt Arena, Castle Hill, The Airfield, The Factory), and two giant maps: Mega Island (nine places in one) and The Frontier (a long strip). Squads go up to 5 and matches up to 20 carts.
- **No team colours in Volt Royale**: everyone wears their locker look. PLAY on Volt Royale drops you straight in with your party, with no team picking. X opens its options.
- **Party in the lobby** (up to 5): your friends stand in a V behind you (you, then 2, then 2), each in their own look with their name over them. Y or the 😀 button opens emotes, and your party sees them.
- **Aiming down sights** is smoother and slower to turn.
- **Hockey and every mode**: the triggers no longer spin the cart 90°. B is drift everywhere. In the minigames the item is used with RT (or X), same as Volt Royale.
- **The "dying smoke alarm" chirp is gone**: it was the match-start whistle. It's softer now, Volt Royale has its own start sound, and far-off shots and storm sounds are quieter by distance.

## v13.3.1: fix for Volt Royale freezing the browser

- v13.3 gave every chest its own small light for the opening glow. A big map has 150+ chests, and the 3D engine lights every pixel with every light, so the graphics card choked and the browser froze while the match loaded. The glow is now a sprite, so the scene is back to its 3 normal lights.

## v13.3: Volt Royale interaction, melee, doors, new items, headshots, squad stats, realistic sound

- **Fixed the crash at the end of a Volt Royale** (`S is not defined` in progress.js).
- **Buttons in Volt Royale**:
  - **X** picks up the gun or item in front of you (a prompt says what), opens or shuts doors, and swaps when your bag is full. **Hold X** to open a chest or ammo crate, or to revive. With nothing to grab, X reloads.
  - **B** (hold while turning) drifts, with no jump needed.
  - **Melee bash**: R3 (click the right stick), the B key on keyboard 1, the middle mouse button, or touch MELEE. It does 20 damage, knocks the target back and breaks doors.
  - Driving over loot only picks up ammo, rez cards, and items that top up a stack you already have.
- **Your bag keeps its slots**: using or dropping something leaves a gap, and the other items don't move.
- **Chests and ammo crates** sit on the ground. Hold X and the lid opens; the loot flies out in an arc and bounces. An opened box stays (empty) for a minute. Loot from an eliminated cart flies out the same way.
- **Doors** on houses: X opens and shuts them (CPUs open them as they arrive). Shooting or bashing breaks them into splinters, and a broken door is rebuilt after 30 s.
- **New items**:
  - **Riot shield**: hold it and hits from the front go into the shield (220 HP) until it breaks. You drive a little slower, and RT does a shield bash (28).
  - **Bubble**: a dome you can drive through but bullets can't, which fades after 12 s.
- **Headshots**: hit the top of a driver (aim a little up). The sniper now does **105, or 210 to the head**; other guns do ×1.4–1.6 to the head. A "tink" plays on a headshot.
- **Damage numbers** float over whoever you hit (only you see yours): blue for armour, white for health, yellow and HEADSHOT for headshots, grey for hits blocked by a riot shield.
- **Heals** stop as soon as you're full, and that one item is used up (not the stack). Cancelling part-way still uses it. The heal bar has no countdown.
- **Rez garages** have a big turning ✚ and a tall beam (green when ready, red while recharging). Carrying a card puts a ✚ marker with the distance on screen. **Your teammates' rez cards** have a tall blue beam and a 🎴 marker with name and distance (an arrow at the edge of the screen when off-screen).
- **The minimap and the bag map** no longer show enemies, only you and your squad.
- **Storm warnings** flash across the screen in big letters ("STORM CLOSING IN 30 SECONDS", "THE STORM IS CLOSING IN!") with a rising siren-like swell; when the storm starts moving, thunder and wind.
- **End of a match**: VICTORY ROYALE or your placing (#3 of 6), then a card for each squad member with eliminations, knocks, assists, damage, revives, rezzes and time alive (★ on the squad's best), and squad totals.
- The rocket launcher no longer always says "X: reload".
- **Look sensitivity**: Settings › Controls and screen has separate left/right and up/down sliders. Left/right defaults to 70%, so turning to look is slower than before.
- **First person**: an emote's arms come out in front of you, so you can see them.
- **Sound** (src/audio2.js): loud sounds now echo through a shared reverb. Wood knocks and metal clangs are built from real resonant partials. New realistic sounds cover chests, crates, doors (creaking hinges), splintering wood, punches, shield clangs, the bubble, the storm siren and thunder. The goal horn, whistle, collisions, explosions and menu clicks are redone, and a quiet electric-motor whine under your own cart follows its speed.

## v13.2: team leagues, team and controller select screens, drift meter, CPU revives

- **Leagues**: teams are grouped into the **Premier League** (the original 15), **National Teams** (Sweden, Denmark, USA, Canada, France, England, Malta, Australia, Finland, Norway, Germany, Italy, Switzerland, Czechia, Japan, Ireland, Netherlands) and **Cities** (Barrie, Toronto, London, Kitchener, Niagara, Ottawa, Hamilton, Montreal, Vancouver, Waterloo, Guelph, Orillia, Sudbury, Windsor, Oshawa, Kingston). Every new team has its own logo (flags for the nations, crests for the cities, made by `tools/gen_logos.mjs`). Season mode is played in the Premier League.
- **Team select** (Practice, Play now, New season), laid out like a big console hockey game:
  - A HOME card and an AWAY card show the logo, name, league, overall rating and OFF/DEF/SPD/GOA bars.
  - ◀ ▶ changes team, LB/RB (keyboard Q/E) changes league, Y picks at random, and A confirms HOME and then AWAY.
  - X opens **Game settings**: difficulty, max cart speed, switching carts, game clock and how to play.
- **Practice**: each team's CARTS row (▲ ▼ then ◀ ▶) goes down to **NONE**, so one team can be empty (not both).
- **Controller select**: every controller joins as a card in the middle (NOT PLAYING). Push it ◀ ▶ under a team's logo. X locks it to one cart (🔒), ▲ ▼ picks a name and Y types one. Start plays; anyone left in the middle sits out.
- **Drift in first and third person** now actually starts (it checks how fast the cart is turning, not just the stick). The **SPEED meter turns into the drift meter** while you drift: coloured bars that fill blue, orange then purple, with a glow, sparks and DRIFT / MAX!!! / BOOST! labels.
- **CPU revives**: a CPU goes to a downed teammate and revives them whenever nobody is shooting at it and no enemy is within 10 m. Enemies now shoot standing players before downed ones, you don't bleed out while someone is reviving you, and a revive takes 4 s. In test matches CPUs now revive 1–3 times a game.
- **Hats**: hair no longer shows through hats (under a hat only the hair below the band shows), and the cap is a touch taller so the head doesn't poke through.

## v13.1: storm, heals, recoil, reloads, drift feel, minigame menus

- **Storm** now hurts health (never cart armour), a point at a time, more every stage. At 0 health you go down like any other hit (with a teammate still up), and a downed player in the storm bleeds out faster. Before, the damage was rounded away each step.
- **Heals and cart armour** go on gradually while you apply them, and the progress bar fills. If you stop part-way you keep what went on and the item is used up. The same rounding bug had frozen heals, revives and rez garages; all three now progress.
- **Recoil**: every shot kicks the gun back and your view up. Pistol and SMG kick a little; shotgun, sniper and rocket kick hard.
- **Reloads**: each gun has its own hand animation (magazine out and in, bolt, tube) and its own reload sound. The **shotgun loads shell by shell** ("LOADING SHELLS 2/5"), then pumps, and you can fire part-way through.
- **Drifting**:
  - It now starts in first and third person (it couldn't before: those views only lead the cart a little).
  - The back of the cart swings out, the tyres smoke, the sparks are bigger and the tyres squeal (louder as it charges).
  - In first and third person the screen edges glow in the drift colour with speed streaks, and in first person the view leans into the drift.
- **Minigame menus**: the demo plays full screen behind the menu. The menu boxes are see-through, and the goal and rules sit in a see-through panel at the bottom right. The game list no longer breaks into a grid.

## v13: Volt Royale squads, revives and the storm, drifting, hair, bigger maps

**Volt Royale**
- Squads: you stay with your party. Online, a party bigger than the squad size cannot join or host. Locally, ◀ ▶ on the player-select screen sets each player's squad. There are no team colours: everyone wears their own look.
- Controller: A jump, X reload, RT shoot, LT aim, or heal a teammate when you hold a heal item next to them. LB/RB switch items, Y holsters (drive faster) and Y again takes out the last item. D-pad up opens the bag.
- Last stand: at 0 HP you are downed (slow, bleeding) while a teammate still stands. Hold X near a downed teammate to revive. When the whole player is out, they drop a rez card: a teammate carries it into a rez garage (two openings, glows green) and waits inside. The garage then goes red while it cools down.
- Heals take time and the character animates while using them: bandage, medkit, plate, cart armour and a full body kit. Ammo comes in types (light, shells, medium, heavy, rockets) and is carried without the gun.
- Pickups are 3D models of the item that float and glow by rarity.
- The storm closes in stages, each hurting more, with announcements and 30 s and 10 s warnings. It shows on the minimap and the bag's map, with a purple tint and vignette when you're inside.
- Spectating: LB/RB switch player, ▼ toggles 1st/3rd person (3rd sits back to see ahead), and Y takes over a CPU teammate.
- Bottom-left panel: you and your teammates with faces, names, health and shield.
- Maps are much bigger (5 enlarged plus Island, Metro, Wilds and Sprawl); "random" picks one each match.

**Everyone**
- Drifting in every game: hold A while turning at speed (in Volt Royale, hold A after a jump). A drift keeps its speed. The drift bar charges three levels, and letting go gives a speed kick and a boost. Minigame items moved to X.
- Capture the Flag (Fortress, Canyon) and King of the Hill (Ruins, Colosseum) have big maps with walls and moving parts; "Classic" keeps the old court. CPUs path round walls and back off when stuck.
- Hair styles (11) and hair colour are separate locker slots, plus titles, new hats, outfits, faces and decals.
- Actions (thumbs up, cheer, wave and more) are in the pass and the emoji wheel; the arms move when you use them. Your own emoji shows in front of your face; in Volt Royale others only see it nearby.
- Arms and legs are visible in first person, holding the item or weapon.
- Season 1 now has 100 tiers. You earn XP from playing, kills, goals, wins and top-3 finishes (less than quests). There are new quests for revives, heals, rez and drifting.
- Layered gun sounds for each gun, reloads and explosions.
- Menus are boxed tiles (Settings stays a list). The title screen buttons, like fullscreen, work with a controller.
- Friends show when they were last online.
- Fixed the bald patch at the front of the hair.

## v12: the lobby, your character, Season 1 "The Beginning", quests and the emoji wheel

- **New main screen (lobby):** your character sits on a lit stage, with tabs along the top. Switch tabs with LB / RB (keyboard Q / E) or click them. The right stick turns your character.
  - **PLAY:** shows the mode you picked, today's quests and a big PLAY button. Press ▼ (or click the mode card) to pick a mode: Volt Hockey, Volt Royale, Minigames, Season, Practice Arena or Online.
  - **LOCKER:** outfit (Rookie Tee, Team Jersey, Cozy Hoodie) and its colour, hat and hat colour, face, hair, skin tone, cart decal, and your emoji wheel. Hover an item to try it on. Locked items show the pass tier that unlocks them.
  - **PASS:** Season 1, "The Beginning". A free pass with 20 tiers and one small reward each (hats, faces, outfits, cart decals, emojis). Browse the rewards to try them on.
  - **QUESTS:** 3 daily quests (reset at midnight) and 6 weekly quests (reset on Monday), picked from a larger pool. Examples: play a minigame to the end, play or win a Volt Royale, win a match of Volt Hockey, spend time in the Practice Arena, get a penalty, play a full season, open chests, score goals, drive 10 km.
  - **CAREER:** your stats, the leaderboard, and changing your name.
  - **Start / Esc** opens the menu: Settings, Controls, your name, the leaderboard.
- **XP and levels:** matches give 80 XP (150 for a win) and quests give 300–3,000. Every 1,000 XP is a level, and each level unlocks the next pass tier.
- **Your look in matches:** your hat, face, outfit and cart decal show on your cart, for everyone online too. In Volt Hockey your shirt stays in your team's colour so teams are easy to tell apart.
- **Emoji wheel:** in a match, hold D-pad up (keyboard: H, or M for keyboard 2), point a stick at an emoji and let go. A quick tap of D-pad up still opens quick chat online. Touch and mouse: the 😀 button. The emoji pops up over your cart, online too. Choose your 8 emojis in the Locker.
- Everything is saved with your settings (and to your account when you're logged in). There's no shop yet: the Locker and pass are ready for skins to be added later.

## v11.4: a more realistic outdoors, LT to aim

- **Volt Royale looks more real:**
  - A painted sky with clouds and a sun glow, and haze that thickens with distance.
  - A horizon on every map: rolling hills and far mountains, a city skyline (Downtown, Port), the sea (Port), red mesas and boulders (Canyon), and woods all round (Suburbs, Jungle).
  - Leafy trees with bark, and building fronts with real windows on every storey. Warehouses and containers have corrugated metal.
  - Ramps have steel guardrails, floor edges are worn paint instead of bright yellow, the ground has natural patches, and the storm wall rises like haze.
- The race maps use the new sky too.
- **LT (hold) to aim:** zooms in (most with the sniper, which also shows a scope), tightens your shots, and slows your cart while held. Keyboards: Q or `,`.

## v11.2: Volt Royale bag, jumping, aiming up and down

- **B opens your bag** (inventory screen): pictures of all 5 slots with ammo and gun stats. ◀ ▶ choose, A picks a slot up and A again swaps or moves it, Y holds that item, X drops it on the ground, B closes. You can't pick something up again for 2.5 s after dropping it. Works for online guests too (the host applies it).
- **Jump with X** (Volt Royale only; A still fires). You can jump or simply **drive off any roof, floor or ledge** and drop to whatever is below. A long fall costs a little health. You bump your head on a floor above you. CPU carts keep to their railings.
- **Aim up and down**: right stick, or I / K (keyboard 1) and Page Up / Page Down (keyboard 2). The tilt stays where you put it and eases back to level after a moment. Aim assist also tilts onto carts above or below you. Bullets now fly in 3D: floors and ceilings stop them, so you can shoot up at someone on a roof.
- First-person view in Volt Royale sits higher so the crosshair is near the middle of the screen, and it tilts with your gun.
- See-through openings: the floor above a ramp now has a real hole, so you can see where you're going.
- New HUD: crosshair, hit marker, red flash when you're hit, low-health pulse, kill feed, "spectating" label when you're out, and the storm's current and next circle on the minimap. Health and shield are bottom-left under the speed meter; the inventory bar is bottom-right.
- Surfaces use real textures (asphalt, concrete, grass and so on) instead of flat colours.
- **Controller in Volt Royale:** RT fires (hold it for automatic guns), LT does nothing, and LB / RB step back and forward through your items. There are no spin buttons in this game. On keyboards: E fires, Z / R step through items (keyboard 2: `.` fires, `[` / `]` step).
- **Watching when you're out:** you follow a living teammate. If your team is gone, you can watch anyone still in. LB / RB (or left / right) switch between them.
- Settings: **Invert right stick Y axis** (on/off) applies to looking around in every game and to aiming in Volt Royale.

## v11.1: Volt Royale loot and HUD, players-only games, a more realistic look
- **Volt Royale**: you start with nothing. Search CHESTS (a gun with its ammo, often an item too) and AMMO CRATES; medkits, shield
  potions and other items lie out in the open. A new inventory bar shows a picture of every gun and item you carry (the one in your hands
  is highlighted), with health and shield bars. No top-down (classic 2D) view in Volt Royale.
- **CPU carts: On / Off** on every minigame's setup page. Off: only the people who join get a cart (on this screen or online).
- **A more realistic look** for every game (`src/look.js`): lighting and reflections from a generated sky outdoors or the arena's lights
  indoors, fine surface grain on every material, softer fill light, and real ground textures (asphalt, concrete, grass, dirt).

## v11: Volt Royale
**Volt Royale** (Minigames > Battles and sneaky): solo, duos (teams of 2) or trios (teams of 3), 6 to 12 carts.
- Everyone starts with a pistol. Loot lies around the maps (with a light beam above it): PISTOL, SMG, SHOTGUN, RIFLE, SNIPER, ROCKETS,
  MEDKIT (+50 health), SHIELD POTION (+50 shield), BOOST (3 s of speed) and SHIELD WALL (a wall in front of you that stops bullets and carts),
  plus ammo crates. The high ground has the better loot.
- Carry up to 5 things: **Y** switches, **A / X** fires or uses (hold it for the SMG and rifle). 100 health and up to 100 shield (shield first).
- The storm closes in over six phases; outside the circle you lose health, faster and faster. Last cart / team standing wins.
- **Levels**: buildings you drive into through their doors, parking garages with switchback ramps, roofs reached by ramps, skybridges,
  a giant jungle tree with a square spiral ramp up the trunk to a flat canopy with logs and loot, stepped temples, mesas and container towers.
  Carts on different levels cannot touch or shoot each other; your camera rides up with you.
- **Five maps** (`BR_MAPS` in `src/modes_br.js`, built from `building`, `garage`, `spiralTree`, `mesa`, `ramp`, `floor`, `wall`, `tree`, `loot`):
  Downtown, The Jungle, The Port, The Suburbs, The Canyon.
- The CPU loots, takes the high ground, picks the right gun for the range, heals, drops shield walls, boosts across the map and plans routes over
  every level (A* on a grid per level, linked by the ramps).
- Code: rules, maps and CPU in `src/modes_br.js`; the 3D world, loot, bullets, storm and the 2D view in `src/modes_br_draw.js`.

## v10.1: Paintball, and fixes from play-testing
- **Paintball** (Battles and sneaky): every cart has a paintball gun (A fires). Three big maps (`PB_MAPS` in `src/modes_games.js`):
  Bunker Hill (sandbag bunker, fort, centre maze, sliding gates and a spinning bar), The Maze (corners and corridors, sliding blocks, gates)
  and The Warehouse (shelf aisles, forklifts, a big sliding door, a bunker). Limited paint (12, up to 24); ammo crates appear around the map (+8).
  Power-ups: SHIELD (blocks the next shot) and RAPID FIRE. One hit and you respawn a few seconds later. Teams or free for all. The CPU finds its
  way through the mazes (A* on a grid of the walls) and leads its shots.
- **Capture the Flag**: no more grab / knock-loose loop (a carrier who loses the flag cannot grab it again for 3 s, and a dropped flag cannot be
  picked up for a moment).
- **King of the Hill**: two hills at once; only a cart alone on a hill scores; a crowded hill (two carts for a few seconds, three or more
  sooner) OVERLOADS and throws everyone off. A much bigger rink (44 x 24), the hills move every 15 s, power-ups on by default with weapons: SHOCKWAVE (throws everyone
  near you away), ZAP, BOOST, OIL. The CPU uses them. (A minigame can have its own rink size: `court` in its GAME_INFO.)
- **Floor Is Lava**: the LAVA SNAKE wakes after a few seconds, hunts the nearest cart, grows and speeds up, and melts the floor behind it.
  The CPUs keep moving and plan routes that avoid lava.
- **Giant Ball** is a beach ball: it bounces, hits pop it up (spins higher), and you can drive under it while it is high.
- **Bowling**: a proper lane with padded bumper rails (no gutters) and a 12 second clock for each ball.
- **Mini Golf**: real putting. Drive into your ball to hit it (aim with your heading, power with your speed; a spin is a big drive), it rolls
  with golf-ball friction and lips out of the cup if too fast. Dimpled golf balls, one colour per player.
- **Infection Night** is much darker: only headlights and the carts' glow.
- Fixed: balls and pins could freeze when moving slowly (positions were rounded every physics step).

## v10: fourteen new minigames, awareness signs, crash slow-down
New games (Minigames menu, each with a live demo, How to play page, CPU players, split screen and online):
- **Party chaos**: Hot Potato Bomb (bump to pass the bomb), King of the Hill (the hill moves every 20 s), Sumo Ring (hard shoves, a shrinking ring, rounds),
  Floor Is Lava (tiles glow orange, then melt).
- **Ball games**: Multiball Madness (team hockey with 3-8 balls), Giant Ball (one huge heavy ball, wide goals), Cart Bowling (take turns, strikes and spares),
  Mini Golf (everyone plays the same hole with their own ball; four hole layouts).
- **Racing and driving**: Stunt Arena (ramps, spins in the air, clean landings and combos), Slalom Time Trial (gates in order; your best run is saved in
  this browser and its ghost races you next time), Delivery Rush (parcels from the depot to the matching house; ram couriers to steal).
- **Sneaky and teams**: Imposter Carts (every cart looks the same; agents collect orbs and zap with A), Capture the Flag, Infection Night (Manhunt with the
  lights out: headlights and glows only).
Code: rules and CPU in `src/modes_games.js` (one `MODES[kind]` + `GAME_INFO[kind]` each), drawing in `src/modes_draw.js` (3D and 2D), framework in `src/modes.js`.

Also:
- **Crowd awareness signs** in each cause's colour: arthrogryposis / AMC (blue), Defeat Duchenne (red), autism (gold), TBI / brain injury and cerebral palsy
  (green), spina bifida (yellow), Down syndrome (blue and yellow), SMA (ivory), muscular dystrophy (lime), disability pride (lavender). The shirtless fans
  sometimes paint AMC STRONG, DEFEAT DMD, DUCHENNE, AUTISM, TBI STRONG or CP PRIDE instead of the team name (now also drawn in 3D). Lists: `CAUSE_SIGNS`
  and `CAUSE_WORDS` in `src/crowd.js`. Signs are printed on both sides so they read the right way from either stand.
- **Crashes slow both carts**: a real hit keeps 60% of each cart's speed; carts pushing against each other bleed speed (`CONFIG.crash`).
- **The CPU always keeps learning** how you play (the off switch and "Forget what the CPU learned" are gone).
- **Broadcast is off by default too**, like third person: turn either on in Settings > Camera and graphics. New players start in first person.
- **Menu demos** play in real time (they no longer slow down when the frame rate drops), skip the 3-2-1 and run a little faster (`CONFIG.demoSpeed`).

## v9.3: sparkler intro, camera and speed defaults
- **Sparkler opening** on the title screen: a sparkler burns the VOLT HOCKEY logo in letter by letter, the logo flares, the title fades in, and the
  logo keeps fizzling now and then. Plays once per visit; any key, button or tap skips it (`src/intro.js`, timings in `INTRO`).
- **Third person is off by default.** Turn it on in Settings > Camera and graphics > Third person view; then the camera button offers it again.
  New players start in Broadcast.
- **Carts start at full power (5 of 5)** for new players. Older saves (this browser or a logged-in account) are moved to 5 once, and third person off;
  after that your own choice in Settings > Game rules is kept.

## How to play pages and game demos (v9.2)
- **Minigames** is grouped into categories (Party chaos, Ball games, Racing and driving, Sneaky and teams), plus "How to play Volt Hockey".
- Every game list and setup page has a **narrow menu on the left and a live demo on the right**: CPU carts play the highlighted game
  (filmed from the broadcast camera), a caption along the bottom of the video steps through the rules, and the goal and rules sit under it.
  The demo follows your options (pick another track and the demo drives it).
- **How to play** (setup pages, and hockey's Setup): goal, rules and every control for gamepad / keyboard / touch on the left, the demo on the right.
- Games are described in `src/modes.js` (`GAME_INFO`); new modes plug into `MODES`. Demo window: `DemoWindow` in `src/scenes_mini.js`.

## Minigames (v9)
Main menu > **Minigames** > a game > **Play on this screen** (local: split screen, controllers, CPUs) or **Host an online room**
(a room already set to that game). Also Online > **Create a minigame room**, and every online room has a **Game** row (hockey or any
minigame). A party leader brings the party along either way. Every minigame works with
CPU carts, split screen, every camera (first / third person, broadcast, classic 2D), touch, and online.
- **Balloon Bash** (free for all or teams): balloons on every cart's back (1-5). Hit someone's back with your front: a balloon pops and they
  restart somewhere safe (blinking: 2 s of protection). No balloons left: out, watching from the sin bin. Round clock: when it runs out,
  the most balloons left wins.
- **Race tracks (v9.1)**: Rink Oval (on the hockey court), **Figure Eight** (96 x 56 m, the loops cross), **Serpent Canyon** (desert
  switchbacks, 150 x 90 m), **Grand Prix** (230 x 140 m circuit), **Pinball Palace** (neon bumpers, spinning arms, sliding blocks),
  **Frozen Lake** (ice: almost no grip) and **Mega Marathon** (nearly 1 km, 360 x 240 m). Obstacles: rocks, pillars, cones, tyre stacks,
  snowmen, bumpers, spinning sweepers, sliding blocks and boost pads. Pick the track on the Race setup page (or in the room). Add or change
  tracks in `src/racemaps.js` (`RACE_MAPS`: a list of points or a formula for the centre line, a width, a theme and obstacles placed by
  how far round the lap they are).
- **Race** on the Rink Oval: a barrier island makes the rink an oval track. Laps and positions are tracked; the winner crossing the line starts a 20 s
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
- **Camera button**: D-pad down on a gamepad (View until v8.1), **T** on keyboard 1, **P** on keyboard 2, **◉ VIEW** on the touch pad. It steps through **First person -> Classic 2D**, plus **Third person** and **Broadcast** when they are turned on (Settings > Camera and graphics; off by default since v10). Also in the pause menu and Settings > Camera.
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
Gamepad: left stick drive, RT spin clockwise, LT spin counter-clockwise, Y switch to nearest free teammate, Start pause, A/B select/back.
Keyboard 1: WASD, E / Q spin, F switch, Space select, Enter / Esc start.  Keyboard 2: arrows, . / , spin, / switch, Right Shift select.

Settings menu (also in the pause menu): volumes, cart turning speed, game clock speed, ball bounce, ball grip, stick length, collisions on/off, penalties on/off, difficulty.

## Your own music
Drop mp3/ogg/wav/m4a/flac files into `assets/music/menu/` (the menus and the lobby), `assets/music/game/` (every game) and `assets/music/intro/` (the opening splash). Each folder shuffles on its own and carries on where it left off, so every song plays before any repeats. Volt Royale only plays game music if its **Music** option is On; it's Off by default. (The older `match/` folder still counts as game music. Songs loose in `assets/music/` play in both.)
- **Local dev server** (`npx serve`, `python3 -m http.server`): the game reads the folders itself. Nothing to do.
- **Public hosting**: hosts hide folder listings, so the game reads `assets/music/playlist.json`. **Netlify** builds it by itself on every deploy (netlify.toml runs `node tools/make-playlist.js`), so you only push your songs. On other hosts (GitHub Pages, Wix...) run `node tools/make-playlist.js` before uploading.
  It writes `assets/music/playlist.json`, which the game reads. Re-run it whenever you add or remove songs.
- Or list file names by hand in `MUSIC_FILES` in `src/music.js`.
The title screen says how many songs were found. No songs found (or none loadable) = the built-in 8-bit tunes play.
"Next song" is in the pause menu.

## Practice mode
Main menu > Practice: pick any team sizes (1 to 3 carts per side, e.g. 1v1, 2v2, 1v3), no clock, and the pause menu has every setting
plus "Reset score and kickoff". Ball friction (Settings) controls how quickly the ball slows; default 1.2.

## Online play (new)
Main menu -> Online -> Create room (you get a 5-letter code) or Join room (type it). Up to 6 humans; the host picks sides, team sizes and CPU skill, then presses START MATCH. The host's browser runs the match (CPUs included); everyone else gets smooth, predicted controls. The host must stay in the room. It uses PeerJS (free public broker, bundled in lib/). Players behind strict NAT may need a TURN server: add it to `CONFIG.online.iceServers` in src/config.js. Host the game over https.

## CPU
Five levels: Easy, Normal, Hard, Pro, Superstar (`CONFIG.difficulties`, behaviour in `CONFIG.ai`). CPUs play as a team (carry, pass, crash the net, screen for a human ball carrier), avoid nets, and scoop balls off the boards.

## Look and speed
`CONFIG.look` controls shadows and depth. `CONFIG.chair.maxSpeed` sets how fast the carts are (since v14.1.5 every cart always runs at full speed).

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
