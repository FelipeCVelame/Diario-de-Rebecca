# Gera o arquivo único DiarioDoBebe.html a partir de index.html + styles.css + app.js.
# Uso: powershell -ExecutionPolicy Bypass -File build.ps1
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

$html = Get-Content (Join-Path $dir 'index.html') -Raw -Encoding UTF8
$css  = Get-Content (Join-Path $dir 'styles.css') -Raw -Encoding UTF8
$js   = Get-Content (Join-Path $dir 'app.js')    -Raw -Encoding UTF8

# 1) Troca o bloco de links do <head> por um favicon inline (emoji 🍼).
$favicon = "<link rel=""icon"" href=""data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%237c6cf0'/%3E%3Ctext x='50' y='68' font-size='58' text-anchor='middle'%3E%F0%9F%8D%BC%3C/text%3E%3C/svg%3E"" />"
$startMark = '<!-- BUILD:HEAD-LINKS -->'
$endMark   = '<!-- /BUILD:HEAD-LINKS -->'
$si = $html.IndexOf($startMark)
$ei = $html.IndexOf($endMark)
if ($si -lt 0 -or $ei -lt 0) { throw "Marcadores BUILD:HEAD-LINKS não encontrados em index.html" }
$ei = $ei + $endMark.Length
$html = $html.Substring(0, $si) + $favicon + $html.Substring($ei)

# 1b) Remove o bloco do Firebase (o arquivo único é offline/local, sem SDK externo).
$fbStart = '<!-- BUILD:FIREBASE -->'
$fbEnd   = '<!-- /BUILD:FIREBASE -->'
$fs = $html.IndexOf($fbStart)
$fe = $html.IndexOf($fbEnd)
if ($fs -ge 0 -and $fe -ge 0) { $html = $html.Substring(0, $fs) + $html.Substring($fe + $fbEnd.Length) }

# 2) Inline do CSS e do JS.
$html = $html.Replace('<link rel="stylesheet" href="styles.css" />', "<style>`n$css`n  </style>")
$html = $html.Replace('<script src="app.js"></script>', "<script>`n$js`n  </script>")

# 3) Escreve UTF-8 sem BOM.
$out = Join-Path $dir 'DiarioDoBebe.html'
[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "OK -> $out ($([math]::Round((Get-Item $out).Length/1KB,1)) KB)"

# 4) Monta a pasta dist/ (o PWA multi-arquivo, pronto para hospedar).
$dist = Join-Path $dir 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
foreach ($f in @('index.html','styles.css','app.js','sw.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png','firebase-config.js')) {
  Copy-Item (Join-Path $dir $f) (Join-Path $dist $f) -Force
}
Write-Host "OK -> $dist (PWA para hospedar)"
