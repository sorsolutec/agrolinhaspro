$src = "C:\Users\SSTecnol\Desktop\TMP\AgroLinhasPro\agrolinhaspro"
$dst = "C:\Users\SSTecnol\Desktop\Projects\agri-linhas-plantio"

Write-Host "=== 6. INSPECTING MEMORIAL PARSER IN TMP ==="
Get-Content (Join-Path $src "js\modules\memorialParser.js")

Write-Host "`n=== 7. INSPECTING INDEX.HTML MEMORIAL / PDF / EXPORT SECTIONS IN TMP ==="
$idxSrc = Get-Content (Join-Path $src "index.html") -Raw
# Find modal or buttons with memorial in TMP index.html
$idxSrc.Split("`n") | Where-Object { $_ -match "memorial|pdfjs|pdf\.js|btnMemorial|btnExportGPX|btnExportGeoJSON|btnExportXML" }

Write-Host "`n=== 8. CHECKING OTHER MODULES DIFFS ==="
$modules = @('cutmanager.js', 'elevationdem.js', 'fieldmanager.js', 'gnssstation.js', 'sectionengine.js', 'workorder.js')
foreach ($m in $modules) {
    $mSrc = Get-Content (Join-Path $src "js\modules\$m") -Raw
    $mDst = Get-Content (Join-Path $dst "js\modules\$m") -Raw
    if ($mSrc -ne $mDst) {
        Write-Host "Diff found in js/modules/$m (TMP: $($mSrc.Length) vs Current: $($mDst.Length))"
    } else {
        Write-Host "js/modules/$m is IDENTICAL"
    }
}
