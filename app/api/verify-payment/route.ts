import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Service role client for database operations (only this can modify credits)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const CREDITS_TO_ADD = 10;
const AMOUNT_IN_PAISE = 19900; // ₹199

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      user_id,
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { 
          error: "Missing payment verification details",
          code: "MISSING_DETAILS"
        },
        { status: 400 }
      );
    }

    // Step 1: Validate user session (if user_id provided)
    if (user_id) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (token) {
        // Verify the session user matches the claimed user_id
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });

        const { data: { user: sessionUser }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (!authError && sessionUser && sessionUser.id !== user_id) {
          // User mismatch - potential attack
          console.error("User ID mismatch in payment verification:", {
            claimed: user_id,
            actual: sessionUser.id,
          });
          return NextResponse.json(
            { 
              error: "Unauthorized - User mismatch",
              code: "USER_MISMATCH"
            },
            { status: 403 }
          );
        }
      }
    }

    // Validate Razorpay credentials
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay secret not configured");
      return NextResponse.json(
        { 
          error: "Payment verification not configured",
          code: "CONFIG_ERROR"
        },
        { status: 500 }
      );
    }

    // Step 2: Check for duplicate verification by PAYMENT_ID (prevent double crediting)
    const { data: existingByPaymentId } = await supabaseAdmin
      .from("payments")
      .select("id, status, credits_added")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .single();

    if (existingByPaymentId) {
      // Payment already processed - return existing data without adding credits again
      console.log("Duplicate verification (payment_id):", razorpay_payment_id);
      
      // Get current user credits
      let currentCredits = 0;
      if (user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("credits")
          .eq("id", user_id)
          .single();
        currentCredits = profile?.credits || 0;
      }

      return NextResponse.json({
        success: true,
        verified: true,
        duplicate: true,
        credits_added: 0, // No new credits added
        total_credits: currentCredits,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        message: "Payment already verified. No additional credits added.",
        code: "ALREADY_VERIFIED"
      });
    }

    // Step 3: Check for replay attack using ORDER_ID (each order should only be paid once)
    const { data: existingByOrderId } = await supabaseAdmin
      .from("payments")
      .select("id, status, razorpay_payment_id")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("status", "success")
      .single();

    if (existingByOrderId) {
      // Order already has a successful payment - potential replay attack
      console.error("Replay attack detected - order already paid:", {
        order_id: razorpay_order_id,
        existing_payment: existingByOrderId.razorpay_payment_id,
        new_payment: razorpay_payment_id,
      });
      
      return NextResponse.json({
        success: false,
        verified: false,
        duplicate: true,
        error: "This order has already been paid. If you believe this is an error, please contact support.",
        code: "REPLAY_ATTACK"
      }, { status: 400 });
    }

    // Step 4: Generate HMAC SHA256 signature using order_id|payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Step 5: Compare with razorpay_signature (timing-safe comparison)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );

    if (!isValid) {
      // Invalid signature - reject request
      console.error("Invalid payment signature for:", razorpay_payment_id);
      
      // Record failed verification attempt (using admin client)
      if (user_id) {
        await supabaseAdmin.from("payments").insert({
          user_id: user_id,
          razorpay_order_id: razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          amount: AMOUNT_IN_PAISE,
          credits_added: 0,
          status: "signature_failed",
        });
      }

      return NextResponse.json(
        { 
          error: "Payment verification failed - invalid signature",
          code: "INVALID_SIGNATURE"
        },
        { status: 400 }
      );
    }

    // ✅ Signature is valid! Now update database using ADMIN client only
    // Frontend cannot directly modify credits - only this API can
    let newTotalCredits = CREDITS_TO_ADD;

    // Step 6: Update profiles table - credits = credits + 10
    if (user_id) {
      // Get current credits from profiles (using admin client)
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("credits")
        .eq("id", user_id)
        .single();

      if (fetchError) {
        console.error("Error fetching profile:", fetchError);
        return NextResponse.json(
          { 
            error: "Failed to fetch user profile",
            code: "PROFILE_ERROR"
          },
          { status: 500 }
        );
      }

      const currentCredits = profile?.credits || 0;
      newTotalCredits = currentCredits + CREDITS_TO_ADD;

      // Update credits in profiles table (using admin client - only way to add credits)
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ credits: newTotalCredits })
        .eq("id", user_id);

      if (updateError) {
        console.error("Error updating credits:", updateError);
        return NextResponse.json(
          { 
            error: "Failed to update credits. Please contact support.",
            code: "CREDIT_UPDATE_ERROR"
          },
          { status: 500 }
        );
      }

      // Step 7: Insert payment record (after credits updated successfully)
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          user_id: user_id,
          razorpay_order_id: razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          amount: AMOUNT_IN_PAISE,
          credits_added: CREDITS_TO_ADD,
          status: "success",
        });

      if (paymentError) {
        console.error("Error recording payment:", paymentError);
        // Don't fail - credits already added, payment record is secondary
        // But log for manual reconciliation
      }
    }

    // Step 8: Return success with updated credit count
    return NextResponse.json({
      success: true,
      verified: true,
      duplicate: false,
      credits_added: CREDITS_TO_ADD,
      total_credits: newTotalCredits,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      message: `Payment successful! ${CREDITS_TO_ADD} credits added. Total: ${newTotalCredits}`,
      code: "SUCCESS"
    });
  } catch (error) {
    console.error("Error verifying payment:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Payment verification failed",
        code: "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}
