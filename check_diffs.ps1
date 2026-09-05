$src = "C:\Users\SSTecnol\Desktop\TMP\AgroLinhasPro\agrolinhaspro"
$dst = "C:\Users\SSTecnol\Desktop\Projects\agri-linhas-plantio"

Write-Host "=== 3. CHECKING INDEX.HTML DIFFS ==="
$idxSrc = Get-Content (Join-Path $src "index.html") -Raw
$idxDst = Get-Content (Join-Path $dst "index.html") -Raw

# Check keywords in TMP index.html that might be missing in Current
$keywords = @('memorial', 'pdfjs', 'pdf.js', 'gpx', 'xml', 'Memorial', 'pdf', 'imobiliario', 'car', 'sigef', 'incra', 'elevation', 'dxf', 'shp', 'shapefile')
foreach ($kw in $keywords) {
    $inSrc = $idxSrc.ToLower().Contains($kw.ToLower())
    $inDst = $idxDst.ToLower().Contains($kw.ToLower())
    Write-Host "Keyword '$kw': in TMP = $inSrc | in Current = $inDst"
}

Write-Host "`n=== 4. CHECKING APP.JS DIFFS ==="
$appSrc = Get-Content (Join-Path $src "js\app.js") -Raw
$appDst = Get-Content (Join-Path $dst "js\app.js") -Raw
foreach ($kw in $keywords) {
    $inSrc = $appSrc.ToLower().Contains($kw.ToLower())
    $inDst = $appDst.ToLower().Contains($kw.ToLower())
    Write-Host "Keyword in app.js '$kw': in TMP = $inSrc | in Current = $inDst"
}

Write-Host "`n=== 5. CHECKING CSS DIFFS ==="
$cssSrc = Get-Content (Join-Path $src "css\app.css") -Raw
$cssDst = Get-Content (Join-Path $dst "css\app.css") -Raw
Write-Host "TMP CSS Length: $($cssSrc.Length) | Current CSS: $($cssDst.Length)"
