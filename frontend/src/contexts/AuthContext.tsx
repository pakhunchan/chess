import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type User,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification as firebaseSendEmailVerification,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<User>;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  loginWithUsername: (username: string, pass: string) => Promise<User>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (error) {
      console.error("Error registering:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  const loginWithUsername = async (username: string, pass: string) => {
    // 1. Lookup email from backend
    const response = await fetch(`${API_URL}/auth/lookup-email?username=${username}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Username not found");
      }
      throw new Error("Failed to lookup username");
    }
    const data = await response.json();

    // 2. Login with looked-up email
    return loginWithEmail(data.email, pass);
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await firebaseSendEmailVerification(auth.currentUser);
    }
  };

  const resetPassword = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        loginWithUsername,
        sendVerificationEmail,
        resetPassword,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
