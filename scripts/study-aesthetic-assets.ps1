# Reproducible JPEG derivatives. Source files are read-only; no dependency install.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path $PSScriptRoot -Parent
$sourceDir = Join-Path $projectRoot 'Quiz assets'
$targetDir = Join-Path $projectRoot 'public/assets/quiz/aesthetics'
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]84)
$sources = @(
  @{Id='forgotten-railway'; File='Forgotten Railway.png'; Center=0.57},
  @{Id='morning-lilies'; File='Morning Lilies.jpg'; Center=0.68},
  @{Id='quiet-afternoon'; File='Quiet Afternoon.jpg'; Center=0.42}
)
$manifest = foreach ($item in $sources) {
  $sourcePath = Join-Path $sourceDir $item.File
  $before = (Get-FileHash -LiteralPath $sourcePath).Hash
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $cropWidth = [int][Math]::Round($source.Height * 9 / 16)
    $cropX = [int][Math]::Max(0, [Math]::Min($source.Width - $cropWidth, $source.Width * $item.Center - $cropWidth / 2))
    $files = foreach ($variant in @(@{Kind='desktop';Widths=@(1280,2048)},@{Kind='mobile';Widths=@(480,780)},@{Kind='thumb';Widths=@(360)})) {
      foreach ($width in $variant.Widths) {
        $mobile = $variant.Kind -eq 'mobile'
        $height = [int][Math]::Round($width * $(if ($mobile) {16/9} else {$source.Height / $source.Width}))
        $bitmap = New-Object System.Drawing.Bitmap($width,$height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $rect = if ($mobile) {New-Object System.Drawing.Rectangle($cropX,0,$cropWidth,$source.Height)} else {New-Object System.Drawing.Rectangle(0,0,$source.Width,$source.Height)}
        $graphics.DrawImage($source,(New-Object System.Drawing.Rectangle(0,0,$width,$height)),$rect,[System.Drawing.GraphicsUnit]::Pixel)
        $name = if ($variant.Kind -eq 'thumb') {"$($item.Id)-thumb.jpg"} else {"$($item.Id)-$($variant.Kind)-$width.jpg"}
        $path = Join-Path $targetDir $name
        $bitmap.Save($path,$jpeg,$parameters)
        $graphics.Dispose()
        $bitmap.Dispose()
        @{file=$name;width=$width;height=$height;bytes=(Get-Item -LiteralPath $path).Length}
      }
    }
    @{source=$item.File;sha256=$before;mobileCrop=@{x=$cropX;y=0;width=$cropWidth;height=$source.Height};files=@($files)}
  } finally { $source.Dispose() }
  if ((Get-FileHash -LiteralPath $sourcePath).Hash -ne $before) { throw 'Source unexpectedly changed' }
}
$parameters.Dispose()
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $targetDir 'manifest.json') -Encoding utf8
$manifest | ForEach-Object { "$($_.source): $((($_.files | Measure-Object bytes -Sum).Sum)) bytes across 5 derivatives" }
