$src = "C:\Users\SSTecnol\Desktop\TMP\AgroLinhasPro\agrolinhaspro"
$dst = "C:\Users\SSTecnol\Desktop\Projects\agri-linhas-plantio"

$modules = @('cutmanager.js', 'elevationdem.js', 'fieldmanager.js', 'gnssstation.js', 'sectionengine.js', 'workorder.js')
foreach ($m in $modules) {
    Write-Host "`n======================================================="
    Write-Host "DIFF FOR js/modules/$m"
    Write-Host "======================================================="
    $linesSrc = Get-Content (Join-Path $src "js\modules\$m")
    $linesDst = Get-Content (Join-Path $dst "js\modules\$m")
    Compare-Object -ReferenceObject $linesDst -DifferenceObject $linesSrc | Select-Object SideIndicator, InputObject | Format-Table -Wrap
}
