# Define the output file
$outputFile = "results.txt"

# Force UTF8 encoding for the initial file creation
"" | Out-File -FilePath $outputFile -Encoding utf8

# VAR LEN 8
# $patterns = @(
#     "narakyo[_a-z0-9]{8}",
#     "[_a-z0-9]{1}narakyo[_a-z0-9]{7}",
#     "[_a-z0-9]{2}narakyo[_a-z0-9]{6}",
#     "[_a-z0-9]{3}narakyo[_a-z0-9]{5}",
#     "[_a-z0-9]{4}narakyo[_a-z0-9]{4}",
#     "[_a-z0-9]{5}narakyo[_a-z0-9]{3}",
#     "[_a-z0-9]{6}narakyo[_a-z0-9]{2}",
#     "[_a-z0-9]{7}narakyo[_a-z0-9]{1}",
#     "[_a-z0-9]{8}narakyo"
# )

# VAR LEN 7
# $patterns = @(
#                 "aDw_A[A-Za-z0-9_]{7}"
#     "aDw_[A-Za-z0-9_]{1}A[A-Za-z0-9_]{6}"
#     "aDw_[A-Za-z0-9_]{2}A[A-Za-z0-9_]{5}"
#     "aDw_[A-Za-z0-9_]{3}A[A-Za-z0-9_]{4}"
#     "aDw_[A-Za-z0-9_]{4}A[A-Za-z0-9_]{3}"
#     "aDw_[A-Za-z0-9_]{5}A[A-Za-z0-9_]{2}"
#     "aDw_[A-Za-z0-9_]{6}A[A-Za-z0-9_]{1}"
#                 "aDw_[A-Za-z0-9_]{7}"
# )

# VAR LEN 6
# $patterns = @(
#                 "bee_at[A-Za-z0-9_]{6}"
#     "bee[A-Za-z0-9_]{1}_at[A-Za-z0-9_]{5}"
#     "bee[A-Za-z0-9_]{2}_at[A-Za-z0-9_]{4}"
#     "bee[A-Za-z0-9_]{3}_at[A-Za-z0-9_]{3}"
#     "bee[A-Za-z0-9_]{4}_at[A-Za-z0-9_]{2}"
#     "bee[A-Za-z0-9_]{5}_at[A-Za-z0-9_]{1}"
#     "bee[A-Za-z0-9_]{6}_at"
# )

# VAR LEN 5
# $patterns = @(
#                 "Nj_Driv[A-Za-z0-9_]{5}"
#     "Nj_[A-Za-z0-9_]{1}Driv[A-Za-z0-9_]{4}"
#     "Nj_[A-Za-z0-9_]{2}Driv[A-Za-z0-9_]{3}"
#     "Nj_[A-Za-z0-9_]{3}Driv[A-Za-z0-9_]{2}"
#     "Nj_[A-Za-z0-9_]{4}Driv[A-Za-z0-9_]{1}"
#     "Nj_[A-Za-z0-9_]{5}Driv"
# )



# $patterns = @(
#     "bee[a-z]{2}_at_4rk[a-z0-9_]{4}"
#     "bee[a-z]{2}_th_4rk[a-z0-9_]{4}"
#     "bee[a-z]{2}_un_4rk[a-z0-9_]{4}"
#     "bee[a-z]{2}_dm_4rk[a-z0-9_]{4}"
#     "bee[a-z]{2}_gd_4rk[a-z0-9_]{4}"
#     "bee[a-z]{2}_it_4rk[a-z0-9_]{4}"
#     "bee[a-z]{2}_co_4rk[a-z0-9_]{4}"
# )

# $patterns = @(
#     "cmn[a-z]{2}_un_[a-z0-9_]{5}"
#     "cmn[a-z]{2}_co_[a-z0-9_]{5}"
#     "cmn[a-z]{2}_dm_[a-z0-9_]{5}"
#     "com[a-z]{2}_un_[a-z0-9_]{5}"
#     "com[a-z]{2}_co_[a-z0-9_]{5}"
#     "com[a-z]{2}_dm_[a-z0-9_]{5}"
# )

$targetHash = "0x7a562929"

foreach ($pattern in $patterns) {
    Write-Host "Processing pattern: $pattern" -ForegroundColor Cyan
    
    # Define a temporary file for this specific run
    $tempFile = "temp_results.txt"
    
    Add-Content -Path $outputFile -Value "------------------------------------------" -Encoding utf8
    Add-Content -Path $outputFile -Value "Running: .\cuda2 `"$pattern`" $targetHash $tempFile" -Encoding utf8
    
    # Execute cuda2.exe with the 3rd argument (the text file)
    # Note: Using cuda2.exe as per your script's pathing logic
    ..\hasher\cuda2.exe "$pattern" $targetHash "$tempFile" 2>&1 | Out-Default

    # Check if the temp file was created and has content
    if (Test-Path $tempFile) {
        # Select-Object -Skip 2 removes the expression and the hash info lines
        $matches = Get-Content $tempFile | Select-Object -Skip 2
        
        if ($matches) {
            $matches | Out-File -FilePath $outputFile -Append -Encoding utf8
        } else {
            Add-Content -Path $outputFile -Value "[No matches found]" -Encoding utf8
        }

        # Remove the temporary file to keep the folder clean
        Remove-Item $tempFile
    }
    
    Add-Content -Path $outputFile -Value "`n" -Encoding utf8
}

Write-Host "Done! Your combined results are in $outputFile." -ForegroundColor Green