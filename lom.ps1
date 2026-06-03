# kamui_run.ps1

$hex = "0x1fec5c9b"
# $prefix = "Un_"   # set to $null or "" if not needed
$prefix = "sDm_"   # set to $null or "" if not needed
$suffix = ""   # set to $null or "" if not needed

$args = @()

# required
$args += $hex
$args += "--all"

# optional prefix
if ($prefix -and $prefix.Trim().Length -gt 0) {
    $args += "--prefix"
    $args += $prefix
}

# optional suffix
if ($suffix -and $suffix.Trim().Length -gt 0) {
    $args += "--suffix"
    $args += $suffix
}


node .\kamui_lookup.js @args

<#
.\cuda2.exe "An_Rocket_RK[A-Za-z0-9_]{4}" 0xf42346f3

  "535583899": "sDm_harawa40",
#>
