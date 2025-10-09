# PowerShell script to apply the SQL function to your Supabase project
# Usage: .\apply_sql_function.ps1 YOUR_SUPABASE_URL YOUR_SUPABASE_KEY

param (
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseKey
)

Write-Host "Applying technician booking validation function..."

# Read the SQL file content
$sqlContent = Get-Content -Path "update_technician_validation.sql" -Raw

# Escape quotes for JSON
$sqlContent = $sqlContent.Replace('"', '\"')

# Create the request body
$body = "{`"sql_string`": `"$sqlContent`"}"

# Execute the request
$headers = @{
    "apikey" = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
    Write-Host "Done! The function has been updated successfully."
    Write-Host "Test the function using: SELECT * FROM check_technician_availability('Technician Name', '2023-06-15T10:00:00Z');"
} catch {
    Write-Host "Error applying SQL function: $_"
}