# build-deploy.ps1 - 공개용 파일만 deploy/ 로 복사하고 배포 전 점검을 한다.
# 실행: PowerShell 에서  .\build-deploy.ps1   (막히면: powershell -ExecutionPolicy Bypass -File .\build-deploy.ps1)

$ErrorActionPreference = 'Stop'
$root   = $PSScriptRoot
$deploy = Join-Path $root 'deploy'
$LIMIT  = 25MB      # Cloudflare Pages 단일 파일 한도

$publicFiles = 'index.html','works.html','watch.html','making.html','album.html','about.html','theme.css','common.js','content.json'
# 복사하지 않을 파일 (media/ 안): README류, 백업, 임시·더미
$excludeName = 'README*','content.backup.json','tmp-*','*.tmp','*.bak','*dummy*','export*.json','v2.json','Thumbs.db','desktop.ini','.DS_Store'

$warn = New-Object System.Collections.Generic.List[string]
$note = New-Object System.Collections.Generic.List[string]

# ---------- 1. deploy/ 새로 만들기 ----------
if (Test-Path -LiteralPath $deploy) {
  if ((Split-Path $deploy -Leaf) -ne 'deploy' -or (Split-Path $deploy -Parent) -ne $root) { throw "deploy 경로가 이상해서 중단합니다: $deploy" }
  Remove-Item -LiteralPath $deploy -Recurse -Force
}
New-Item -ItemType Directory -Path $deploy | Out-Null

foreach ($f in $publicFiles) {
  $src = Join-Path $root $f
  if (Test-Path -LiteralPath $src) { Copy-Item -LiteralPath $src -Destination $deploy }
  else { $warn.Add("필수 파일이 없어요: $f") }
}
$mediaSrc = Join-Path $root 'media'
if (Test-Path -LiteralPath $mediaSrc) {
  Get-ChildItem -LiteralPath $mediaSrc -Recurse -File | ForEach-Object {
    $n = $_.Name
    foreach ($p in $excludeName) { if ($n -like $p) { return } }
    $rel  = $_.FullName.Substring($mediaSrc.Length).TrimStart('\')
    $dest = Join-Path (Join-Path $deploy 'media') $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $dest
  }
} else { $warn.Add('media/ 폴더가 없어요.') }

# ---------- 2. 점검 ----------
$contentPath = Join-Path $deploy 'content.json'
$json = $null
if (Test-Path -LiteralPath $contentPath) {
  try { $json = Get-Content -LiteralPath $contentPath -Raw -Encoding UTF8 | ConvertFrom-Json }
  catch { $warn.Add("content.json을 읽을 수 없어요: $($_.Exception.Message)") }
}

# 2-1) 대괄호 플레이스홀더, "예시" 문구
$placeholders = New-Object System.Collections.Generic.List[string]
function Walk($node, $path) {
  if ($null -eq $node) { return }
  if ($node -is [string]) {
    if ($node -match '\[[^\]]*\]' -or $node -match '예시') {
      $s = ($node -replace '\s+', ' '); if ($s.Length -gt 50) { $s = $s.Substring(0, 50) + '…' }
      $placeholders.Add("$path : $s")
    }
  }
  elseif ($node -is [System.Array]) { for ($i = 0; $i -lt $node.Count; $i++) { Walk $node[$i] "$path[$i]" } }
  elseif ($node -is [System.Management.Automation.PSCustomObject]) { foreach ($p in $node.PSObject.Properties) { Walk $p.Value ($(if ($path) { "$path.$($p.Name)" } else { $p.Name })) } }
}
if ($json) { Walk $json '' }

# 2-2) content.json 이 참조하는 media 파일이 실제로 있는지 (대소문자까지 일치해야 배포 서버에서 열려요)
$refs = New-Object System.Collections.Generic.List[object]
function Ref($label, $name) { if ($name -is [string] -and $name.Trim()) { $refs.Add([pscustomobject]@{ Label = $label; Name = $name.Trim() }) } }
if ($json) {
  $hero = $json.hero
  if ($hero) {
    if ($hero.mode -eq 'image') { Ref 'hero.image' $hero.image }
    else { Ref 'hero.video' $hero.video; Ref 'hero.poster' $hero.poster }
  }
  $wi = 0
  foreach ($w in @($json.works)) {
    $wi++; $id = if ($w.id) { $w.id } else { "work-$wi" }
    if ($w.video) { Ref "$id.video" $w.video.file; Ref "$id.poster" $w.video.poster; Ref "$id.captions" $w.video.captions }
  }
  $pi = 0
  foreach ($p in @($json.album.photos)) { $pi++; Ref "album.photo[$pi]" $p.file }
}
$mediaDeploy = Join-Path $deploy 'media'
$existing = @{}
if (Test-Path -LiteralPath $mediaDeploy) {
  Get-ChildItem -LiteralPath $mediaDeploy -Recurse -File | ForEach-Object { $existing[$_.FullName.Substring($mediaDeploy.Length).TrimStart('\').Replace('\', '/')] = 1 }
}
$missing = New-Object System.Collections.Generic.List[string]
foreach ($r in $refs) {
  $rel = ($r.Name -replace '^(\.?/)?(media/)?', '')
  $hit = $existing.Keys | Where-Object { $_ -ceq $rel } | Select-Object -First 1
  if (-not $hit) {
    $ci = $existing.Keys | Where-Object { $_ -ieq $rel } | Select-Object -First 1
    $missing.Add("$($r.Label) : media/$rel" + $(if ($ci) { "  (대소문자만 달라요: $ci)" } else { '' }))
  }
}

# 2-3) 25MB 초과 파일
$big = @(Get-ChildItem -LiteralPath $deploy -Recurse -File | Where-Object { $_.Length -gt $LIMIT })

# 2-4) 외부 도메인 링크 (SVG 네임스페이스와 로컬 주소는 제외)
$okHosts = 'www.w3.org','localhost','127.0.0.1'
$externalCode = New-Object System.Collections.Generic.List[string]
$externalData = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath $deploy -File | Where-Object { $_.Extension -in '.html','.js','.css','.json' } | ForEach-Object {
  $text = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
  foreach ($m in [regex]::Matches($text, 'https?://([^/\s"''`)<>\\:]+)[^\s"''`)<>\\]*')) {
    $h = $m.Groups[1].Value.ToLower()
    if ($okHosts -contains $h) { continue }
    $line = "$($_.Name) : $($m.Value)"
    if ($_.Extension -eq '.json') { $externalData.Add($line) } else { $externalCode.Add($line) }
  }
}

# ---------- 3. 결과 출력 ----------
function Section($title, $items, $color) {
  Write-Host ''
  Write-Host $title -ForegroundColor $color
  foreach ($i in $items) { Write-Host "  - $i" -ForegroundColor $color }
}
Write-Host ''
Write-Host '=== 배포 폴더 점검 결과 ===' -ForegroundColor Cyan

if ($placeholders.Count) { Section "1) 플레이스홀더·예시 문구가 남은 항목 ($($placeholders.Count)개)" $placeholders 'Red'; $warn.Add('플레이스홀더·예시 문구') } else { Write-Host '1) 플레이스홀더·예시 문구: 없음' -ForegroundColor Green }
if ($missing.Count)      { Section "2) content.json이 참조하지만 media/에 없는 파일 ($($missing.Count)개)" $missing 'Red'; $warn.Add('없는 media 파일') } else { Write-Host "2) 참조 media 파일: 모두 있음 ($($refs.Count)개 확인)" -ForegroundColor Green }
if ($big.Count) {
  $items = $big | ForEach-Object { '{0} : {1:N1} MB (한도 25 MB 초과 - 영상은 별도 호스팅 필요)' -f $_.FullName.Substring($deploy.Length + 1), ($_.Length / 1MB) }
  Section "3) 25MB 초과 파일 ($($big.Count)개)" $items 'Red'; $warn.Add('25MB 초과 파일')
} else { Write-Host '3) 25MB 초과 파일: 없음' -ForegroundColor Green }
if ($externalCode.Count) { Section "4) 외부 도메인 링크 - 코드 ($($externalCode.Count)개)" $externalCode 'Red'; $warn.Add('코드 안의 외부 도메인') } else { Write-Host '4) 외부 도메인 링크(html·js·css): 없음' -ForegroundColor Green }
if ($externalData.Count) { Section "   참고: content.json 안의 외부 링크 ($($externalData.Count)개, SNS 등 의도한 링크인지 확인)" $externalData 'Yellow' }

$all = @(Get-ChildItem -LiteralPath $deploy -Recurse -File)
$sum = ($all | Measure-Object Length -Sum).Sum
Write-Host ''
Write-Host ('deploy/ 총 용량 {0:N1} MB, 파일 {1}개  ({2})' -f ($sum / 1MB), $all.Count, $deploy)
Write-Host ''
if ($warn.Count) { Write-Host ('경고 ' + $warn.Count + '건: ' + ($warn -join ' / ')) -ForegroundColor Red }
else { Write-Host '배포 준비 완료' -ForegroundColor Green }
