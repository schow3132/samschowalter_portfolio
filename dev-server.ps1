param([int]$Port = 5173, [string]$Root = (Join-Path $PSScriptRoot "site"))

# Minimal static file server for previewing the site locally.
# Concurrent (runspace pool), streams files, supports HTTP Range requests (needed to seek in video),
# and survives aborted connections.

$Root = [System.IO.Path]::GetFullPath($Root)

$handler = {
  param($ctx, $Root)
  $mime = @{
    ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"
    ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".png" = "image/png"; ".webp" = "image/webp"
    ".svg" = "image/svg+xml"; ".gif" = "image/gif"; ".ico" = "image/x-icon"; ".pdf" = "application/pdf"
    ".mp4" = "video/mp4"; ".mov" = "video/mp4"; ".webm" = "video/webm"
  }
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
    if ($path -eq "") { $path = "index.html" }
    $file = [System.IO.Path]::GetFullPath((Join-Path $Root $path))

    if ($file.StartsWith($Root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $ctx.Response.AddHeader("Accept-Ranges", "bytes")
      $ctx.Response.AddHeader("Cache-Control", "no-cache")

      $fs = [System.IO.File]::Open($file, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
      try {
        $total = $fs.Length
        $start = [long]0; $end = $total - 1
        $range = $ctx.Request.Headers["Range"]
        if ($range -and $range -match "bytes=(\d*)-(\d*)") {
          $a = $Matches[1]; $b = $Matches[2]
          if ($a -ne "") { $start = [long]$a; if ($b -ne "") { $end = [long]$b } }
          elseif ($b -ne "") { $start = [math]::Max([long]0, $total - [long]$b) }
          if ($end -ge $total) { $end = $total - 1 }
          $ctx.Response.StatusCode = 206
          $ctx.Response.AddHeader("Content-Range", "bytes $start-$end/$total")
        }
        $length = $end - $start + 1
        $ctx.Response.ContentLength64 = $length
        $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
        $buf = New-Object byte[] 65536
        $remaining = $length
        while ($remaining -gt 0) {
          $n = $fs.Read($buf, 0, [int][math]::Min($buf.Length, $remaining))
          if ($n -le 0) { break }
          $ctx.Response.OutputStream.Write($buf, 0, $n)
          $remaining -= $n
        }
      } finally { $fs.Dispose() }
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    # client aborted (e.g. video seek) or similar; keep serving
  } finally {
    try { $ctx.Response.Close() } catch { }
  }
}

$pool = [runspacefactory]::CreateRunspacePool(1, 16)
$pool.Open()

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $ps = [powershell]::Create()
  $ps.RunspacePool = $pool
  [void]$ps.AddScript($handler).AddArgument($ctx).AddArgument($Root)
  [void]$ps.BeginInvoke()
}
