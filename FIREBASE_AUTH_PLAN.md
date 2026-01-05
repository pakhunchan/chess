# Firebase Google Sign-In Implementation Plan

## Goal
Add Google Sign-in to the frontend using Firebase Authentication. Frontend-only for now (no backend token verification).

## Files to Create/Modify

### New Files
1. `frontend/src/lib/firebase.ts` - Firebase initialization
2. `frontend/src/contexts/AuthContext.tsx` - Auth state management

### Modified Files
1. `frontend/.env.local` - Add Firebase config vars
2. `frontend/src/App.tsx` - Wrap with AuthProvider
3. `frontend/src/pages/Home.tsx` - Enable Sign In button, show user info

## Implementation Steps

### Step 1: Install Firebase SDK
```bash
cd frontend && npm install firebase
```

### Step 2: Create Firebase Config (`frontend/src/lib/firebase.ts`)
- Initialize Firebase app with config from env vars
- Export auth instance and Google provider
- Env vars needed:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_APP_ID`

### Step 3: Create AuthContext (`frontend/src/contexts/AuthContext.tsx`)
- Create React context for auth state
- Provide `user`, `loading`, `signInWithGoogle`, `signOut`
- Use `onAuthStateChanged` listener to track auth state
- Handle errors gracefully

### Step 4: Update App.tsx
- Import and wrap with `AuthProvider`

### Step 5: Update Home.tsx
- Import `useAuth` hook
- Replace disabled "Sign In" button with working button
- When signed in:
  - Show user avatar and name
  - Show "Sign Out" button
- When signed out:
  - Show "Sign In with Google" button

## Environment Variables

Get these from Firebase Console → Project Settings → Your apps → Web app:

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=xxx
```

For Vercel: Add same vars in Project Settings → Environment Variables

## Firebase Console Setup Required
1. Enable Google sign-in provider in Authentication → Sign-in method
2. Add authorized domains:
   - `localhost` (for local dev)
   - Your Vercel domain (e.g., `chess.pakhunchan.com`)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. User clicks "Sign In with Google"                           │
│  2. Firebase SDK opens Google popup                             │
│  3. User authenticates with Google                              │
│  4. Firebase returns user info (name, email, photo)             │
│  5. Frontend stores auth state & shows user as logged in        │
└─────────────────────────────────────────────────────────────────┘
```

## Future: Backend Integration (Phase 2)

When ready to associate games with user accounts:

1. Backend verifies Firebase JWT tokens
2. Create `users` table in PostgreSQL
3. Associate games with user IDs
4. Enable features like:
   - Game history
   - Leaderboards
   - User profiles
