import { supabase } from "./supabase";

const DEFAULT_CREDITS = 1;

// Profile type definition (matches your Supabase table)
// profiles table: id (references auth.users), email, credits, created_at
export interface Profile {
  id: string; // This is the auth user id
  email: string;
  credits: number;
  created_at: string;
}

// Create profile for a new user (prevents duplicates using upsert)
export async function createProfile(
  userId: string,
  email: string
): Promise<{ profile: Profile | null; error: Error | null }> {
  try {
    // Use upsert to prevent duplicate profiles
    // The id IS the user_id in your schema (references auth.users(id))
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId, // id references auth.users(id)
          email: email,
          credits: DEFAULT_CREDITS,
        },
        {
          onConflict: "id",
          ignoreDuplicates: true, // Don't update if exists, just return
        }
      )
      .select()
      .single();

    if (error) {
      // If the error is due to the row already existing with ignoreDuplicates,
      // try to fetch the existing profile
      if (error.code === "PGRST116") {
        const existingProfile = await getProfileByUserId(userId);
        if (existingProfile) {
          return { profile: existingProfile, error: null };
        }
      }
      console.error("Error creating profile:", error);
      return { profile: null, error: new Error(error.message) };
    }

    return { profile: data as Profile, error: null };
  } catch (err) {
    console.error("Error in createProfile:", err);
    return { profile: null, error: err as Error };
  }
}

// Get profile by user_id (which is the id column in your schema)
export async function getProfileByUserId(
  userId: string
): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  } catch {
    return null;
  }
}

// Get profile by email
export async function getProfileByEmail(
  email: string
): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  } catch {
    return null;
  }
}

// Check if profile exists for user
export async function profileExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

// Get user credits from profile
export async function getProfileCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.credits;
  } catch {
    return 0;
  }
}

// Update profile credits
export async function updateProfileCredits(
  userId: string,
  credits: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ credits })
      .eq("id", userId);

    return !error;
  } catch {
    return false;
  }
}

// Decrement profile credits by 1
export async function decrementProfileCredits(
  userId: string
): Promise<{ success: boolean; remaining: number }> {
  try {
    // First get current credits
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (fetchError || !data) {
      return { success: false, remaining: 0 };
    }

    if (data.credits <= 0) {
      return { success: false, remaining: 0 };
    }

    const newCredits = data.credits - 1;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      return { success: false, remaining: data.credits };
    }

    return { success: true, remaining: newCredits };
  } catch {
    return { success: false, remaining: 0 };
  }
}

// Add credits to profile (after payment)
export async function addProfileCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; total: number }> {
  try {
    // First get current credits
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (fetchError || !data) {
      return { success: false, total: 0 };
    }

    const newCredits = data.credits + amount;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      return { success: false, total: data.credits };
    }

    return { success: true, total: newCredits };
  } catch {
    return { success: false, total: 0 };
  }
}
