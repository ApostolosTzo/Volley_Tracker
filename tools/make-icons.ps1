Add-Type -AssemblyName System.Drawing

# ---------------------------------------------------------------
# Volley Tracker — εικονίδια εφαρμογής
# Ίδιο brand mark με την εφαρμογή: λαμπινο τετράγωνο με κεκλινή V,
# στο σκούρο #080c11. Χωρίς εξωτερικές εξαρτήσεις.
# ---------------------------------------------------------------

function New-VolleyIcon {
  param(
    [int]$Size,
    [string]$Path,
    [switch]$Maskable
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode    = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode  = 'HighQuality'
  $g.TextRenderingHint = 'AntiAliasGridFit'

  $INK   = [System.Drawing.ColorTranslator]::FromHtml('#080c11')
  $ACID  = [System.Drawing.ColorTranslator]::FromHtml('#c9f31d')
  $ACID2 = [System.Drawing.ColorTranslator]::FromHtml('#d6ff35')
  # ΠΡΟΣΟΧΗ: στην PowerShell τα ονόματα δεν έχουν διάκριση πεζών —
  # το $shadowColor και το $shadowPath πρέπει να είναι διαφορετικά.
  $shadowColor = [System.Drawing.Color]::FromArgb(46, 201, 243, 29)   # ανοιχτό lime

  $g.Clear($INK)

  # ασφαλής περιθώριο: το maskable κόβεται σε κύκλο
  if ($Maskable) { $pad = [float]($Size * 0.16) }
  else           { $pad = [float]($Size * 0.115) }

  $d = [float]($Size - 2 * $pad)
  $cx = [float]($Size / 2)
  $cy = [float]($Size / 2)

  # κεκλίνηση -9° όπως το brand-mark στο CSS (skew(-8deg))
  $tan = [Math]::Tan(9.0 * [Math]::PI / 180.0)

  # σημείο σε μονάδα (-0.5..0.5) με εφαρμοσμένη την κεκλίνηση
  function P([double]$x, [double]$y) {
    [System.Drawing.PointF]::new(
      [float]($cx + ($x - $y * $tan) * $d),
      [float]($cy + $y * $d)
    )
  }

  # --- σκιά: ίδιο τετράγωνο, μετατοπισμένο κάτω-δεξιά ---
  $off = [float]($Size * 0.045)
  $shadowPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $shadowPath.AddPolygon([System.Drawing.PointF[]]@(
    (P -0.5 -0.5), (P 0.5 -0.5), (P 0.5 0.5), (P -0.5 0.5)
  ))
  $mtx = New-Object System.Drawing.Drawing2D.Matrix
  $mtx.Translate([float]$off, [float]$off)
  $shadowPath.Transform($mtx)
  $shadowBrush = New-Object System.Drawing.SolidBrush $shadowColor
  $g.FillPath($shadowBrush, $shadowPath)

  # --- το τετράγωνο ---
  $sq = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $sq.AddPolygon([System.Drawing.PointF[]]@(
    (P -0.5 -0.5), (P 0.5 -0.5), (P 0.5 0.5), (P -0.5 0.5)
  ))
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
    (P -0.5 -0.5),
    (P 0.5 0.5),
    $ACID,
    $ACID2
  )
  $g.FillPath($grad, $sq)

  # --- το V μέσα (σκούρο, ίδιο χρώμα με το φόντο) ---
  $v = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $v.AddLine((P -0.265 -0.215), (P -0.005 0.290))
  $v.AddLine((P -0.005  0.290), (P  0.255 -0.215))

  $stroke = [float]($d * 0.135)
  $pen = New-Object System.Drawing.Pen $INK, $stroke
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($pen, $v)

  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $pen.Dispose(); $grad.Dispose(); $v.Dispose(); $sq.Dispose()
  $shadowBrush.Dispose(); $shadowPath.Dispose(); $mtx.Dispose()
  $g.Dispose(); $bmp.Dispose()
  Write-Host "OK $Path ($Size x $Size)"
}

$root = Split-Path -Parent $PSScriptRoot

New-VolleyIcon -Size 192 -Path "$root\icons\icon-192.png"
New-VolleyIcon -Size 512 -Path "$root\icons\icon-512.png"
New-VolleyIcon -Size 512 -Path "$root\icons\icon-maskable.png" -Maskable