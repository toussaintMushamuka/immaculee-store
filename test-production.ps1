# Script de test pour l'application déployée
param(
    [Parameter(Mandatory=$true)]
    [string]$AppUrl
)

Write-Host "=== Test de l'application déployée ===" -ForegroundColor Green
Write-Host "URL de l'application: $AppUrl" -ForegroundColor Cyan

# Test 1: Page d'accueil
Write-Host "`n1. Test de la page d'accueil..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$AppUrl/" -Method Get -TimeoutSec 10
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
    $response = Invoke-WebRequest -Uri "$AppUrl/login" -Method Get -TimeoutSec 10
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
    $response = Invoke-WebRequest -Uri "$AppUrl/api/dashboard" -Method Get -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API Dashboard - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ API Dashboard - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ API Dashboard - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Authentification
Write-Host "`n4. Test de l'authentification..." -ForegroundColor Yellow
try {
    $loginBody = '{"email":"admin@stockmanager.com","password":"admin123"}'
    $response = Invoke-WebRequest -Uri "$AppUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Authentification - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ Authentification - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Authentification - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Initialisation (si nécessaire)
Write-Host "`n5. Test de l'initialisation..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$AppUrl/api/init" -Method Post -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Initialisation - SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "✗ Initialisation - FAILED (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Initialisation - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIN DES TESTS ===" -ForegroundColor Green
Write-Host "`nPour tester manuellement:" -ForegroundColor Cyan
Write-Host "1. Ouvrez $AppUrl dans votre navigateur" -ForegroundColor White
Write-Host "2. Connectez-vous avec admin@stockmanager.com / admin123" -ForegroundColor White
Write-Host "3. Testez les fonctionnalités principales" -ForegroundColor White


