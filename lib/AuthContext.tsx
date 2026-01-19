"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "./supabase";
import { createProfile, profileExists } from "./profile";
import type { User, Session } from "@supabase/supabase-js";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/features", "/pricing", "/examples", "/privacy", "/terms", "/contact"];

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = ["/login", "/signup"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + "/")
  );

  // Check if current route is an auth route (login/signup)
  const isAuthRoute = AUTH_ROUTES.includes(pathname || "");

  useEffect(() => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn("Supabase is not configured. Auth features will be disabled.");
      setIsLoading(false);
      return;
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Ensure profile exists for authenticated user
        if (currentSession?.user) {
          const exists = await profileExists(currentSession.user.id);
          if (!exists && currentSession.user.email) {
            await createProfile(currentSession.user.id, currentSession.user.email);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Handle sign in - ensure profile exists
        if (event === "SIGNED_IN" && newSession?.user) {
          const exists = await profileExists(newSession.user.id);
          if (!exists && newSession.user.email) {
            await createProfile(newSession.user.id, newSession.user.email);
          }
        }

        // Handle sign out
        if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle redirects based on auth state
  useEffect(() => {
    if (isLoading) return;

    const isAuthenticated = !!user;

    // Redirect authenticated users away from auth routes to dashboard
    if (isAuthenticated && isAuthRoute) {
      router.replace("/dashboard");
      return;
    }

    // Redirect unauthenticated users to login (except public routes)
    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
      return;
    }
  }, [user, isLoading, pathname, isAuthRoute, isPublicRoute, router]);

  // Only show loading state for protected routes (not public ones)
  // This allows public pages to render immediately
  const shouldShowLoading = isLoading && !isPublicRoute;
  
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0a09]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-stone-400 text-sm">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
