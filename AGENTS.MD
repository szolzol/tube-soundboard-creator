# AI Agent Guidelines for Tube Soundboard Project

## 🎯 Project Overview

This is a full-stack Tube Soundboard application with:
- **Frontend**: React + Vite (deployed on Firebase Hosting)
- **Backend**: FastAPI + yt-dlp (deployed on Railway)
- **Database**: Hybrid local (IndexedDB) + cloud (Firestore)
- **Storage**: Local files + Firebase Cloud Storage
- **Authentication**: Firebase Auth with email/password and Google sign-in

## 🚀 Build & Deploy Pipelines

### Frontend Deployment (Firebase Hosting)
```bash
# Build and deploy
cd tube-react-frontend
npm run build
firebase deploy --only hosting

# Environment: Production
# Auto-deploy: Manual via Firebase CLI
# Domain: https://tubesoundboard.web.app
```

### Backend Deployment (Railway)
```bash
# Auto-deploy via GitHub webhook
git push origin main

# Environment: Production
# Auto-deploy: Yes, triggered by git push
# Domain: https://tubesoundboard-production.up.railway.app
# Runtime: Python 3.11
```

### Database & Storage
- **Firestore**: Auto-deployed via `firebase deploy --only firestore`
- **Storage Rules**: Auto-deployed via `firebase deploy --only storage`
- **Security Rules**: Located in `firestore.rules` and `storage.rules`

## 🔐 Security & Environment Variables

### ❌ NEVER COMMIT THESE:
- API keys (Firebase, Google, etc.)
- Database credentials
- Environment variables (`.env*` files)
- Private certificates or tokens
- User data or test credentials

### ✅ Environment Variable Handling:

#### Frontend (.env.local)
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=tubesoundboard.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tubesoundboard
VITE_FIREBASE_STORAGE_BUCKET=tubesoundboard.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Backend (Railway Environment Variables)
- Set via Railway dashboard
- Never commit to git
- Use Railway's environment variable management

#### Security Rules:
1. **Always use environment variables** for sensitive data
2. **Check .gitignore** includes `.env*` files
3. **Use Railway/Firebase dashboards** for production secrets
4. **Rotate keys** if accidentally committed

## 🛠️ Agent Development Guidelines

### Minimal Code Changes Principle

When implementing new features:

#### ✅ DO:
- **Identify the minimum files** that need changes
- **Use existing patterns** and architecture
- **Extend existing components** rather than creating new ones
- **Leverage existing hooks** and services
- **Follow the established file structure**

#### ❌ DON'T:
- Rewrite entire files when small changes suffice
- Create duplicate functionality
- Change core architecture without discussion
- Modify multiple files when one would suffice
- Break existing functionality

### File Change Priority (Minimal Impact)

1. **Configuration changes**: Update existing config files
2. **Component extensions**: Add props or methods to existing components
3. **New utility functions**: Add to existing service files
4. **New components**: Only if absolutely necessary
5. **Architecture changes**: Last resort, requires discussion

### Example: Adding a Feature
```diff
// ❌ BAD: Creating entirely new files and components
+ NewComplexFeature.jsx (200 lines)
+ NewComplexService.js (150 lines)
+ NewComplexHook.js (100 lines)

// ✅ GOOD: Extending existing functionality
  App.jsx (5 lines added)
  storageManager.js (10 lines added)
```

### Code Review Checklist
- [ ] Minimum necessary files changed
- [ ] No secrets or API keys committed
- [ ] Existing patterns followed
- [ ] No duplicate functionality created
- [ ] Error handling preserved
- [ ] TypeScript/PropTypes maintained (if applicable)

## 📁 Project Structure Understanding

```
tube-soundboard/
├── tube-react-frontend/          # React frontend
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API and storage services
│   │   ├── config/              # Configuration files
│   │   └── App.jsx              # Main application component
│   ├── .env.local               # Environment variables (NOT IN GIT)
│   └── package.json
├── main.py                      # FastAPI backend
├── requirements.txt             # Python dependencies
├── railway.json                 # Railway deployment config
├── firebase.json                # Firebase project config
├── firestore.rules             # Firestore security rules
├── storage.rules               # Firebase Storage security rules
├── Dockerfile                  # Container configuration
└── README.md                   # Project documentation
```

### Key Files to Understand:

#### Core Architecture:
- `App.jsx` - Main application entry point
- `storageManager.js` - Hybrid local/cloud storage abstraction
- `authService.js` - Firebase authentication handling
- `main.py` - Backend API endpoints

#### Configuration:
- `firebase.js` - Firebase configuration
- `firestore.rules` - Database security rules
- `railway.json` - Deployment configuration

## 📚 Documentation Updates

### README.md Update Requirements

After every **major project change**, update README.md with:

#### ✅ Update These Sections:
1. **Features list** - Add new capabilities
2. **Installation instructions** - Update dependencies
3. **Environment variables** - Document new variables
4. **Deployment steps** - Update if process changed
5. **API endpoints** - Document new backend routes
6. **Architecture diagram** - Update if structure changed

#### 🔄 Major Changes Include:
- New authentication methods
- Database schema changes
- New deployment platforms
- Architecture modifications
- New major features (multi-dashboard, public sharing, etc.)
- Breaking changes to existing functionality

#### Example README Update:
```markdown
## ✨ Recent Updates
- Added hybrid local/cloud storage
- Implemented multi-dashboard support
- Added Firebase authentication
- Enhanced thumbnail caching for YouTube Shorts

## 🏗️ Architecture
[Updated diagram showing new hybrid storage]

## 🔧 Environment Setup
[Updated with new Firebase variables]
```

## 🧪 Testing Guidelines

### Before Any Deployment:
1. **Test locally** with `npm run dev`
2. **Check Firebase connection** with debug components
3. **Verify environment variables** are set correctly
4. **Test authentication flow** end-to-end
5. **Verify storage operations** (local and cloud)

### Cross-Device Testing:
1. Test on multiple browsers
2. Test authentication persistence
3. Verify cloud storage sync
4. Check offline functionality

## 🚨 Emergency Procedures

### If Secrets Are Accidentally Committed:
1. **Immediately revoke** the compromised keys
2. **Generate new keys** in respective platforms
3. **Update environment variables** in deployment platforms
4. **Force push** to remove from git history (if necessary)
5. **Notify team** of the incident

### If Deployment Fails:
1. **Check Railway logs** for backend issues
2. **Check Firebase console** for frontend issues
3. **Verify environment variables** are set correctly
4. **Test locally** to isolate the issue
5. **Revert to last working commit** if necessary

## 📞 Platform-Specific Commands

### Firebase CLI:
```bash
firebase login
firebase deploy --only hosting
firebase deploy --only firestore
firebase deploy --only storage
```

### Railway CLI:
```bash
railway login
railway status
railway logs
```

### Development:
```bash
cd tube-react-frontend
npm run dev        # Start frontend dev server
cd ../
python main.py     # Start backend locally
```

---

## 🎯 Summary for Agents

1. **Security First**: Never commit secrets, always use environment variables
2. **Minimal Changes**: Change only what's necessary, leverage existing code
3. **Follow Patterns**: Use established architecture and patterns
4. **Update Docs**: Keep README.md current after major changes
5. **Test Thoroughly**: Verify changes work locally and in production
6. **Understand Structure**: Know the hybrid local/cloud architecture

**Remember**: This project uses a sophisticated hybrid storage system. Always consider both local and cloud storage implications when making changes.