@echo off
echo 🎨 Deploying to Render...
echo.

echo Step 1: Push to GitHub
echo Make sure your code is pushed to GitHub first
echo.

pause
echo.

echo Step 2: Create Render account and connect GitHub
echo 1. Go to https://render.com
echo 2. Sign up with GitHub
echo 3. Click "New Web Service"
echo 4. Connect this repository
echo.

echo Configuration for Render:
echo Name: tube-soundboard-api
echo Environment: Python 3
echo Build Command: pip install -r requirements.txt
echo Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
echo.

echo Environment Variables to add:
echo YOUTUBE_DL_EXTRACT_FLAT=false
echo PORT=10000
echo.

echo ✅ Manual setup required on Render dashboard
echo 🔗 Your API will be available at: https://tube-soundboard-api.onrender.com
echo.
echo Next steps:
echo 1. Complete setup on Render dashboard
echo 2. Copy your Render URL
echo 3. Update VITE_API_BASE_URL in tube-react-frontend/.env.production
echo 4. Rebuild and redeploy frontend: npm run build && firebase deploy --only hosting

pause
