# Firebase Deployment Guide for Tube Soundboard

## 🚀 Deployment Status

### ✅ Completed Steps
1. **Firebase Configuration**: Set up with project ID `tubesoundboard`
2. **Frontend Build**: Successfully built React app for production
3. **Frontend Deployment**: Deployed to Firebase Hosting at `https://tubesoundboard.web.app`
4. **Environment Configuration**: Set up with proper API endpoints and secrets management

### 🔄 Next Steps Required

#### 1. Upgrade Firebase Plan
**Required**: Upgrade to Blaze (pay-as-you-go) plan to deploy Cloud Functions
- Visit: https://console.firebase.google.com/project/tubesoundboard/usage/details
- Click "Upgrade to Blaze plan"
- This enables Cloud Functions and external API access (required for yt-dlp)

#### 2. Deploy Backend Functions
After upgrading, run:
```bash
firebase deploy --only functions
```

#### 3. Enable Required APIs
The following Google Cloud APIs need to be enabled:
- Cloud Functions API
- Cloud Build API
- Artifact Registry API
- Cloud Storage API
- Firestore API

## 📁 Project Structure

```
tube-soundboard/
├── tube-react-frontend/          # React frontend
│   ├── dist/                     # Built files (deployed to Hosting)
│   ├── src/
│   │   ├── config/firebase.js    # Firebase configuration
│   │   └── services/apiService.js # API service layer
│   ├── .env.production          # Production environment variables
│   └── .env.local               # Local development variables
├── functions/                    # Firebase Cloud Functions
│   ├── main.py                  # Main Cloud Function (Flask-based API)
│   ├── tube_audio_extractor.py  # Audio extraction logic
│   └── requirements.txt         # Python dependencies
├── firebase.json                # Firebase configuration
├── .firebaserc                  # Firebase project settings
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.production)
```env
VITE_FIREBASE_API_KEY=AIzaSyDp_sN2gcHc9wylFY1homXzTQe5dQbxMMk
VITE_FIREBASE_AUTH_DOMAIN=tubesoundboard.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tubesoundboard
VITE_FIREBASE_STORAGE_BUCKET=tubesoundboard.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=508603587144
VITE_FIREBASE_APP_ID=1:508603587144:web:9d206335a8905cbe95567d
VITE_API_BASE_URL=https://us-central1-tubesoundboard.cloudfunctions.net/api
```

### API Endpoints (After Functions Deployment)

#### Production URLs
- **Frontend**: https://tubesoundboard.web.app
- **API Base**: https://us-central1-tubesoundboard.cloudfunctions.net/api
- **Health Check**: https://us-central1-tubesoundboard.cloudfunctions.net/api/health
- **Video Info**: https://us-central1-tubesoundboard.cloudfunctions.net/api/video-info

## 🏗️ Architecture

### Frontend (Firebase Hosting)
- **React + Vite**: Modern frontend build
- **Firebase SDK**: Authentication and storage integration
- **PWA Support**: Service worker for offline functionality
- **API Service**: Centralized API communication layer

### Backend (Firebase Cloud Functions)
- **Flask API**: RESTful endpoints for audio processing
- **Firebase Storage**: File storage for audio, thumbnails, screenshots
- **Firestore**: Metadata and job status storage
- **yt-dlp Integration**: YouTube video processing

### Data Flow
1. **Frontend** → Sends request to Cloud Function
2. **Cloud Function** → Processes with yt-dlp
3. **Firebase Storage** → Stores audio files and media
4. **Firestore** → Stores metadata and job status
5. **Frontend** → Retrieves data via API and direct Storage URLs

## 🚦 Deployment Commands

### Development
```bash
# Frontend
cd tube-react-frontend
npm run dev

# Backend (local)
python main.py
```

### Production Deployment
```bash
# Build frontend
cd tube-react-frontend
npm run build

# Deploy frontend only
firebase deploy --only hosting

# Deploy backend only (after Blaze upgrade)
firebase deploy --only functions

# Deploy everything
firebase deploy
```

## 🔒 Security & Secrets

### Firebase Rules (to be configured)
- **Storage Rules**: Secure file access
- **Firestore Rules**: Secure database access
- **Functions Configuration**: Environment variables for sensitive data

### Environment Variables for Functions
After deployment, configure:
```bash
firebase functions:config:set app.youtube_api_key="your-api-key"
firebase functions:config:set app.environment="production"
```

## 📊 Monitoring & Logs

### Firebase Console
- **Functions Logs**: https://console.firebase.google.com/project/tubesoundboard/functions/logs
- **Hosting**: https://console.firebase.google.com/project/tubesoundboard/hosting
- **Storage**: https://console.firebase.google.com/project/tubesoundboard/storage
- **Firestore**: https://console.firebase.google.com/project/tubesoundboard/firestore

### Performance Monitoring
- Firebase Performance Monitoring can be added for frontend
- Cloud Functions automatically provide execution metrics

## 🎯 Next Phase Features

After successful deployment:
1. **User Authentication**: Firebase Auth integration
2. **User Storage**: Per-user sound libraries
3. **Advanced Processing**: Background job queues
4. **CDN Integration**: Global content delivery
5. **Analytics**: Usage tracking and optimization

## 🐛 Troubleshooting

### Common Issues
1. **CORS Errors**: Check Firebase Functions CORS configuration
2. **Build Failures**: Verify all environment variables are set
3. **API Timeouts**: Cloud Functions have 540s timeout limit
4. **Storage Permissions**: Check Firebase Storage rules

### Logs and Debugging
```bash
# View function logs
firebase functions:log

# Local function testing
firebase emulators:start --only functions

# Local hosting testing  
firebase emulators:start --only hosting
```

## 💰 Cost Estimation

### Firebase Blaze Plan Costs
- **Cloud Functions**: $0.0000004 per invocation + compute time
- **Firebase Storage**: $0.026 per GB stored
- **Firestore**: $0.06 per 100K reads
- **Hosting**: Free for up to 10GB transfer/month

### Expected Monthly Cost (Light Usage)
- **~100 extractions/month**: ~$5-10
- **~1GB storage**: ~$0.50
- **Total estimated**: $5-15/month for moderate usage
