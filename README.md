# Coffee Wheel

A weighted spin-the-wheel for Visibuild's coffee club: it picks who chooses the café, posts the result to Slack, and lets admins manage people and weights. Sign-in is restricted to `@visibuild.com` Google accounts.

Stack: Next.js, Auth.js, Drizzle + Postgres (Neon in production, PGlite locally), Slack Web API.

## Local development

Requires Node 24 (`nvm use` reads `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # skip if you already have one
npm run dev                  # http://localhost:3000
npm test
```

In `.env.local`:

- `DATABASE_URL=pglite:./.pglite` runs an embedded database that migrates itself.
- `AUTH_DEV_LOGIN=1` enables an email-only dev login (any `@visibuild.com` address). It is disabled whenever `NODE_ENV=production`.
- Set `AUTH_SECRET` (`npx auth secret`) to a **different** value from production. The dev login mints sessions for any `@visibuild.com` email, so a shared secret would let a local session be replayed against production.

## Google OAuth

1. In the [Google Cloud console](https://console.cloud.google.com/), open **Google Auth Platform**.
2. **Branding**: fill in the app name and support email.
3. **Audience**: choose **Internal**.
4. **Clients** → Create client → **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` and `https://<app>.vercel.app`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<app>.vercel.app/api/auth/callback/google`
5. Leave scopes at the defaults (`openid`, `email`, `profile`).
6. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

## Slack app

1. [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest**, pick the workspace, and paste:

   ```yaml
   display_information:
     name: Coffee Wheel
     description: Spins the wheel to pick who chooses coffee club
   features:
     bot_user:
       display_name: Coffee Wheel
       always_online: false
   oauth_config:
     scopes:
       bot:
         - emoji:read
         - chat:write
         - files:write
         - users:read
         - users:read.email
   settings:
     org_deploy_enabled: false
     socket_mode_enabled: false
     token_rotation_enabled: false
   ```

2. **Install to Workspace** (this may need workspace admin approval).
3. Copy the **Bot User OAuth Token** (`xoxb-…`) into `SLACK_BOT_TOKEN`.
4. In the coffee club channel run `/invite @Coffee Wheel` (private channels work too).
5. Open the channel's details and copy the **Channel ID** (`C…`) into `SLACK_CHANNEL_ID`.

## Database (Neon)

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Run the migrations against it. `drizzle-kit` does not load `.env.local`, so pass `DATABASE_URL` explicitly:

   ```bash
   DATABASE_URL='postgres://USER:PASSWORD@HOST/DBNAME?sslmode=require' npm run db:migrate
   ```

The seed migration makes `dave@visibuild.com` the first admin; he can add other admins in the app.

## Deploy to Vercel

1. Import the repo into Vercel and set the project's Node.js version to **24.x** (Settings → General).
2. Add environment variables:

   | Variable | Value |
   | --- | --- |
   | `AUTH_SECRET` | output of `npx auth secret` (unique to production) |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | from Google |
   | `DATABASE_URL` | Neon pooled connection string |
   | `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` | from Slack |
   | `CRON_SECRET` | any long random string |

   Do **not** set `AUTH_DEV_LOGIN` in Vercel.
3. Deploy.

The cron in `vercel.json` refreshes the Slack custom emoji list daily. Trigger the first refresh manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/slack-emoji
```

## Custom domain (optional)

After adding a domain in Vercel, add its origin (`https://coffee.example.com`) to the Google client's JavaScript origins and `https://coffee.example.com/api/auth/callback/google` to its redirect URIs.

## Hosting notes

Vercel's Hobby plan is intended for non-commercial use; check its terms or use a paid plan for a company deployment. Nothing else is Vercel-specific: apart from the daily cron in `vercel.json`, it runs anywhere that hosts Next.js (schedule a call to the cron route elsewhere).
