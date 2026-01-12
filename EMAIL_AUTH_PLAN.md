# Email Authentication & Registration Plan

## Goal
Allow users to register with an email address and password, verifying their email before playing. Support logging in with either **Email** or **Username** + Password. Retain Google Sign-In as an option.

## 1. User Experience (UX)

### Navigation Bar (Top Right)
- **Guest**: Shows "Play as Guest", "Log In", "Register".
- **Authenticated**: Shows Profile Pic, Name, "Sign Out" (existing behavior).

### Registration Page (`/register`)
- **Fields**:
  - Email
  - Username (Must be unique)
  - Password
  - Confirm Password
- **Action**: "Create Account" button.
- **Feedback**:
  - On success: Redirect to a "Verify your email" page or show a modal.
  - Sends a verification email from Firebase.
  - **Error Handling**: Gracefully handle `auth/email-already-in-use` (e.g., "This email is already associated with an account/Google Sign-in").
- **Alternative**: "Already have an account? Log In".

### Login Page (`/login`)
- **Fields**:
  - Email or Username
  - Password
- **Actions**:
  - "Log In" button.
  - "Sign in with Google" button (prominent alternative).
  - "Forgot Password?" link.
- **Alternative**: "Don't have an account? Register".

### Email Verification
- Users created via Email/Pass are initially "Unverified".
- App checks `user.emailVerified` status.
- If unverified, show a banner: "Please verify your email to enable full features."

---

## 2. Architecture & Tech Stack

We will leverage the **existing Firebase Auth** setup to handle the heavy lifting (security, password hashing, email sending).

### Frontend (React + Firebase)
1.  **Enable Email/Password Provider**: In Firebase Console.
2.  **`AuthContext` Update**:
    - Add `registerWithEmail(email, password)` function.
    - Add `loginWithEmail(email, password)` function.
    - Add `sendVerificationEmail()` function.
    - Handle `loginWithUsername` logic (see below).
3.  **New Pages**:
    - `src/pages/Register.tsx`
    - `src/pages/Login.tsx`
4.  **Username Handling**:
    - Firebase Auth natively authenticates with **Email**.
    - To support **Username** login:
        - We need a backend mapping: `Username` -> `Email`.
        - **Flow**:
            1. User enters "MyCoolName" + "Password".
            2. Frontend calls Backend: `GET /auth/lookup?username=MyCoolName` -> returns `email`.
            3. Frontend calls `firebase.auth().signInWithEmailAndPassword(email, password)`.

### Backend (FastAPI + Postgres)
1.  **Database Updates**:
    - Add `username` column to `users` table (**Unique**, **Indexed**, Nullable for old users).
2.  **New Endpoints** (`/auth` router):
    - `GET /auth/check-username?username=...`: Checks availability during registration.
    - `GET /auth/lookup-email?username=...`: Used for "Login with Username" flow.

---

## 3. Implementation Steps

### Step 1: Backend Support (Username Logic)
1.  **Schema Update**:
    - Add `username` column to `users` table.
    - Create migration.
2.  **API Endpoints**:
    - Create `backend/app/routers/auth.py`.
    - Implement username availability check.
    - Implement username -> email lookup.

### Step 2: Frontend Logic (AuthContext)
1.  Update `src/contexts/AuthContext.tsx` to expose `register`, `login`, `resetPassword` methods pointing to Firebase.

### Step 3: Frontend Pages
1.  **Components**:
    - Create `Register` and `Login` pages.
    - Update `Home.tsx` to handle the new "Unverified" state (show banner).
2.  **Routing**:
    - Add `/login` and `/register` routes.

### Step 4: Verification
1.  **Collision Test**: Verify that trying to register an existing Google email fails gracefully.
2.  **Username Flow**: Verify logging in with specific Username works.
