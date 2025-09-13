# Firestore Database Schema Design

## Collections Overview

### 1. users

```javascript
{
  uid: "user_auth_id", // Firebase Auth UID
  email: "user@example.com",
  displayName: "User Name",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  subscription: {
    plan: "free" | "pro" | "enterprise",
    quotaUsed: 0, // MB used
    quotaLimit: 1000, // MB limit
    billingPeriodStart: Timestamp,
    billingPeriodEnd: Timestamp
  },
  preferences: {
    theme: "light" | "dark",
    defaultDashboardId: "dashboard_id",
    notifications: boolean
  }
}
```

### 2. dashboards

```javascript
{
  id: "dashboard_uuid",
  ownerId: "user_uid",
  name: "My Soundboard",
  description: "Description of the soundboard",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  visibility: "private" | "public",
  publicLink: "unique_public_id", // For public dashboards
  settings: {
    allowDownloads: boolean,
    showThumbnails: boolean,
    theme: "light" | "dark",
    layout: "grid" | "list"
  },
  stats: {
    totalSounds: 0,
    totalPlays: 0,
    storageUsed: 0 // MB
  }
}
```

### 3. sounds

```javascript
{
  id: "sound_uuid",
  dashboardId: "dashboard_uuid",
  ownerId: "user_uid",
  name: "Sound Name",
  description: "Sound description",
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // Source information
  source: {
    type: "youtube" | "upload",
    youtubeUrl: "https://youtube.com/watch?v=...",
    videoTitle: "Original video title",
    startTime: 10.5,
    endTime: 25.3,
    duration: 14.8
  },

  // File information
  files: {
    audio: {
      path: "sounds/user_id/dashboard_id/sound_id.mp3",
      size: 1024000, // bytes
      format: "mp3",
      quality: "192kbps"
    },
    thumbnail: {
      path: "thumbnails/user_id/dashboard_id/sound_id.jpg",
      size: 50000,
      cached: boolean
    }
  },

  // Metadata
  metadata: {
    tags: ["funny", "meme"],
    category: "entertainment",
    playCount: 0,
    lastPlayed: Timestamp,
    isFavorite: boolean
  }
}
```

### 4. publicDashboards (for public sharing)

```javascript
{
  publicId: "unique_public_id",
  dashboardId: "dashboard_uuid",
  ownerId: "user_uid",
  createdAt: Timestamp,
  expiresAt: Timestamp, // Optional expiration
  accessCount: 0,
  settings: {
    allowDownloads: boolean,
    showOwnerInfo: boolean
  }
}
```

### 5. analytics (for usage tracking)

```javascript
{
  id: "analytics_uuid",
  userId: "user_uid",
  dashboardId: "dashboard_uuid",
  soundId: "sound_uuid",
  action: "play" | "download" | "share",
  timestamp: Timestamp,
  metadata: {
    userAgent: "browser info",
    ip: "hashed_ip",
    source: "public" | "private"
  }
}
```

## Security Rules Preview

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Dashboard access rules
    match /dashboards/{dashboardId} {
      allow read, write: if request.auth != null &&
        resource.data.ownerId == request.auth.uid;
      allow read: if resource.data.visibility == "public";
    }

    // Sounds access rules
    match /sounds/{soundId} {
      allow read, write: if request.auth != null &&
        resource.data.ownerId == request.auth.uid;
      allow read: if exists(/databases/$(database)/documents/dashboards/$(resource.data.dashboardId)) &&
        get(/databases/$(database)/documents/dashboards/$(resource.data.dashboardId)).data.visibility == "public";
    }

    // Public dashboards are readable by anyone
    match /publicDashboards/{publicId} {
      allow read: if true;
      allow write: if request.auth != null &&
        resource.data.ownerId == request.auth.uid;
    }
  }
}
```

## Storage Bucket Structure

```
/sounds/
  /{userId}/
    /{dashboardId}/
      /{soundId}.mp3

/thumbnails/
  /{userId}/
    /{dashboardId}/
      /{soundId}.jpg
      /{soundId}_screenshot.jpg

/temp/
  /{sessionId}/
    /processing_files/
```
