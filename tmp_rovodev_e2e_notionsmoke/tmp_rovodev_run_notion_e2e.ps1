param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [string]$Variant = 'standard'
)

$ErrorActionPreference = 'Stop'

function SafeJson($obj) {
  return ($obj | ConvertTo-Json -Depth 12)
}

Write-Host "--- Checking Notion status: $BaseUrl/api/notion/status"
try {
  $status = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/notion/status"
  SafeJson $status
} catch {
  Write-Host "Failed to call notion status: $($_.Exception.Message)"
  exit 1
}

Write-Host "--- Generating template variant=$Variant: $BaseUrl/api/generate"
$body = @{ templateType='NOTION_TEMPLATES'; variant=$Variant } | ConvertTo-Json
try {
  $res = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/generate" -ContentType 'application/json' -Body $body
  # Print only key fields
  $summary = [ordered]@{
    ok = $res.ok
    reason = $res.reason
    runId = $res.runId
    startedAt = $res.startedAt
    templateType = $res.templateType
    variant = $res.variant
    rootUrl = $res.report.pages.root.url
    startHereUrl = $res.report.pages.startHere.url
    dashboardUrl = $res.report.pages.dashboard.url
    databases = ($res.report.databases.PSObject.Properties | ForEach-Object { @{ key=$_.Name; url=$_.Value.url } })
  }
  SafeJson $summary
} catch {
  Write-Host "Generate failed: $($_.Exception.Message)"
  exit 1
}

Write-Host "Done. Verify in Notion UI using returned URLs."
