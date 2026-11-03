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

## Password reset emails (free)

"Forgot password" emails a reset link. To turn it on (until then players see "isn't set up yet"; everything else works):
1. Make a free account at **brevo.com** (300 emails a day free). Under *Senders*, add and verify the address the emails come from
   (your own email address is fine).
2. Under *SMTP & API > API keys*, create an API key.
3. In Netlify: *Site configuration > Environment variables*, add `EMAIL_API_KEY` (the key), `EMAIL_FROM` (the verified address) and,
   if you like, `EMAIL_FROM_NAME` (e.g. Volt Hockey). Redeploy (*Deploys > Trigger deploy*).
(Prefer Resend? Use its key and also set `EMAIL_PROVIDER` = `resend`; it needs your own domain verified.)

## If the game is embedded somewhere else (e.g. your Wix page)

The game finds the services on the site it was loaded from. If it is shown inside another site, tell it where they are, either:
- in `src/config.js`: `server: { url: 'https://<your-site>.netlify.app', ... }`, or
- add `?server=https://<your-site>.netlify.app` to the game's address in the embed.

## Free limits (plenty for a community game)

- Netlify Functions: 125,000 calls a month on the free plan. A logged-in player online uses about 6 calls a minute
  (the friends list refreshes every 10 seconds, every 30 when the tab is hidden; `CONFIG.server.syncSeconds`). That is roughly
  350 player-hours a month. Raise `syncSeconds` to stretch it. Guests use none.
- Netlify Blobs: free storage, far more than accounts and leaderboards need.
- Voice, parties and online rooms connect players' browsers directly (WebRTC through the free public PeerJS server). Between two
  home networks this usually works, but some routers, phone networks, schools and offices block direct connections: then voice shows
  "can't connect" in the friends panel. A **TURN relay** fixes that. Get free TURN credentials (for example metered.ca's free tier,
  or Cloudflare's TURN service), then in Netlify add an environment variable and redeploy:
  `ICE_SERVERS` = `[{"urls":"turn:<host>:443?transport=tcp","username":"<user>","credential":"<password>"}]`
  The game picks it up automatically; nothing else to change.

## Admin page (manage players and data)

1. In Netlify: *Site configuration > Environment variables*, add `ADMIN_USER` (any name you like) and `ADMIN_PASSWORD`
   (a long password, 12+ characters). Redeploy (*Deploys > Trigger deploy*).
2. Go to `https://<your-site>.netlify.app/admin.html` and log in with those.

There you can search players, change their email or 18+ flag, suspend them (they can't log in), reset their password,
edit career numbers, delete them, read and clear reports, and browse or edit every stored item as JSON.
Until the two variables are set the admin page refuses all logins. After 10 wrong passwords it locks for 10 minutes.
To change the admin password, change `ADMIN_PASSWORD` and redeploy; that also logs out any open admin sessions.

## Moderation

- Reports show on the admin page's *Reports* tab (stored in Netlify Blobs under keys starting `r/`).
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
