# Define the output file
$outputFile = "results.txt"

# Force UTF8 encoding for the initial file creation
"" | Out-File -FilePath $outputFile -Encoding utf8

$codes = @(
    "am",
    "cb",
    "dz",
    "gs",
    "ha",
    "hg",
    "hi",
    "hk",
    "ik",
    "is",
    "kb",
    "kj",
    "km",
    "ko",
    "kw",
    "kz",
    "Mo",
    "ms",
    "mx",
    "na",
    "nk",
    "no",
    "nt",
    "od",
    "ok",
    "oz",
    "sa",
    "sj",
    "sk",
    "ss",
    "su",
    "ta",
    "tb",
    "tg",
    "to",
    "XX",
    "ya",
    "yg",
    "yk",
    "yo",
    "yt"
)

$patterns = @()

foreach ($code in $codes) {
    $patterns += "com${code}_dm_y_[a-z0-9_]{6}"
    $patterns += "cmn${code}_dm_y_[a-z0-9_]{6}"
    # $patterns += "grl${code}_un_[a-z0-9_]{5}"
    # $patterns += "grl${code}_th_[a-z0-9_]{5}"
}

$targetHash = "0xcfb9cd11"

foreach ($pattern in $patterns) {
    Write-Host "Processing pattern: $pattern" -ForegroundColor Cyan

    $tempFile = "temp_results.txt"

    ..\hasher\cuda2.exe "$pattern" $targetHash "$tempFile" *> $null

    if (Test-Path $tempFile) {
        $matches = Get-Content $tempFile | Select-Object -Skip 2

        if ($matches) {
            $matches | Out-File -FilePath $outputFile -Append -Encoding utf8
        }
        # else {
        #     Add-Content -Path $outputFile -Value "[No matches found]" -Encoding utf8
        # }

        Remove-Item $tempFile
    }
}

Write-Host "Done! Your combined results are in $outputFile." -ForegroundColor Green