param(
  [Parameter(Mandatory=$true)]
  [string]$TaskId
)

$dir = Join-Path ".bangiao" $TaskId
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$requestFile = Join-Path $dir "00-yeu-cau.md"
if (-not (Test-Path $requestFile)) {
@"
# Task
$TaskId

# User request
Paste the requested feature/fix here.

# Constraints
- Human approval required before merge.
"@ | Set-Content -Encoding UTF8 $requestFile
}

Write-Host "Created task handoff directory: $dir"
Write-Host "Next: fill $requestFile, then start the Planner agent."
