#!/bin/bash

echo "🚂 Deploying to Railway..."
echo

echo "Step 1: Install Railway CLI"
echo "npm install -g @railway/cli"
echo

read -p "Press enter after installing Railway CLI..."
echo

echo "Step 2: Login to Railway"
railway login

echo "Step 3: Initialize project"
railway init

echo "Step 4: Deploy"
railway up

echo
echo "✅ Deployment complete!"
echo "🔗 Your API will be available at: https://your-app-name.up.railway.app"
echo

echo "Next steps:"
echo "1. Copy your Railway URL"
echo "2. Update VITE_API_BASE_URL in tube-react-frontend/.env.production"
echo "3. Rebuild and redeploy frontend: npm run build && firebase deploy --only hosting"
