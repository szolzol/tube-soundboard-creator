#!/bin/bash
# Deploy script for Tube Soundboard

echo "🚀 Tube Soundboard Deployment Script"
echo "=====================================

# Check if logged in to Firebase
if ! firebase projects:list >/dev/null 2>&1; then
    echo "❌ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

# Set project
echo "📝 Setting Firebase project..."
firebase use tubesoundboard

# Build frontend
echo "🏗️  Building frontend..."
cd tube-react-frontend
npm install
npm run build
cd ..

# Deploy frontend
echo "🌐 Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Frontend deployed successfully!"
echo "🔗 URL: https://tubesoundboard.web.app"

# Check if Blaze plan is active for functions deployment
echo ""
echo "🔥 To deploy backend functions:"
echo "1. Upgrade to Blaze plan: https://console.firebase.google.com/project/tubesoundboard/usage/details"
echo "2. Run: firebase deploy --only functions"
echo ""
echo "📚 See DEPLOYMENT.md for full instructions"
