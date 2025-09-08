# 🚀 Quick Deploy Guide

## Recommended: Railway (Easiest)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Run deployment script
./deploy-railway.bat

# 3. Update frontend with your Railway URL
# Edit tube-react-frontend/.env.production:
VITE_API_BASE_URL=https://your-app-name.up.railway.app

# 4. Redeploy frontend
cd tube-react-frontend
npm run build
firebase deploy --only hosting
```

## Alternative: Render
```bash
# 1. Push code to GitHub
git add .
git commit -m "Deploy to Render"
git push

# 2. Follow manual setup
./deploy-render.bat

# 3. Configure on Render dashboard
# 4. Update frontend URL and redeploy
```

## Alternative: Fly.io
```bash
# 1. Install Fly CLI
# PowerShell: iwr https://fly.io/install.ps1 -useb | iex

# 2. Run deployment script
./deploy-fly.bat

# 3. Update frontend with your Fly.io URL
# 4. Redeploy frontend
```

## Free Tier Comparison

| Platform | Free Tier | Pros | Cons |
|----------|-----------|------|------|
| **Railway** | $5/month credit | ✅ Easiest setup<br>✅ Persistent storage<br>✅ Auto-deployments | Credit-based |
| **Render** | 750 hours/month | ✅ Generous free tier<br>✅ Auto-deployments | Cold starts |
| **Fly.io** | 3 shared VMs | ✅ Good performance<br>✅ Global edge | More complex setup |

## ⭐ Recommendation: Railway
Railway is the easiest to set up and has the best free tier for your app's needs.
