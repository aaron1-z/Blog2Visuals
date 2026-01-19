import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Service role client for database operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate user session from auth header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - No session token", code: "NO_TOKEN" },
        { status: 401 }
      );
    }

    // Create a client with the user's token to verify their session
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the token and get user
    const { data: { user: sessionUser }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid session", code: "INVALID_SESSION" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    // Step 2: Validate that the session user matches the requested user_id
    // This prevents users from deducting credits from other accounts
    if (!user_id || user_id !== sessionUser.id) {
      return NextResponse.json(
        { error: "Unauthorized - User mismatch", code: "USER_MISMATCH" },
        { status: 403 }
      );
    }

    // Step 3: Get current credits using admin client
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("credits")
      .eq("id", user_id)
      .single();

    if (fetchError) {
      console.error("Error fetching profile:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch user credits" },
        { status: 500 }
      );
    }

    const currentCredits = profile?.credits || 0;

    // Prevent negative credits
    if (currentCredits <= 0) {
      return NextResponse.json(
        { 
          error: "Insufficient credits",
          credits: 0,
          success: false 
        },
        { status: 400 }
      );
    }

    // Step 4: Atomic update - decrement by 1 only if credits > 0
    // Using a raw SQL query for atomic operation
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .rpc('decrement_credit', { user_uuid: user_id });

    // If RPC doesn't exist, fall back to regular update with check
    if (updateError && updateError.message.includes('function')) {
      // Fallback: Regular update with WHERE clause to prevent negative
      const newCredits = currentCredits - 1;
      
      const { error: fallbackError } = await supabaseAdmin
        .from("profiles")
        .update({ credits: newCredits })
        .eq("id", user_id)
        .gt("credits", 0); // Only update if credits > 0

      if (fallbackError) {
        console.error("Error updating credits:", fallbackError);
        return NextResponse.json(
          { error: "Failed to deduct credit" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        credits: newCredits,
        deducted: 1,
        message: "Credit deducted successfully",
      });
    }

    if (updateError) {
      console.error("Error in atomic update:", updateError);
      return NextResponse.json(
        { error: "Failed to deduct credit" },
        { status: 500 }
      );
    }

    // Get the new credit count
    const { data: newProfile } = await supabaseAdmin
      .from("profiles")
      .select("credits")
      .eq("id", user_id)
      .single();

    const newCredits = newProfile?.credits ?? (currentCredits - 1);

    return NextResponse.json({
      success: true,
      credits: newCredits,
      deducted: 1,
      message: "Credit deducted successfully",
    });
  } catch (error) {
    console.error("Error deducting credit:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to deduct credit",
      },
      { status: 500 }
    );
  }
}
