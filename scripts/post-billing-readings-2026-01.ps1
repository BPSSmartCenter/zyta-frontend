param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$DeviceId,
  [Parameter(Mandatory=$true)][string]$Token
)

$payloadPath = Join-Path $PSScriptRoot "..\mock\billing-readings-2026-01.json"
$rows = Get-Content $payloadPath -Raw | ConvertFrom-Json

foreach ($row in $rows) {
  $url = "$BaseUrl/devices/$DeviceId/billing-readings"
  $body = $row | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $url -Headers @{ Authorization = "Bearer $Token" } -ContentType "application/json" -Body $body
    Write-Host "OK" $row.timestamp
  } catch {
    Write-Host "FAIL" $row.timestamp $_.Exception.Message
  }
}
