/* Every tunable number lives here. Units: metres, seconds, radians unless noted. */
const CONFIG = {
  view:    { width: 1280, height: 720, hudHeight: 98, margin: 8, logoSize: 256 },   // side panel: controls list beside the court
  physics: { hz: 240 },
  crash: { keep: 0.6, minClosing: 0.5, touchPerSecond: 1.4 },   // carts that hit each other both slow down: a real hit keeps this much of their speed; carts pushing against each other bleed speed at this rate
  demoSpeed: 1.4,                                         // the menu demos (How to play) play this much faster than real time                                   // fixed simulation steps per second

  court:   { width: 28, height: 15, boardColor: 0x1f140b, lineColor: 0xf2c200, lineWidth: 0.12, centerCircleRadius: 2,
             cornerRadius: 3 },                                   // rounded rink corners, like a hockey arena
  // Hardwood floor: planks run along the court, in random lengths and shades (seeded, so it looks the same every time).
  wood:    { colors: [0xcf9a58, 0xc58d4a, 0xd6a463, 0xbf8445], plankWidth: 0.25, plankLength: 2.4, seed: 7,
             seamColor: 0x4a2f16, seamAlpha: 0.5, seamWidth: 0.012, grainColor: 0x6b431f, grainAlpha: 0.25, grainWidth: 0.01 },
  crease:  { wing: 0.3, cartPad: 0, bulge: 2, segments: 40, fillColor: 0x2f6f8f, fillAlpha: 0.4 },   // rounded crease in front of the net: an arc from one post to the other, bulging out by `bulge` metres
  // Court materials (Settings > Camera and graphics). line = markings, board = the boards' colour, rim = the bevelled top edge.
  surfaces: [
    { name: 'Hardwood',        kind: 'wood',     line: 0xf2c200, board: 0x1f140b, rim: 0xa07a4a },
    { name: 'Blue sport court', kind: 'tiles',   line: 0xffffff, board: 0x10243f, rim: 0x8fb4e8, base: 0x2a62ad, alt: 0x2f6bba },
    { name: 'Polished concrete', kind: 'concrete', line: 0xf2c200, board: 0x2b2f33, rim: 0x9aa0a6, base: 0x8b9094 },
    { name: 'Ice white',       kind: 'ice',      line: 0x2a67c9, board: 0xe4ecf1, rim: 0x6f9db8, base: 0xe3f2fb },
    { name: 'Green turf',      kind: 'turf',     line: 0xffffff, board: 0x14301b, rim: 0x6fae7a, base: 0x2f7d3a, alt: 0x37894a }
  ],
  // The stands along both long sides. visible = metres of stand shown past the boards (the court gets this much smaller on screen).
  arena:   { rows: 5, rowGap: 0.62, seatGap: 0.58, walkway: 0.85, firstRow: 1.55, visible: 2.9, endMargin: 0.9, hz: 30 },
  net:     { mouthX: 5, depth: 0.6, width: 3.5 },         // mouthX = distance from end board to the net opening; width is the goal mouth

  ball:    { radius: 0.0375, mass: 0.16, dragPerSecond: 0.5,   // extra slowing that grows with speed, so fast balls shed speed quickly; rolling friction is a setting
          boardBounce: 0.6, gripMargin: 0.01, minDrawRadiusPx: 4, drawScale: 1.2 },   // drawScale: drawn this much bigger than its real size (play is unchanged)   // cart bounce and grip are settings, see `defaults`
  chair:   { radius: 0.45, ballHitRadius: 0.4, mass: 160, maxSpeed: 6.4, accel: 5.2, brake: 8,   // top speed in m/s (real chairs are capped at 10 km/h; this is 15)
            
             baseTurnRate: 3.4, sideGrip: 10, chairBounce: 0.3, boardBounce: 0.15, bodyLength: 1, bodyWidth: 0.72,
             reverseAngle: 2.2, minForwardFactor: 0.2, stickDeadzone: 0.1 },
  // The "c" shaped cup on the front of the cart. Its middle is recessed, its arms reach forward.
  cup:     { frontX: 0.5, halfWidth: 0.3, recess: 0.08, points: 7, colliderRadius: 0.05,
             stickColliderRadius: 0.03, stickColliders: 5 },   // the stem of the "t"; its length is the Stick length setting
  drift: { grip: 0.28, turn: 1.0, drag: 0.12, yaw: 0.9, minSpeed: 0.35, levels: [0.8, 1.6, 2.6], boost: [0, 0.5, 0.9, 1.4], boostMul: 1.32, colors: [0xffffff, 0x3dd6ff, 0xff9f1c, 0xc44dff] },   // drifting (chair.js): slide, charge levels (s), boost (s) per level
  spin:    { degrees: 90, seconds: 0.14, cooldown: 0.55 }, // slap-shot spin (RT clockwise, LT counter-clockwise)

  foul:    { noticeSeconds: 3, minClosingSpeed: 2.8, binSeconds: 8, facingDot: 0.6, hitDot: 0.8, bumpSoundSpeed: 1.5 },
  match:   { periods: 2, periodSeconds: 15 * 60, countdownSeconds: 3, goalPauseSeconds: 3, overtimeSeconds: 180, maxPlayers: 6, chairsPerTeam: 3 },                      // chairsPerTeam = carts per side in a normal match (practice lets you pick 1-5)
  // Season mode (src/season.js): a round-robin season, then the top teams play off for the Volt Hockey World Cup.
  season:  { series: [3, 3, 5],                       // playoff series lengths, first round to the final (best of N)
             qualifiers: 8, winPoints: 2, otLossPoints: 1,
             goalsPerMinute: 0.25, ratingK: 0.022, homeEdge: 1.5, otK: 0.05,   // simulated games: goals per team per minute, how much a rating point is worth, home bonus, overtime edge
             drift: 3,                                // team ratings wander by up to this much between seasons
             periodChoices: [120, 180, 300, 480, 900],  // seconds per period you can pick for your own games
             cupName: 'Volt Hockey World Cup' },
  camera:  { rtW: 2000, rtH: 1400, topEdge: -20, follow: 5, look: 0.28, maxLead: 3.5, margin: 0.8, snapDistance: 12 },   // the view follows the ball: how fast, how far ahead of its movement, how much board shows past the end, when to jump instead of glide
  creaseIdle: { seconds: 3 },                                                    // a ball left untouched in a crease this long is reset to centre
  ballTrap:{ seconds: 5, maxSpeed: 0.5, clearRadius: 3 },
  formation: { guardStandoff: 1.2, fieldX: 10, fieldSpread: 3, benchReturnX: 5 },

  // CPU tuning. Distances in metres, times in seconds, angles in radians.
  ai: { refSpeed: 15 / 3.6,    // careful play (dribbling, aiming, cupping a ball) was tuned at this top speed in m/s; those speeds are rescaled so faster carts still handle the ball gently
        brainMin: 0.05, brainScale: 0.6, controlHz: 60,        // how often the team brain re-plans / carts re-steer
        arriveRadius: 1, arriveStop: 0.25, faceCreep: 0.18, aimCreep: 0.85, sepRadius: 1.6, sepWeight: 1.2, boardSoft: 0.45, safeClosing: 2.0,
        netPad: 0.3, laneBlock: 0.42,   // laneBlock: how close a cart must be to a pass/shot line to block it
         wallMargin: 0.6, pocketReach: 0.2,
        shotSpeed: 8, rangeFactor: 1.0, shootThreshold: 0.12, huntRange: 3, goodShot: 0.22, goodShotBonus: 0.45,   // a clear look at the net (score above goodShot) is simply taken,
         passThreshold: 0.3, dribbleStand: 3.4, aimTolerance: 0.07, planHold: 0.35, aimCommit: 1.5, pressureDist: 1.4, phaseHold: 0.5, useGoalie: true, goalieStand: 0.85, goalieShade: 0.4, goalieAdvance: 1.0, goalieAdvanceRange: 9, goalieXDead: 0.3, goalieXMax: 0.2, goalieEdge: 0.15, goalieReact: 1.5, goalieBrake: 0.6, goalieHome: 0.6, goalieXPull: 0.6, goalieAlign: 0.45, goalieTurnSpeed: 0.8, goalieClearRange: 2.6, goalieClearSpeed: 2.0, goalieClearFoe: 2.2, goalieNoise: 5, goalieNoiseEvery: 0.5,   // the goalie: where it stands, how it shades and tracks, when it steps out to clear
        carryMinX: 0.3, carryMaxX: 1.2, carryHalf: 0.65, carryRelSpeed: 3.5,   // carry*: the ball counts as ours while it is this close in front of the cup   // shotSpeed = typical spin-shot ball speed
        crashDepth: 3.3, creasePad: 0.9, crashClear: 0.4, guardCut: 0.7, markLane: 1.1, tackleMin: 0.75, tackleRange: 3.2, wingWide: 4.2, wingBack: 0.8, rushClear: 3.2, rushSpeed: 1.0, brakeShare: 0.6, brakeMargin: 0.3, creaseStand: 0.35, oneTimerMin: 0.16, oneTimerTurnSpeed: 0.5, oneTimerSquare: 4.5, oneTimerMinBall: 1.5, oneTimerFaceTol: 0.7, oneTimerRange: 0.55, oneTimerSeconds: 1.2, oneTimerAlign: 0.3,   // creasePad: AI keeps this far outside the crease it must not enter
         crashSpread: 1.7, screenRange: 5.5, screenDist: 1.7, pressDist: 1.6, markDist: 1.3, guardStandoff: 1.3, guardReach: 1.7, roleStick: 1.0,
        outletMin: 3.5, outletMax: 6, chaseBehind: 1.1, swingRange: 2.5, dribbleSpeed: 0.6, cupOffset: 0.15, cupApproachMin: 0.55, cupApproachRamp: 4,
        // swingRange: nearer than this, approach the ball directly instead of swinging round behind it. cupOffset: aim this far to one side of the ball so it lands beside the stem.
        // Scooping a ball off the boards: line up on a lane about scoopAngle to the board, then drive the cup through the ball.
        scoopSlant: 0.87, scoopOffset: 0.3, scoopRunUp: 3, scoopRunMin: 1.5, scoopFaceSpeed: 1, scoopExitMin: 0.3, scoopPeelRate: 1.6, scoopPeelSeconds: 1.0, scoopPeelSpeed: 1, pinnedBallDistance: 0.8, pinnedBallSpeed: 2, scoopYield: 0, scoopAngle: 1.5708, scoopStage: 1.1, scoopEngage: 0.55, scoopThrough: 0.15,
        scoopCommit: 1.2, scoopAlign: 0.35, scoopApproachSpeed: 0.4, scoopLiftSpeed: 0.55, clearSeconds: 2.5, clearAlong: 1.5, carryTurnRate: 2.0, liftDistance: 0.7,   // carryTurnRate: rad/s a cart may turn while the ball is in its cup (faster flings the ball out)
        scoopLaneWidth: 0.45, scoopStageTolerance: 0.3, scoopMargin: 0.47, nearBoardDistance: 1.2,
        // Getting unstuck: a cart pushing into the boards (or a ball pinned on them) for this long backs off toward the middle.
        stuckSpeed: 0.35, stuckSeconds: 0.8, stuckMinDistance: 1.2, ballStallSeconds: 1, escapeSeconds: 1.4, escapeDistance: 4, escapeJitter: 1.5,
        idleSpeed: 0.15, idleRange: 4, idleSeconds: 1.5,   // a chaser that sits still near a ball that isn't moving for this long backs off and re-approaches
        aimToleranceMax: 0.35, clearTolerance: 0.4, shotHalfWidth: 0.9, passHalfWidth: 0.6,   // how crooked a shot / pass may be and still be taken (see aimTolerance for the minimum)
        maxAimTurn: 1.4, aimFastErr: 0.9,   // maxAimTurn: the most a cart will turn (rad) to line up a shot or pass while holding the ball
        driveSpeed: 0.95, driveEdge: 0.6, driveDepth: 0.4, driveClear: 0.95, driveTight: 0.45, driveCloseRange: 3.6, edgeRange: 0.7, passIdleShare: 0.05, swerveDist: 1.0, swervePass: 1.3,   // driving the ball into the net: speed, how far inside the posts to aim, how clear a lane must be
        clearOnlyBehind: 0.5, carrierMinSlow: 0.7,
        patience: 1.6, forcedShot: 0.3, aimTurnRate: 4.5,   // patience: seconds of attacking with the ball before a blocked-lane shot is taken anyway (rebounds are crashed); aimTurnRate: rad/s while lining up a shot or pass
        dwellSeconds: 2.5, standoffRange: 0, faceoffRadius: 0, standoffBallSpeed: 0.8, standoffSpeed: 0.8, slipSeconds: 0.9, slipSide: 1.3, slipAhead: 0.5, dwellMove: 1.0, dwellRange: 1.4,   // a cart that hangs around the ball for dwellSeconds without it travelling dwellMove metres backs off and tries again
        goalieBlockRange: 8, goalieShadeNear: 1.0, goalieTight: 3.5, goalieMinSpeed: 0.9, cornerPad: 0.55, supportAhead: 2.2, supportSide: 0.8, coverDist: 3.2, brainRange: 12, brainMinAhead: 0.5, crashRange: 8, crashMinAhead: 1.5, crashMinLook: 0.1, crashHold: 1.2, crashAlign: 1.1, bombardMin: 0.05, bombardRange: 9, wallContact: 0.06, wallPushStick: 0.2, wallPushSeconds: 0.8 },

  /* Online services (accounts, leaderboard, friends, messages): url '' = the site the game is served from (your Netlify site, see netlify.toml).
     If the game is embedded somewhere else (e.g. a Wix page), put your Netlify site's address here, e.g. 'https://volt-hockey.netlify.app'. */
  server:  { url: '', syncSeconds: 10, idleSyncSeconds: 30 },   // how often a logged-in player checks friends / invites (each check is one Netlify Function call)

  // Online play: one player hosts the match, up to five more join by room code. Everything runs in the browser over WebRTC (PeerJS).
  online: { protocol: 2, maxPlayers: 6, maxGuests: 3, roomPrefix: 'volthockey1-', codeLength: 5, codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
         snapshotHz: 60, inputHz: 60, interpDelayMs: 100, extrapolateMaxSeconds: 0.25, predictStep: 1 / 120,
         fadeRate: 14, fadeMax: 3,   // how fast a new snapshot's disagreement is faded out (per second), and the size of disagreement that is a reset rather than a fade
         correction: 0.35, correctionRate: 12, snapDistance: 1.5,                       // how hard a player's own cart is pulled toward the host's version of it
         helloTimeoutMs: 5000, joinTimeoutMs: 10000, silenceTimeoutMs: 6000, pingEverySeconds: 2,
         directory: { id: 'directory', heartbeatMs: 4000, expireMs: 14000, listTimeoutMs: 12000, refreshMs: 3500, maxRooms: 60, nameMax: 28,   // the public room list: see DirectoryPublisher in net.js
                      names: ['Friendly match', 'Open scrimmage', '3v3 showdown', 'Practice room', 'Casual play', 'Competitive', 'Newbies welcome', 'Late-night volt'] },
         peerServer: {},                                            // empty = PeerJS's free public broker. Self-hosted: { host: 'my.server', port: 443, path: '/', secure: true }
         iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },  // add a TURN server here if players on strict networks can't connect

  frozen:  { enabled: false, seconds: 5, maxSpeed: 0.3, dotX: 6.5, dotY: 4.2, clearRadius: 1.4 },   // a ball that has not moved for this long is dropped at the nearest face-off spot
  stats:   { shotSpeed: 2.5, shotRange: 9, shotMargin: 0.4, shotCooldown: 1 },   // what counts as a shot on net
  playerNames: ['Sparky','Bolt','Turbo','Nitro','Ace','Rocket','Blaze','Zap','Comet','Maverick','Viper','Storm','Dash','Titan','Echo','Pixel','Jolt','Rogue','Flash','Gizmo'], nameMax: 12,   // presets to pick from; players can also type their own

  audio:   { musicHeadroom: 0.5, realMusicGain: 1 },   // headroom scales the 8-bit tunes, realMusicGain your own music files

  // Five speed modes, as a fraction of chair.maxSpeed. RB steps up, LB steps down.
  speedLevels: [0.2, 0.4, 0.6, 0.8, 1],
  // Faux-3D look: a light from the upper left throws shadows to the lower right. All in metres on the court.
  look:    { shadowDx: 0.16, shadowDy: 0.2, shadowAlpha: 0.35, ballShadowDx: 0.05, ballShadowDy: 0.07, bodyLift: 0.09, sideShade: 0x0b0f12, boardRim: 0xa07a4a, boardRimWidth: 0.12, innerShadowSteps: 6, innerShadowWidth: 0.7, innerShadowAlpha: 0.07, ballHighlight: 0.35 },
  render:  { smooth: true, tagFade: { alpha: 0.12, margin: 10, speed: 14 }, ringWidth: 0.07, ringOffset: 0.1, ringGapRadians: 0.18, ringDimAlpha: 0.22 },
  /* The 3D view (src/view3d.js, Three.js). Heights in metres above the floor; angles in degrees; follow rates per second (higher = snappier).
     The camera button (View / R3, T, P, or the eye on the touch pad) steps through `cycle`; '2d' is the original flat view and is only offered to a lone player.
     'third' and 'broadcast' are left out unless turned on (Settings.allowThird / allowBroadcast, in Settings > Camera and graphics). */
  view3d: {
    cycle: ['first', 'third', 'broadcast', '2d'],
    names: { first: 'First person', third: 'Third person', broadcast: 'Broadcast (3D)', '2d': 'Classic 2D' },
    arena:   { boardHeight: 0.5, boardThickness: 0.14, rimHeight: 0.05, floorPxW: 2048, floorPxH: 1024, outerFloor: 0x2a2f34, fog: 0x0d151b, fogNear: 30, fogFar: 80,
               stepBase: 0.45, stepRise: 0.42, railHeight: 0.95, backWall: 2.6, endWallGap: 6, endWallHeight: 4 },
    // The sin bin: a penalty box at the boards on the far side, one for each team either side of centre, where benched carts sit and watch.
    sinBin:  { width: 3.2, depth: 2.5, gap: 1.0, slotX: 0.75, slotStep: 1.0, slotY: 1.0, glass: 1.75 },
    cart:    { seatX: -0.38, backHeight: 0.62, backWidth: 0.4, backTilt: 0.13, wheelX: -0.3 },   // the look of the chair (cart space: +x forward); seatX = seat centre, behind the cart's centre
    net:     { height: 0.62, backHeight: 0.42, post: 0.035, postColor: 0xd8392b, meshColor: 0xffffff },
    first:   { eyeX: -0.43, eyeY: 1.16, pitch: -29, follow: 22, maxTurn: 7.5 },              // eyeX: from the cart's centre, forwards; maxTurn: rad/s cap so a spin shot does not whip the view
    third:   { height: 0.4, heightPerMetre: 1.9, lookAhead: 1.0, lookHeight: 0, fov: 55,   // height = height + heightPerMetre x chase distance: steep enough to see over the driver to the blade
               follow: 6, maxTurn: 6, posFollow: 10, keepIn: 1.0 },   // distance behind the cart is the Chase distance setting
    broadcast: { height: 10, back: 8.5, fov: 40, follow: 3, xRange: 0.3, lookBias: 0.35, narrowFov: 1.45 },   // a TV camera high on the near side, sliding along to follow the ball
    ball:    { minPx: 6, haloInner: 0.075, haloOuter: 0.11, haloAlpha: 0.35 },
    // Cart-relative steering (first and third person): stick forward drives, left / right turns at a rate set by how far you push.
    steer:   { dead: 0.12, turnDead: 0.1, forwardDead: 0.2, pivotSpeed: 0.13, turnCurve: 1.35, aimLead: 0.18 },
    tags:    { height: 1.75, near: 5, minScale: 0.5, maxScale: 1.15 },
    minimap: { x: 1102, y: 8, scale: 6.1, alpha: 0.82 },
    quality: { High:   { pixelRatio: 2,    shadows: true,  shadowMap: 2048, fans: true },
               Medium: { pixelRatio: 1.25, shadows: true,  shadowMap: 1024, fans: true },
               Low:    { pixelRatio: 0.8,  shadows: false, shadowMap: 512,  fans: false } },
    // Right stick: look around. First person turns your head (yaw / pitch in degrees); third person swings the camera round the cart. Let go and it springs back.
    look:    { yaw: 115, up: 35, down: 55, orbit: 180, lift: 1.4, follow: 11 },
    shake:   { seconds: 0.35, metres: 0.08 }, maxFov: 92
  },
  // Starting values of the settings that can also be changed in the menus.
  defaults: { masterVolume: 1, voiceVolume: 1, micVolume: 1, micMonitor: false, voiceMode: 'open', lockCart: false, invertLook: false, lookH: 0.7, lookV: 1, camMode: 'first', allowThird: false, allowBroadcast: false, fov3d: 74, chaseDist: 2, speedLevel: 5, speedCap: 5, ballBounce: 0.1, ballGrip: 30, stickLength: 0.26, ballFriction: 1.6, adapt: true, sizeA: 3, sizeB: 3, collisions: true, penalties: true },

  // Slider limits used by the settings menus.
  ranges:  { masterVolume: { min: 0, max: 1, step: 0.05 }, voiceVolume: { min: 0, max: 1, step: 0.05 }, micVolume: { min: 0, max: 2, step: 0.1 }, musicVolume: { min: 0, max: 1, step: 0.05 }, sfxVolume: { min: 0, max: 1, step: 0.05 },
             turnSpeed:   { min: 0.5, max: 2, step: 0.1 }, lookH: { min: 0.2, max: 2, step: 0.1 }, lookV: { min: 0.2, max: 2, step: 0.1 }, timeSpeed: { min: 0.5, max: 10, step: 0.5 },
             speedLevel:  { min: 1, max: 5, step: 1 }, speedCap: { min: 1, max: 5, step: 1 }, ballBounce: { min: 0, max: 1, step: 0.05 },
             ballGrip:    { min: 0, max: 30, step: 2 }, ballFriction: { min: 0, max: 4, step: 0.1 },
             zoomPct: { min: 70, max: 150, step: 5 }, fov3d: { min: 60, max: 100, step: 5 }, chaseDist: { min: 1.5, max: 6, step: 0.5 }, tiltDeg: { min: 0, max: 60, step: 5 }, commentVolume: { min: 0, max: 1, step: 0.1 }, crowdVolume: { min: 0, max: 1, step: 0.1 }, sizeA: { min: 0, max: 5, step: 1 }, sizeB: { min: 0, max: 5, step: 1 }, stickLength: { min: 0.1, max: 0.5, step: 0.02 } },

  // CPU skill levels, easiest to hardest. Every level plays as a team (roles, passing, shooting); the harder ones do it faster and better.
  //  speed: share of full stick used      turnBoost: turning speed multiplier      reaction: seconds between decisions
  //  aimError: radians of shot/pass noise passWill / shootWill: how readily it passes / shoots (0-1)
  //  setup: values passes that set up a teammate's shot    lead: how far ahead it reads the ball    pressure: defensive aggression
  //  laneMargin: extra room (m) it wants around a pass or shot lane beyond a cart's own width; bolder players thread tighter gaps
  learn: { samplesForFull: 12, minReleaseSpeed: 4, shotSlack: 1.2, passCos: 0.93, laneRate: 0.25, passRate: 0.15, sideEvery: 15, sideRate: 0.03, saveEvery: 20, laneShade: 1.0, sideShade: 0.5, passMark: 0.8 },   // what the CPU watches in human play, and how strongly it reacts
  difficulties: {
    Easy:      { brain: 1, brainNoise: 0.6, bombard: 0.6, crash: 0.3, adapt: 0, speed: 0.76, turnBoost: 1.00, reaction: 0.28, aimError: 0.18,  passWill: 0.35, shootWill: 0.60, setup: 0.10, lead: 0.10, pressure: 0.40, laneMargin: 0.45 },
    Normal:    { brain: 1, brainNoise: 0.4, bombard: 0.75, crash: 0.5, adapt: 0.35, speed: 0.85, turnBoost: 1.05, reaction: 0.20, aimError: 0.09,  passWill: 0.65, shootWill: 0.82, setup: 0.40, lead: 0.28, pressure: 0.72, laneMargin: 0.35 },
    Hard:      { brain: 1, brainNoise: 0.2, bombard: 0.88, crash: 0.7, adapt: 0.7, speed: 0.95, turnBoost: 1.15, reaction: 0.11, aimError: 0.05,  passWill: 0.82, shootWill: 0.94, setup: 0.62, lead: 0.42, pressure: 0.86, laneMargin: 0.25 },
    Pro:       { brain: 1, brainNoise: 0.08, bombard: 1, crash: 0.9, adapt: 1, speed: 1.00, turnBoost: 1.25, reaction: 0.08, aimError: 0.035, passWill: 0.90, shootWill: 1.00, setup: 0.80, lead: 0.50, pressure: 0.90, laneMargin: 0.18 },
    Superstar: { brain: 1, brainNoise: 0, bombard: 1, crash: 1, adapt: 1, speed: 1.00, turnBoost: 1.40, reaction: 0.04, aimError: 0.015, passWill: 1.00, shootWill: 1.00, setup: 1.00, lead: 0.65, pressure: 1.00, laneMargin: 0.10 },
    Legend:    { brain: 1, brainNoise: 0, bombard: 1, crash: 1, adapt: 1, speed: 1.00, turnBoost: 1.65, reaction: 0.02, aimError: 0.004, passWill: 1.00, shootWill: 1.00, setup: 1.00, lead: 0.85, pressure: 1.00, laneMargin: 0.05 }
  }
};
