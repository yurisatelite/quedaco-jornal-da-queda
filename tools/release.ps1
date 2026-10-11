param([switch]$Public)
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
$Manifest=Get-Content -Raw (Join-Path $Root 'module.json') | ConvertFrom-Json
& npm test
if($LASTEXITCODE-ne 0){exit $LASTEXITCODE}
& node (Join-Path $PSScriptRoot 'package.mjs')
if($LASTEXITCODE-ne 0){exit $LASTEXITCODE}
$Dist=Join-Path $Root 'dist'
$PackageRoot=Join-Path $Dist ("{0}-{1}" -f $Manifest.id,$Manifest.version)
$Source=Join-Path $PackageRoot $Manifest.id
$Zip=Join-Path $Dist 'quedaco-jornal-da-queda.zip'
Remove-Item -LiteralPath $Zip -Force -ErrorAction SilentlyContinue
Compress-Archive -Path $Source -DestinationPath $Zip -CompressionLevel Optimal
Copy-Item -LiteralPath (Join-Path $Root 'module.json') -Destination (Join-Path $Dist 'module.json') -Force
Write-Host "Release pronta: $Zip"
