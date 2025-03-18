# Script to fix tax amount display in all document templates
# This script searches for templates using data.tax_amount and replaces with document.tax_amount

Write-Host "Fixing tax amount display in document templates..."

$templateDir = "components/documents/templates"
$templates = Get-ChildItem -Path $templateDir -Filter "*.tsx"

foreach ($template in $templates) {
    $content = Get-Content -Path $template.FullName -Raw
    
    # Check if using data.tax_amount 
    if ($content -match "data\.tax_amount") {
        Write-Host "Processing $($template.Name)..."
        
        # Add the tax amount extraction variable if not present
        if (-not ($content -match "const taxAmount = document\.tax_amount")) {
            $content = $content -replace "(const customerTaxId.+?)(\s+return)", "`$1`n`n  // Extract tax amount directly from document`n  const taxAmount = document.tax_amount || 0`n`$2"
        }
        
        # Replace data.tax_amount || 0 with taxAmount
        $content = $content -replace "data\.tax_amount\s*\|\|\s*0", "taxAmount"
        
        # Replace document.total_amount - (data.tax_amount || 0) with document.total_amount - taxAmount
        $content = $content -replace "document\.total_amount\s*-\s*\(data\.tax_amount\s*\|\|\s*0\)", "document.total_amount - taxAmount"
        
        # Save the updated content
        Set-Content -Path $template.FullName -Value $content
        Write-Host "Fixed $($template.Name)"
    }
}

Write-Host "All templates have been processed!" 