# Define the output file
$outputFile = "results.txt"

# Force UTF8 encoding for the initial file creation
"" | Out-File -FilePath $outputFile -Encoding utf8

$codes = @(
    "am",
    "az",
    "cb",
    "co",
    "dz",
    "et",
    "gs",
    "ha",
    "hg",
    "hi",
    "hk",
    "hr",
    "ik",
    "in",
    "is",
    "kb",
    "kc",
    "ke",
    "kj",
    "km",
    "ko",
    "kt",
    "kw",
    "kz",
    "mb",
    "Mo",
    "mo",
    "Ms",
    "ms",
    "mx",
    "na",
    "nb",
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
    "yt",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "M",
    "N",
    "O",
    "R",
    "S",
    "T",
    "V",
    "W",
    "X",
    "Y",
    "Z"
)

$patterns = @()

$charCodes = @("com", "cmn") # 3-letter char codes
$subCodes = @("dm", "at", "th", "co", "un", "ra", "gd", "it")
# $subCodes = @("co")

foreach ($charCode in $charCodes) {
    foreach ($code in $codes) {
       foreach ($sub in $subCodes) {
            if ($code.Length -eq 1) {
                # "?xxx_yy_*"
                $patterns += "${code}${charCode}_${sub}_[A-Za-z0-9_]{4}"
            } else {
                # "xxx??_yy_*"
                $patterns += "${charCode}${code}_${sub}_[A-Za-z0-9_]{3}std_torun"
            }
        }
    }
}

$targetHash = "0xe7accd68"

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