# Putting Volt Hockey online (Netlify, free)

The game is plain files. The online services (accounts, saved progress, the global leaderboard, friends, messages, invites)
are **one Netlify Function** (`netlify/functions/api.mjs`) that stores its data in **Netlify Blobs**. Both come free with your
Netlify site, so there is nothing else to sign up for. Parties, room chat and voice chat go directly between players' browsers
(WebRTC through the free PeerJS server, the same way online rooms always have).

## One-time: deploy with functions

Drag-and-drop deploys only upload files, not functions. Use **one** of these:

**A. Git (recommended, then every push deploys itself)**
1. Put this folder in a GitHub repo (`git init`, commit, push).
2. In Netlify: *Add new site > Import an existing project*, pick the repo. If your current site should keep its address,
   open that site instead: *Site configuration > Build & deploy > Link repository*.
3. Leave the build settings alone: `netlify.toml` already says what to do (publish this folder, install `@netlify/blobs`,
   functions in `netlify/functions`). Deploy.

**B. Command line (no Git)**
```
npm install
npx netlify-cli login
npx netlify-cli link        # choose your existing Volt Hockey site
npx netlify-cli deploy --prod
```

Check it worked: open `https://<your-site>.netlify.app/api/leaderboard`. You should see `{"cups":[],"wins":[],...}`.

## If the game is embedded somewhere else (e.g. your Wix page)

The game finds the services on the site it was loaded from. If it is shown inside another site, tell it where they are, either:
- in `src/config.js`: `server: { url: 'https://<your-site>.netlify.app', ... }`, or
- add `?server=https://<your-site>.netlify.app` to the game's address in the embed.

## Free limits (plenty for a community game)

- Netlify Functions: 125,000 calls a month on the free plan. A logged-in player online uses about 6 calls a minute
  (the friends list refreshes every 10 seconds, every 30 when the tab is hidden; `CONFIG.server.syncSeconds`). That is roughly
  350 player-hours a month. Raise `syncSeconds` to stretch it. Guests use none.
- Netlify Blobs: free storage, far more than accounts and leaderboards need.
- Voice and parties use the free public PeerJS server. On some strict networks (some schools and offices) players cannot connect
  to each other; adding a TURN server in `CONFIG.online.iceServers` fixes that (free tiers exist, e.g. metered.ca Open Relay).

## Moderation

- Reports are saved in Netlify Blobs under keys starting `r/`. View them in the Netlify UI: *Site > Blobs > volt-hockey*.
- Chat is filtered for swearing (`src/chatfilter.js`; add words there). Players can mute, block and report from the chat.
- Under-18 players (by the age they declare at sign-up) only text and voice chat with accepted friends. Guests only have quick chat
  and no voice. Only "under 18 / 18 and over" is stored, never the age or birthday.

## Testing on your own machine

```
cd server
npm install
node dev-server.mjs          # http://localhost:8888  (add ?peer=local to also use its own PeerJS server)
node test-api.mjs            # the service tests
```
`dev-server.mjs` runs the same API code as the Netlify Function, keeping data in `server/.data/`.
