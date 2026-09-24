# Rebuilds the site with your live API URL baked in and zips it for Netlify Drop.
# Usage:  powershell -File tools/make-drop-zip.ps1 -ApiUrl https://your-api.onrender.com
param(
  [Parameter(Mandatory = $true)][string]$ApiUrl
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location (Join-Path $root 'client')
$env:VITE_API_URL = $ApiUrl
npm run build
Pop-Location

$zip = Join-Path $root 'crown-clipper-site.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $root 'client\dist\*') -DestinationPath $zip
Write-Host "Done: $zip  (drop it on https://app.netlify.com/drop)"
