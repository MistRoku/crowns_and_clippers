# 02 — Running the project locally (in Zed)

The project is two apps that talk to each other:

```
┌─────────────────────────┐   HTTP (JSON)   ┌──────────────────────────────┐
│  React app (Vite)       │ ──────────────► │  ASP.NET Core Web API        │
│  http://localhost:5173  │                 │  http://localhost:5000       │
└─────────────────────────┘                 │  + SQLite file (auto-created)│
                                            └──────────────────────────────┘
```

## 1. Open the project in Zed

Zed → `File → Open Folder…` → choose the `crown-and-clipper` folder.

You should see this tree in the project panel:

```
crown-and-clipper/
├─ client/          ← React frontend
├─ server/          ← C# API
├─ docs/
├─ tools/
├─ Dockerfile
├─ smoke-test.mjs
└─ README.md
```

Open the terminal inside Zed with `` Ctrl+` `` (you can open several — one per app).

## 2. Start the C# API (terminal 1)

```powershell
cd server\CrownAndClipper.Api
dotnet run
```

First run restores NuGet packages (~30 s). You should see:

```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://0.0.0.0:5000
```

What just happened automatically:

- SQLite database `crownclipper.db` created next to the project (EF Core `EnsureCreated`)
- Services, barbers seeded from `Data/DbSeeder.cs`
- Swagger enabled (development only) at **http://localhost:5000/swagger**

Quick manual check (new terminal or browser):

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5000/api/services | ConvertTo-Json -Depth 4
```

## 3. Start the React app (terminal 2)

```powershell
cd client
npm install     # first time only
npm run dev
```

You should see:

```
  VITE v5.x  ready in 400 ms
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. The frontend reads the API URL from
`VITE_API_URL` (defaults to `http://localhost:5000` when unset, see
`client/.env.development.example` — copy it to the git-ignored
`client/.env.development` if you need to point at a different API), so the two
apps are already wired together.

## 4. Things to try while developing

| Try it | Where |
| --- | --- |
| Full booking journey | Home → *Book an Appointment* → 4 steps → confirmation → **Add to calendar** |
| Live availability | Booking step 3: pick a date, watch slots load from `/api/availability` |
| Double-booking protection | Book the same barber+slot in two browser windows — the second gets a friendly 409 message |
| Offer popup | Appears after ~4.5 s on first visit; dismiss it and refresh — it stays dismissed (localStorage) |
| Swagger API explorer | http://localhost:5000/swagger (development only) |
| API smoke test | `node smoke-test.mjs` from the repo root while the API runs |
| Type check | `cd client; npx tsc` (strict mode, no errors expected) |
| Production build | `cd client; npm run build` → outputs `client/dist` |

## 5. Zed productivity tips for this stack

- **Command palette**: `Ctrl+Shift+P` — everything is searchable ("terminal", "extensions", "reload window"…).
- **Multiple terminals**: terminal panel → `+` splits a new one; keep API in one, Vite in another.
- **C# extension**: installs the Roslyn language server; you get red squiggles in controllers as you type.
- **TypeScript**: built-in; Zed auto-installs the TS language server the first time you open a `.tsx` file.
- **Prettier/formatting**: Zed formats on save where a formatter exists (TypeScript yes; C# via the extension).
- **Project search**: `Ctrl+Shift+F` — great for finding where a requirement is implemented
  (try searching `FIRSTCUT10` or `DTSTART`).

## 6. Common issues

| Symptom | Fix |
| --- | --- |
| `dotnet: command not found` after install | Close & reopen PowerShell (PATH refresh), or reboot |
| Port 5000 already in use | Stop the other app, or change `PORT` env var: `$env:PORT="5050"; dotnet run` and set `VITE_API_URL` in your local `client/.env.development` |
| Browser shows "can't reach our booking server" | API not running / wrong `VITE_API_URL`; check terminal 1 and restart Vite after editing local `.env` files |
| Vite cache weirdness | `cd client; Remove-Item -Recurse node_modules\.vite; npm run dev` |
| Database in a weird state | Stop API, delete `server\CrownAndClipper.Api\crownclipper.db`, run again (it re-seeds) |

Next: [03 — Deployment (GitHub → Render + Netlify) →](03-deployment.md)
