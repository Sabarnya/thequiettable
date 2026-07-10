# serve.ps1 — zero-install local web server for Windows (uses built-in PowerShell only).
# Put this inside the project folder (next to index.html), then:
#   right-click -> "Run with PowerShell"
#   ...or:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Serves THIS folder at http://localhost:8000/  (Ctrl+C in the window to stop)

$port = 8000
$root = $PSScriptRoot
Set-Location $root

if (-not (Test-Path (Join-Path $root "index.html"))) {
  Write-Host "index.html not found next to serve.ps1." -ForegroundColor Red
  Write-Host "Put serve.ps1 in the project folder (the one with index.html) and run again."
  Read-Host "Press Enter to exit"; exit 1
}

$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8";
  ".css"="text/css; charset=utf-8"; ".js"="application/javascript; charset=utf-8";
  ".xml"="application/xml; charset=utf-8"; ".json"="application/json; charset=utf-8";
  ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"; ".png"="image/png"; ".gif"="image/gif";
  ".svg"="image/svg+xml"; ".webp"="image/webp"; ".ico"="image/x-icon";
  ".woff"="font/woff"; ".woff2"="font/woff2"; ".ttf"="font/ttf"; ".txt"="text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() }
catch {
  Write-Host "Could not start on port $port (it may already be in use)." -ForegroundColor Red
  Write-Host $_.Exception.Message
  Read-Host "Press Enter to exit"; exit 1
}

Write-Host "The Quiet Table is live at  http://localhost:$port/" -ForegroundColor Green
Write-Host "Press Ctrl+C in this window to stop."
Start-Process "http://localhost:$port/index.html"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
    $path = Join-Path $root $rel
    if ((Test-Path $path) -and -not (Get-Item $path).PSIsContainer) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] }
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.OutputStream.Close()
  }
} finally {
  $listener.Stop()
}
