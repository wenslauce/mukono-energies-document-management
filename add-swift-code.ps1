# Script to add swift code to payment instructions in all document templates

Write-Host "Adding swift code to payment instructions in all document templates..."

$templateDir = "components/documents/templates"
$templates = Get-ChildItem -Path $templateDir -Filter "*.tsx"

foreach ($template in $templates) {
    $content = Get-Content -Path $template.FullName -Raw
    
    # Check if payment instructions are present but swift_code is missing
    if ($content -match "paymentInstructions=" -and 
        $content -match "bank_code: .BARCUGKX." -and 
        -not ($content -match "swift_code:")) {
        
        Write-Host "Processing $($template.Name)..."
        
        # Add swift_code to payment instructions
        $content = $content -replace 'bank_code: "BARCUGKX"', 'bank_code: "BARCUGKX",'
        $content = $content -replace 'bank_code: "BARCUGKX",', 'bank_code: "BARCUGKX",
            swift_code: "BARCUGKX"'
        
        # Save the updated content
        Set-Content -Path $template.FullName -Value $content
        Write-Host "Added swift code to $($template.Name)"
    }
}

Write-Host "All templates have been processed!" 