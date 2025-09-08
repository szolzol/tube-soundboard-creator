@echo off
REM Deploy script for Tube Soundboard (Windows)

echo 🚀 Tube Soundboard Deployment Script
echo =====================================

REM Check if logged in to Firebase
firebase projects:list >nul 2>&1
if errorlevel 1 (
    echo ❌ Not logged in to Firebase. Please run: firebase login
    exit /b 1
)

REM Set project
echo 📝 Setting Firebase project...
firebase use tubesoundboard

REM Build frontend
echo 🏗️  Building frontend...
cd tube-react-frontend
call npm install
call npm run build
cd ..

REM Deploy frontend
echo 🌐 Deploying frontend to Firebase Hosting...
firebase deploy --only hosting

echo ✅ Frontend deployed successfully!
echo 🔗 URL: https://tubesoundboard.web.app
echo.
echo 🔥 To deploy backend functions:
echo 1. Upgrade to Blaze plan: https://console.firebase.google.com/project/tubesoundboard/usage/details
echo 2. Run: firebase deploy --only functions
echo.
echo 📚 See DEPLOYMENT.md for full instructions

pause
