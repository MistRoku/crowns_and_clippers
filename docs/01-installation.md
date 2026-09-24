# 01 — Installation (Windows + Zed IDE)

You need three things: **Node.js** (runs the React tooling), the **.NET 8 SDK** (builds and
runs the C# API), and **Zed** (the editor). Everything installs with `winget`, which is
built into Windows 10/11.

Open **PowerShell** (Start menu → type "PowerShell") for all commands below.

---

## 1. Node.js (LTS)

```powershell
winget install -e --id OpenJS.NodeJS.LTS
```

Close and re-open PowerShell, then verify:

```powershell
node -v    # expect v20.x or v22.x
npm -v     # expect 10.x+
```

> Node is used for the React frontend (Vite dev server + production build). The C# side
> doesn't need it.

## 2. .NET 8 SDK

```powershell
winget install -e --id Microsoft.DotNet.SDK.8
```

Close and re-open PowerShell, then verify:

```powershell
dotnet --version    # expect 8.0.xxx
```

> The SDK includes the runtime, the `dotnet` CLI and the ASP.NET Core templates.
> If `winget` can't find it, download the installer from
> https://dotnet.microsoft.com/download/dotnet/8.0 (choose **SDK x64**).

First run: `dotnet` may print a welcome/telemetry message. You can disable telemetry with:

```powershell
setx DOTNET_CLI_TELEMETRY_OPTOUT 1
```

## 3. Zed IDE

Zed is fully supported on Windows (native build since late 2025):

```powershell
winget install -e --id ZedIndustries.Zed
```

Or download the installer from https://zed.dev/windows.

Verify it launches:

```powershell
zed --version
```

### Recommended Zed setup for this project

1. **Open the project folder**: Zed → `File → Open Folder…` → select `crown-and-clipper`.
2. **TypeScript/React** works out of the box — Zed downloads the TypeScript language
   server automatically the first time you open a `.ts`/`.tsx` file (needs internet once).
3. **C# support**: open the command palette (`Ctrl+Shift+P`) → type `zed: extensions` →
   search **C#** → Install. This gives you IntelliSense-style completions, go-to-definition
   and diagnostics for the ASP.NET Core project.
4. **Built-in terminal**: `` Ctrl+` `` opens a terminal inside Zed — you'll run the API and
   the React app from here (see the next doc).

## 4. Git (needed for deployment)

Git usually comes with winget on modern Windows; check with:

```powershell
git --version
```

If missing:

```powershell
winget install -e --id Git.Git
```

Then set your identity (used in commits and by GitHub):

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## 5. Accounts to create (free) — do this before deploying

| Service  | Why                                            | Sign up                          |
| -------- | ---------------------------------------------- | -------------------------------- |
| GitHub   | Hosts the repository Render/Netlify deploy from | https://github.com/signup        |
| Render   | Hosts the C# API (free tier)                    | https://render.com               |
| Netlify  | Hosts the React site (free tier) — your submitted URL | https://app.netlify.com/signup |

> Tip: sign up for Render and Netlify **with "Sign in with GitHub"** — it makes connecting
> the repository one click.

---

## Checklist before moving on

- [ ] `node -v` prints v20+ / `npm -v` prints 10+
- [ ] `dotnet --version` prints 8.0.xxx
- [ ] Zed opens and the C# extension is installed
- [ ] `git --version` works
- [ ] GitHub / Render / Netlify accounts created

Next: [02 — Running the project locally in Zed →](02-run-locally.md)
