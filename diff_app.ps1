$src = "C:\Users\SSTecnol\Desktop\TMP\AgroLinhasPro\agrolinhaspro"
$dst = "C:\Users\SSTecnol\Desktop\Projects\agri-linhas-plantio"

Write-Host "=== CHECKING TMP index.html FOR UNIQUE BUTTONS & CARDS ==="
$idxSrc = Get-Content (Join-Path $src "index.html") -Raw
$idxDst = Get-Content (Join-Path $dst "index.html") -Raw

# Find all id="..." in TMP index.html
$idsSrc = [regex]::Matches($idxSrc, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
$idsDst = [regex]::Matches($idxDst, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique

$missingIds = $idsSrc | Where-Object { $idsDst -notcontains $_ }
Write-Host "IDs in TMP index.html not in Current: $(($missingIds) -join ', ')"

Write-Host "`n=== CHECKING TMP app.js UNIQUE FUNCTIONS & FEATURES ==="
$appSrc = Get-Content (Join-Path $src "js\app.js") -Raw
$appDst = Get-Content (Join-Path $dst "js\app.js") -Raw

# Look for functions in TMP app.js
$fnSrc = [regex]::Matches($appSrc, 'function\s+(\w+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
$fnDst = [regex]::Matches($appDst, 'function\s+(\w+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
$missingFns = $fnSrc | Where-Object { $fnDst -notcontains $_ }
Write-Host "Functions in TMP app.js not in Current: $(($missingFns) -join ', ')"
