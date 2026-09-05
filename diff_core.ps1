$src = "C:\Users\SSTecnol\Desktop\TMP\AgroLinhasPro\agrolinhaspro"
$dst = "C:\Users\SSTecnol\Desktop\Projects\agri-linhas-plantio"

Write-Host "`n======================================================="
Write-Host "DIFF FOR guidanceengine.js (methods in TMP not in Current)"
Write-Host "======================================================="
$geSrc = Get-Content (Join-Path $src "js\modules\guidanceengine.js") -Raw
$geDst = Get-Content (Join-Path $dst "js\modules\guidanceEngine.js") -Raw
# Print from exportToGPX to the end of guidanceengine.js
$idxGPX = $geSrc.IndexOf("exportToGPX")
if ($idxGPX -ge 0) {
    Write-Host $geSrc.Substring($idxGPX)
}

Write-Host "`n======================================================="
Write-Host "DIFF FOR css/app.css (classes in TMP not in Current)"
Write-Host "======================================================="
$cssSrc = Get-Content (Join-Path $src "css\app.css") -Raw
$cssDst = Get-Content (Join-Path $dst "css\app.css") -Raw
# Find selectors in TMP css not in current css
$selSrc = [regex]::Matches($cssSrc, "(?m)^([.#a-zA-Z0-9_\-\s,>:+]+)\s*\{") | ForEach-Object { $_.Groups[1].Value.Trim() }
$selDst = [regex]::Matches($cssDst, "(?m)^([.#a-zA-Z0-9_\-\s,>:+]+)\s*\{") | ForEach-Object { $_.Groups[1].Value.Trim() }

$missingSel = $selSrc | Where-Object { $selDst -notcontains $_ }
Write-Host "Missing CSS selectors in Current: $(($missingSel | Select-Object -Unique) -join ', ')"
