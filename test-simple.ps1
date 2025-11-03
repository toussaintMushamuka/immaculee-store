# Script de test simplifié pour vérifier le déploiement local
Write-Host "=== Test de déploiement local StockManager ===" -ForegroundColor Green

$baseUrl = "http://localhost:3000"

# Test 1: Page d'accueil
Write-Host "`n1. Test de la page d'accueil..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Page d'accueil - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ Page d'accueil - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Page d'accueil - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Page de login
Write-Host "`n2. Test de la page de login..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/login" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Page de login - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ Page de login - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Page de login - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: API Dashboard
Write-Host "`n3. Test de l'API Dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/dashboard" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API Dashboard - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ API Dashboard - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ API Dashboard - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: API Products
Write-Host "`n4. Test de l'API Products..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API Products - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ API Products - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ API Products - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: API Customers
Write-Host "`n5. Test de l'API Customers..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/customers" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API Customers - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ API Customers - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ API Customers - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Authentification
Write-Host "`n6. Test de l'authentification..." -ForegroundColor Yellow
try {
    $loginBody = '{"email":"admin@stockmanager.com","password":"admin123"}'
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Authentification - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ Authentification - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Authentification - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN DES TESTS ===" -ForegroundColor Green







