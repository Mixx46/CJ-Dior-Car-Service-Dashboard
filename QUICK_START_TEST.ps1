Write-Host "🚀 CJ Dior GPS Tracking - Quick Start Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install 2>&1 | Out-Null
npm --prefix client install 2>&1 | Out-Null
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Check files exist
Write-Host "📂 Step 2: Checking files..." -ForegroundColor Yellow
$filesOk = $true

$expectedFiles = @(
    "server/db.js",
    "server/routes/tracking.js",
    "server/index.js",
    "client/src/pages/TrackingPage.jsx",
    "client/src/components/LiveMapComponent.jsx",
    "client/src/views/DispatcherMap.jsx",
    "client/src/components/DriverLocationTracker.jsx",
    ".env",
    "client/.env"
)

foreach ($file in $expectedFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file NOT FOUND" -ForegroundColor Red
        $filesOk = $false
    }
}

Write-Host ""

# Step 3: Check environment
Write-Host "⚙️  Step 3: Checking configuration..." -ForegroundColor Yellow

$envContent = Get-Content .env -Raw
if ($envContent -match "GOOGLE_MAPS_API_KEY=your_api_key_here") {
    Write-Host "  ⚠️  Google Maps API key NOT configured" -ForegroundColor Yellow
    Write-Host "     1. Get key: https://console.cloud.google.com" -ForegroundColor Cyan
    Write-Host "     2. Enable: Maps JavaScript API + Distance Matrix API" -ForegroundColor Cyan
    Write-Host "     3. Update .env" -ForegroundColor Cyan
    Write-Host "     4. Update client/.env" -ForegroundColor Cyan
} elseif ($envContent -match "GOOGLE_MAPS_API_KEY=") {
    Write-Host "  ✅ Google Maps API key configured" -ForegroundColor Green
}

$clientEnvContent = Get-Content client/.env -Raw
if ($clientEnvContent -match "VITE_GOOGLE_MAPS_API_KEY=") {
    Write-Host "  ✅ Client .env configured" -ForegroundColor Green
}

Write-Host ""

# Step 4: Summary
Write-Host "📋 Test Accounts:" -ForegroundColor Cyan
Write-Host "   Admin: admin / admin" -ForegroundColor Gray
Write-Host "   Driver: driver1 / driver" -ForegroundColor Gray
Write-Host ""

Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Main: http://localhost:5173" -ForegroundColor Gray
Write-Host "   API: http://localhost:3001" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 Testing Guides:" -ForegroundColor Cyan
Write-Host "   TESTING_GUIDE.md - 14 detailed tests" -ForegroundColor Gray
Write-Host "   GPS_TRACKING_SETUP.md - Full documentation" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 Quick Test Checklist:" -ForegroundColor Cyan
Write-Host "   1. npm start" -ForegroundColor Gray
Write-Host "   2. Login as admin (admin/admin)" -ForegroundColor Gray
Write-Host "   3. Go to Today's Runs → Change a reservation to 'En Route'" -ForegroundColor Gray
Write-Host "   4. Open new tab (incognito) → /track/[token]" -ForegroundColor Gray
Write-Host "   5. Verify map loads and shows tracking info" -ForegroundColor Gray
Write-Host ""

Write-Host "▶️  Ready? Run this command:" -ForegroundColor Green
Write-Host ""
Write-Host "npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then open: http://localhost:5173" -ForegroundColor Green
Write-Host ""
