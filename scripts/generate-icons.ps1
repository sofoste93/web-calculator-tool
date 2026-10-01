$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$assetDirectory = Join-Path $root "assets"

foreach ($size in @(192, 512)) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::FromArgb(7, 3, 4))
    $margin = [int]($size * 0.12)
    $corner = [int]($size * 0.22)
    $background = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(24, 7, 8))
    $graphics.FillRectangle($background, $margin, $margin, $size - 2 * $margin, $size - 2 * $margin)
    $starBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(242, 47, 38))
    $starSize = [int]($size * 0.43)
    $starStart = [int](($size - $starSize) / 2)
    $graphics.FillEllipse($starBrush, $starStart, $starStart, $starSize, $starSize)
    $glow = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 255, 111, 81)), ([Math]::Max(3, $size * 0.018))
    $graphics.DrawEllipse($glow, $starStart - $size * 0.05, $starStart - $size * 0.05, $starSize + $size * 0.1, $starSize + $size * 0.1)
    $orbit = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 160, 112)), ([Math]::Max(4, $size * 0.03))
    $graphics.DrawArc($orbit, $size * 0.09, $size * 0.42, $size * 0.82, $size * 0.30, 190, 168)
    $mark = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 245, 237)), ([Math]::Max(5, $size * 0.035))
    $mark.StartCap = $mark.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawLine($mark, $size * 0.5, $size * 0.39, $size * 0.5, $size * 0.61)
    $graphics.DrawLine($mark, $size * 0.39, $size * 0.5, $size * 0.61, $size * 0.5)
    $bitmap.Save((Join-Path $assetDirectory "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $mark.Dispose(); $orbit.Dispose(); $glow.Dispose(); $starBrush.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
