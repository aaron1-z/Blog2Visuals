import { supabase } from "./supabase";

const SESSION_ID_KEY = "blog2visuals_session_id";
const USER_ID_KEY = "blog2visuals_user_id";
const DEFAULT_CREDITS = 1;

// Generate a random session ID
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}

// Get or create session ID from localStorage
export function getSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
}

// Get stored user ID from localStorage
export function getStoredUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(USER_ID_KEY);
}

// Store user ID in localStorage
function storeUserId(userId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_ID_KEY, userId);
  }
}

// User type definition
export interface User {
  id: string;
  session_id: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

// Create or fetch user from Supabase
export async function createOrFetchUser(): Promise<User | null> {
  try {
    const sessionId = getSessionId();
    
    if (!sessionId) {
      console.error("Could not get session ID");
      return null;
    }

    // First, try to fetch existing user by session_id
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (existingUser && !fetchError) {
      // User exists, store ID and return
      storeUserId(existingUser.id);
      return existingUser as User;
    }

    // User doesn't exist, create new one
    if (fetchError && fetchError.code === "PGRST116") {
      // PGRST116 = no rows returned, create new user
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          session_id: sessionId,
          credits: DEFAULT_CREDITS,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        return null;
      }

      if (newUser) {
        storeUserId(newUser.id);
        return newUser as User;
      }
    }

    // Some other error occurred
    if (fetchError) {
      console.error("Error fetching user:", fetchError);
    }

    return null;
  } catch (error) {
    console.error("Error in createOrFetchUser:", error);
    return null;
  }
}

// Get user credits
export async function getUserCredits(): Promise<number> {
  const userId = getStoredUserId();
  
  if (!userId) {
    return DEFAULT_CREDITS;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return DEFAULT_CREDITS;
    }

    return data.credits;
  } catch {
    return DEFAULT_CREDITS;
  }
}

// Update user credits
export async function updateUserCredits(credits: number): Promise<boolean> {
  const userId = getStoredUserId();
  
  if (!userId) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({ credits, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return !error;
  } catch {
    return false;
  }
}

// Decrement user credits by 1
export async function decrementCredits(): Promise<{ success: boolean; remaining: number }> {
  const userId = getStoredUserId();
  
  if (!userId) {
    return { success: false, remaining: 0 };
  }

  try {
    // First get current credits
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (fetchError || !userData) {
      return { success: false, remaining: 0 };
    }

    const currentCredits = userData.credits;
    
    if (currentCredits <= 0) {
      return { success: false, remaining: 0 };
    }

    // Decrement credits
    const newCredits = currentCredits - 1;
    const { error: updateError } = await supabase
      .from("users")
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      return { success: false, remaining: currentCredits };
    }

    return { success: true, remaining: newCredits };
  } catch {
    return { success: false, remaining: 0 };
  }
}

// Add credits to user (after payment)
export async function addCredits(amount: number): Promise<{ success: boolean; total: number }> {
  const userId = getStoredUserId();
  
  if (!userId) {
    return { success: false, total: 0 };
  }

  try {
    // First get current credits
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (fetchError || !userData) {
      return { success: false, total: 0 };
    }

    const newCredits = userData.credits + amount;
    
    const { error: updateError } = await supabase
      .from("users")
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateError) {
      return { success: false, total: userData.credits };
    }

    return { success: true, total: newCredits };
  } catch {
    return { success: false, total: 0 };
  }
}
