# AndroidVenture Setup Script
# Run this script to set up the development environment

Write-Host "🚀 AndroidVenture Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Android Studio is installed
Write-Host "📱 Checking for Android Studio..." -ForegroundColor Yellow
$androidStudioPath = "C:\Program Files\Android\Android Studio"
if (Test-Path $androidStudioPath) {
    Write-Host "✅ Android Studio found" -ForegroundColor Green
} else {
    Write-Host "❌ Android Studio not found. Please install it from https://developer.android.com/studio" -ForegroundColor Red
    exit 1
}

# Check for Node.js
Write-Host "📦 Checking for Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install it from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Create OpenCV directory structure
Write-Host "📁 Creating OpenCV directory structure..." -ForegroundColor Yellow
$opencvPath = "app\src\main\cpp\opencv"
if (!(Test-Path $opencvPath)) {
    New-Item -ItemType Directory -Path $opencvPath -Force | Out-Null
    Write-Host "✅ OpenCV directory created at: $opencvPath" -ForegroundColor Green
} else {
    Write-Host "✅ OpenCV directory already exists" -ForegroundColor Green
}

# Check if OpenCV SDK is present
$opencvSdkPath = "$opencvPath\sdk"
if (Test-Path $opencvSdkPath) {
    Write-Host "✅ OpenCV SDK found" -ForegroundColor Green
} else {
    Write-Host "⚠️  OpenCV SDK not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please download OpenCV Android SDK:" -ForegroundColor Cyan
    Write-Host "1. Visit: https://opencv.org/releases/" -ForegroundColor White
    Write-Host "2. Download: OpenCV-4.8.0-android-sdk.zip" -ForegroundColor White
    Write-Host "3. Extract and copy the 'sdk' folder to: $opencvPath" -ForegroundColor White
    Write-Host ""
    Write-Host "See OPENCV_SETUP.md for detailed instructions" -ForegroundColor Cyan
}

# Setup web viewer
Write-Host "🌐 Setting up web viewer..." -ForegroundColor Yellow
Push-Location web
if (Test-Path "package.json") {
    Write-Host "Installing npm packages..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Web viewer dependencies installed" -ForegroundColor Green
        Write-Host "Building TypeScript..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ TypeScript compiled successfully" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Failed to install web dependencies" -ForegroundColor Red
    }
} else {
    Write-Host "❌ package.json not found in web directory" -ForegroundColor Red
}
Pop-Location

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open the project in Android Studio" -ForegroundColor White
Write-Host "2. Download OpenCV SDK if not already done (see above)" -ForegroundColor White
Write-Host "3. Sync Gradle project" -ForegroundColor White
Write-Host "4. Connect an Android device" -ForegroundColor White
Write-Host "5. Click Run (Shift+F10)" -ForegroundColor White
Write-Host ""
Write-Host "For web viewer:" -ForegroundColor Cyan
Write-Host "  cd web" -ForegroundColor White
Write-Host "  npm run serve" -ForegroundColor White
Write-Host ""
Write-Host "See QUICKSTART.md for detailed instructions" -ForegroundColor Yellow
Write-Host ""
