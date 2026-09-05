$src = "C:\Users\SSTecnol\Desktop\TMP\AgroLinhasPro\agrolinhaspro"
$dst = "C:\Users\SSTecnol\Desktop\Projects\agri-linhas-plantio"

Write-Host "=== 1. CHECKING MEMORIAL PARSER ==="
Get-Content (Join-Path $src "js\modules\memorialParser.js") -Head 60

Write-Host "`n=== 2. CHECKING GUIDANCE ENGINE DIFFS ==="
$geSrc = Get-Content (Join-Path $src "js\modules\guidanceengine.js") -Raw
$geDst = Get-Content (Join-Path $dst "js\modules\guidanceEngine.js") -Raw
Write-Host "TMP Guidance Engine Length: $($geSrc.Length) chars | Current Length: $($geDst.Length) chars"

# Find functions in TMP guidanceengine
$matchesSrc = [regex]::Matches($geSrc, "(\w+)\s*\([^)]*\)\s*\{")
Write-Host "TMP guidance methods: $(($matchesSrc | ForEach-Object { $_.Groups[1].Value }) -join ', ')"
$matchesDst = [regex]::Matches($geDst, "(\w+)\s*\([^)]*\)\s*\{")
Write-Host "Current guidance methods: $(($matchesDst | ForEach-Object { $_.Groups[1].Value }) -join ', ')"
