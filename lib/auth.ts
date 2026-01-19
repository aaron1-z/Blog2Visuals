import { supabase } from "./supabase";
import { createProfile, profileExists } from "./profile";
import type { User, Session, AuthError } from "@supabase/supabase-js";

// Response types
export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface UserResponse {
  user: User | null;
  error: AuthError | null;
}

// Sign up with email and password
// Also creates a profile record with default credits
export async function signUp(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return {
        user: data.user,
        session: data.session,
        error,
      };
    }

    // If signup successful and we have a user, create their profile
    if (data.user) {
      // Check if profile already exists (prevents duplicates)
      const exists = await profileExists(data.user.id);
      
      if (!exists) {
        // Create profile with default credits (1)
        const { error: profileError } = await createProfile(
          data.user.id,
          email
        );

        if (profileError) {
          console.error("Error creating profile:", profileError);
          // Note: We don't fail the signup if profile creation fails
          // The profile can be created later via ensureProfile
        }
      }
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: err as AuthError,
    };
  }
}

// Sign in with email and password
// Also ensures profile exists (for users who signed up before profile system)
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        user: data.user,
        session: data.session,
        error,
      };
    }

    // Ensure profile exists for this user
    if (data.user) {
      const exists = await profileExists(data.user.id);
      
      if (!exists) {
        // Create profile if it doesn't exist
        await createProfile(data.user.id, email);
      }
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      session: null,
      error: err as AuthError,
    };
  }
}

// Sign out current user
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    return { error: err as AuthError };
  }
}

// Get current authenticated user
export async function getCurrentUser(): Promise<UserResponse> {
  try {
    const { data, error } = await supabase.auth.getUser();
    return {
      user: data.user,
      error,
    };
  } catch (err) {
    return {
      user: null,
      error: err as AuthError,
    };
  }
}

// Get current session
export async function getSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();
    return {
      session: data.session,
      error,
    };
  } catch (err) {
    return {
      session: null,
      error: err as AuthError,
    };
  }
}

// Listen to auth state changes
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  // Return unsubscribe function
  return data.subscription.unsubscribe;
}

// Reset password (send reset email)
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  } catch (err) {
    return { error: err as AuthError };
  }
}

// Update password (after reset)
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  } catch (err) {
    return { error: err as AuthError };
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const { user } = await getCurrentUser();
  return !!user;
}

// Ensure user has a profile (useful for users who signed up before profile system)
// Call this after login to create profile if it doesn't exist
export async function ensureProfile(): Promise<void> {
  try {
    const { user } = await getCurrentUser();
    
    if (!user || !user.email) {
      return;
    }

    const exists = await profileExists(user.id);
    
    if (!exists) {
      await createProfile(user.id, user.email);
    }
  } catch (error) {
    console.error("Error ensuring profile:", error);
  }
}
