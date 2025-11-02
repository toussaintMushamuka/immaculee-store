# Script de test pour vérifier le déploiement local
Write-Host "=== Test de déploiement local StockManager ===" -ForegroundColor Green

$baseUrl = "http://localhost:3000"
$testResults = @()

# Fonction pour tester un endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null,
        [string]$ContentType = "application/json"
    )
    
    try {
        Write-Host "Testing $Name..." -ForegroundColor Yellow
        
        $params = @{
            Uri = $Url
            Method = $Method
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = $ContentType
        }
        
        $response = Invoke-WebRequest @params -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ $Name - SUCCESS" -ForegroundColor Green
            $testResults += @{
                Name = $Name
                Status = "SUCCESS"
                StatusCode = $response.StatusCode
            }
        } else {
            Write-Host "✗ $Name - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
            $testResults += @{
                Name = $Name
                Status = "FAILED"
                StatusCode = $response.StatusCode
            }
        }
    }
    catch {
        Write-Host "✗ $Name - ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $testResults += @{
            Name = $Name
            Status = "ERROR"
            Error = $_.Exception.Message
        }
    }
}

# Test 1: Page d'accueil (redirection vers login)
Write-Host "`n1. Test de la page d'accueil..." -ForegroundColor Cyan
Test-Endpoint -Name "Home Page" -Url "$baseUrl/"

# Test 2: Page de login
Write-Host "`n2. Test de la page de login..." -ForegroundColor Cyan
Test-Endpoint -Name "Login Page" -Url "$baseUrl/login"

# Test 3: API Dashboard
Write-Host "`n3. Test de l'API Dashboard..." -ForegroundColor Cyan
Test-Endpoint -Name "Dashboard API" -Url "$baseUrl/api/dashboard"

# Test 4: API Products
Write-Host "`n4. Test de l'API Products..." -ForegroundColor Cyan
Test-Endpoint -Name "Products API" -Url "$baseUrl/api/products"

# Test 5: API Customers
Write-Host "`n5. Test de l'API Customers..." -ForegroundColor Cyan
Test-Endpoint -Name "Customers API" -Url "$baseUrl/api/customers"

# Test 6: API Sales
Write-Host "`n6. Test de l'API Sales..." -ForegroundColor Cyan
Test-Endpoint -Name "Sales API" -Url "$baseUrl/api/sales"

# Test 7: API Purchases
Write-Host "`n7. Test de l'API Purchases..." -ForegroundColor Cyan
Test-Endpoint -Name "Purchases API" -Url "$baseUrl/api/purchases"

# Test 8: API Expenses
Write-Host "`n8. Test de l'API Expenses..." -ForegroundColor Cyan
Test-Endpoint -Name "Expenses API" -Url "$baseUrl/api/expenses"

# Test 9: API Payments
Write-Host "`n9. Test de l'API Payments..." -ForegroundColor Cyan
Test-Endpoint -Name "Payments API" -Url "$baseUrl/api/payments"

# Test 10: Authentification
Write-Host "`n10. Test de l'authentification..." -ForegroundColor Cyan
$loginBody = '{"email":"admin@stockmanager.com","password":"admin123"}'
Test-Endpoint -Name "Login API" -Url "$baseUrl/api/auth/login" -Method "POST" -Body $loginBody

# Test 11: Pages protégées (doivent rediriger vers login)
Write-Host "`n11. Test des pages protégées..." -ForegroundColor Cyan
Test-Endpoint -Name "Dashboard Page (Protected)" -Url "$baseUrl/dashboard"
Test-Endpoint -Name "Products Page (Protected)" -Url "$baseUrl/products"
Test-Endpoint -Name "Sales Page (Protected)" -Url "$baseUrl/sales"

# Résumé des tests
Write-Host "`n=== RÉSUMÉ DES TESTS ===" -ForegroundColor Green
$successCount = ($testResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$totalCount = $testResults.Count

Write-Host "Tests réussis: $successCount/$totalCount" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

foreach ($result in $testResults) {
    $status = if ($result.Status -eq "SUCCESS") { "✓" } else { "✗" }
    $color = if ($result.Status -eq "SUCCESS") { "Green" } else { "Red" }
    Write-Host "$status $($result.Name): $($result.Status)" -ForegroundColor $color
}

if ($successCount -eq $totalCount) {
    Write-Host "`n🎉 TOUS LES TESTS SONT PASSÉS ! L'application est prête pour le déploiement." -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Certains tests ont échoué. Vérifiez les erreurs avant le déploiement." -ForegroundColor Yellow
}

Write-Host "`n=== FIN DES TESTS ===" -ForegroundColor Green






