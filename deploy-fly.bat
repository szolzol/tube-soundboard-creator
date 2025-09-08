@echo off
echo 🪰 Deploying to Fly.io...
echo.

echo Step 1: Install Fly CLI
echo Please install Fly CLI first:
echo PowerShell: iwr https://fly.io/install.ps1 -useb | iex
echo Or download from: https://fly.io/docs/getting-started/installing-flyctl/
echo.

pause
echo.

echo Step 2: Login to Fly.io
fly auth login

echo Step 3: Launch app
fly launch --no-deploy

echo Step 4: Set secrets
fly secrets set YOUTUBE_DL_EXTRACT_FLAT=false

echo Step 5: Deploy
fly deploy

echo.
echo ✅ Deployment complete!
echo 🔗 Your API will be available at: https://tube-soundboard.fly.dev
echo.
echo Next steps:
echo 1. Copy your Fly.io URL
echo 2. Update VITE_API_BASE_URL in tube-react-frontend/.env.production
echo 3. Rebuild and redeploy frontend: npm run build && firebase deploy --only hosting

pause
