# 03 — Deployment: GitHub → Render (API) → Netlify (site)

Target architecture (this is how real full-stack apps ship):

```
                https://crown-clipper.netlify.app        ← THE URL you submit
                ┌───────────────────────────┐
   browsers ──► │ Netlify: React build (SPA) │
                └─────────────┬─────────────┘
                              │ fetch https://<api>.onrender.com/api/...
                              ▼
                ┌───────────────────────────┐
                │ Render: ASP.NET Core (Docker) │  free tier
                └───────────────────────────┘
```

Order matters:

1. Push the repo to GitHub.
2. Deploy the **API** on Render (free tier) → you get `https://something.onrender.com`.
3. Deploy the **client** on Netlify, telling it the API URL → you get your public site URL.
4. Go back to Render and add the Netlify URL to **AllowedOrigins** (CORS) — then test everything.

> Free-tier note: Render's free web services sleep after ~15 idle minutes; the first
> request after a sleep takes ~30–60 s while the container boots. After that it's fast.
> Mitigation at the end of this doc.

---

## Step 1 — Push the repository to GitHub

Create an empty **private or public** repository on GitHub (no README), then:

```powershell
cd crown-and-clipper
git init
git add .
git commit -m "Crown & Clipper: React + ASP.NET Core barbershop website"
git branch -M main
git remote add origin https://github.com/<your-username>/crown-and-clipper.git
git push -u origin main
```

The `.gitignore` already excludes `node_modules`, `dist`, `bin/obj` and the SQLite file.

## Step 2 — Deploy the C# API on Render

1. Render dashboard → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Name**: `crown-clipper-api`
   - **Root directory**: leave blank (repo root)
   - **Runtime**: **Docker** (Render finds the `Dockerfile` at the repo root automatically)
   - **Instance type**: **Free**
3. **Environment variables** (Add Environment Variable):
   - `JWT_SECRET` = a long random value (required in Production; generate with
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`).
     Without it the API refuses to start.
   - `AllowedOrigins__0` = `http://localhost:5173` (keeps local dev working)
   - Optional email delivery: `SMTP__HOST`, `SMTP__PORT`, `SMTP__USERNAME`, `SMTP__PASSWORD`,
     `SMTP__FROM` (any SMTP provider). Without them, reminders still generate and appear in
     the admin outbox + in-app inboxes via the log transport.
   - `SITE_BASE_URL` = your Netlify URL (links inside reminder emails)
   - `Reminders__IntervalMinutes` = scheduler interval (default 5)
   - `AllowedOrigins__1` = your Netlify URL — you'll know it after step 3; for now put a
     placeholder like `https://placeholder.netlify.app` and edit it later.
   - ASP.NET env: `ASPNETCORE_ENVIRONMENT` = `Production`
4. Deploy. Render builds the Docker image (~2–4 min) and gives you a URL like
   `https://crown-clipper-api.onrender.com`.
5. Verify in a browser: `https://crown-clipper-api.onrender.com/api/health` → `{"status":"ok",...}`
   (first hit after idle may take up to a minute — that's the free-tier wake-up).

> **Why Docker?** The repo's `Dockerfile` builds the .NET SDK stage and runs the slim
> ASP.NET runtime image — identical on your machine and in the cloud, zero config.

### How CORS works here (important)

Browsers block cross-origin API calls unless the API allows the origin. `Program.cs`
reads the `AllowedOrigins` array from configuration; on Render, environment variables
named `AllowedOrigins__0`, `AllowedOrigins__1`, … fill that array. **The value must match
exactly**: scheme + host, no trailing slash — e.g. `https://crown-clipper.netlify.app`.

## Step 3 — Deploy the React client on Netlify

1. Netlify dashboard → **Add new site → Import an existing project → GitHub** → pick the repo.
2. Build settings (Netlify reads `client/netlify.toml`, but set the base directory):
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. **Environment variables** (Site configuration → Environment variables → Add):
   - `VITE_API_URL` = `https://crown-clipper-api.onrender.com` (your Render URL, no trailing slash)
4. Deploy. Netlify builds (~1 min) and gives you `https://<random-name>.netlify.app`.
5. Rename it: Site configuration → Change site name → e.g. `crown-clipper`
   → final URL `https://crown-clipper.netlify.app`.

The `netlify.toml` in the repo already handles the SPA redirect (`/* → /index.html`),
security headers and image caching, so React Router URLs like `/services` work on refresh.

## Step 4 — Wire CORS and re-deploy if needed

1. Render → your service → **Environment** → set `AllowedOrigins__1` to your exact Netlify
   URL (`https://crown-clipper.netlify.app`) → Save (Render redeploys automatically).
2. Wait for the redeploy, then run the full journey from the live site (see
   [04 — Testing checklist](04-testing-checklist.md)).

## Step 5 — Keep the free API awake (optional but recommended)

Reviewers may hit a cold container. Two easy mitigations:

- **Free cron ping**: create a free account on cron-job.org (or UptimeRobot) that GETs
  `https://crown-clipper-api.onrender.com/api/health` every 10 minutes.
- Or upgrade Render to the $7 Starter tier during the assessment week.

Either way the site itself (Netlify) is always instant — only API calls can be cold.

## Alternative: single-URL deployment (Azure App Service)

If you'd rather host everything on one origin (also fine, and avoids CORS entirely):

1. `cd client; npm run build` then copy `client/dist/*` into
   `server/CrownAndClipper.Api/wwwroot/`.
2. Deploy the API project to **Azure App Service** (free F1 tier) with the Azure VS Code
   extension or `az webapp up`. The API already serves `wwwroot` with an SPA fallback
   (`Program.cs`: `UseStaticFiles` + `MapFallbackToFile`), so one URL serves site + API.
3. In that mode set `VITE_API_URL` to an empty string before building (same origin).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Booking fails with "can't reach our booking server" | API asleep (wait ~1 min, retry) or down — check Render logs |
| Booking/availability fail with CORS error in console | `AllowedOrigins` missing the exact Netlify URL — fix env var, redeploy |
| Site shows fallback menu / "Showing our standard menu" banner | API unreachable from the browser — same as above |
| `/services` 404 on refresh at Netlify | Missing SPA redirect — ensure `client/netlify.toml` is committed and base directory is `client` |
| Images 404 | Publish directory wrong — must be `dist` **inside** `client` |

Next: [04 — Testing checklist before you submit →](04-testing-checklist.md)
