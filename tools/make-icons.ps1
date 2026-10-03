Add-Type -AssemblyName System.Drawing

function New-VolleyIcon {
  param(
    [int]$Size,
    [string]$Path,
    [switch]$Maskable
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0d1220'))

  if ($Maskable) {
    $pad = [float]($Size * 0.10)
  } else {
    $pad = [float]($Size * 0.045)
  }

  $d = [float]($Size - 2 * $pad)
  $cx = [float]($Size / 2)
  $cy = [float]($Size / 2)

  $accent = [System.Drawing.ColorTranslator]::FromHtml('#4c8dff')
  $light  = [System.Drawing.ColorTranslator]::FromHtml('#eaf0ff')
  $green  = [System.Drawing.ColorTranslator]::FromHtml('#2ee6a8')

  # σφαίρα
  $brush = New-Object System.Drawing.SolidBrush $accent
  $g.FillEllipse($brush, $pad, $pad, $d, $d)

  # λευκές ραφές μπάλας (3 καμπύλες που διασχίζουν το κέντρο)
  $pen = New-Object System.Drawing.Pen $light, ([float]($Size * 0.030))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round

  # καμπύλη Α: κατακόρυφο "σπίτι" (δύο κοίλες)
  $g.DrawArc($pen, [float]($cx - $d * 0.30), [float]($cy - $d * 0.50), [float]($d * 0.60), $d, 0, 180)
  $g.DrawArc($pen, [float]($cx - $d * 0.30), [float]($cy - $d * 0.50), [float]($d * 0.60), $d, 180, 180)

  # καμπύλη Β: οριζόντια "μπουγαζάκι"
  $g.DrawArc($pen, [float]($cx - $d * 0.50), [float]($cy - $d * 0.30), $d, [float]($d * 0.60), 180, 180)
  $g.DrawArc($pen, [float]($cx - $d * 0.50), [float]($cy - $d * 0.30), $d, [float]($d * 0.60), 0, 180)

  # καμπύλη Γ: κεντρική οριζόντια
  $g.DrawLine($pen, [float]($cx - $d * 0.42), $cy, [float]($cx + $d * 0.42), $cy)

  # λευκό περίγραμμα
  $ring = New-Object System.Drawing.Pen $light, ([float]($Size * 0.024))
  $g.DrawEllipse($ring, $pad, $pad, $d, $d)

  # πράσινο σημάδι "point"
  $r = [float]($Size * 0.085)
  $g2brush = New-Object System.Drawing.SolidBrush $green
  $g.FillEllipse($g2brush, [float]($cx + $d * 0.19), [float]($cy - $d * 0.31), $r, $r)
  $dotRing = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#0d1220')), ([float]($Size * 0.012))
  $g.DrawEllipse($dotRing, [float]($cx + $d * 0.19), [float]($cy - $d * 0.31), $r, $r)

  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $pen.Dispose(); $ring.Dispose(); $brush.Dispose(); $g2brush.Dispose(); $dotRing.Dispose()
  $g.Dispose(); $bmp.Dispose()
  Write-Host "OK $Path ($Size x $Size)"
}

$root = Split-Path -Parent $PSScriptRoot

New-VolleyIcon -Size 192 -Path "$root\icons\icon-192.png"
New-VolleyIcon -Size 512 -Path "$root\icons\icon-512.png"
New-VolleyIcon -Size 512 -Path "$root\icons\icon-maskable.png" -Maskable