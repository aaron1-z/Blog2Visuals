import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// Generate a random receipt ID
function generateReceiptId(): string {
  return `rcpt_${crypto.randomBytes(8).toString("hex")}_${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    // Validate Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials not configured");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    // Parse request body (optional: can include user_id for tracking)
    let userId: string | null = null;
    try {
      const body = await request.json();
      userId = body.user_id || null;
    } catch {
      // Body is optional, continue without it
    }

    // Create Razorpay order with timeout
    const options = {
      amount: 19900, // Amount in paise (₹199)
      currency: "INR",
      receipt: generateReceiptId(),
      notes: {
        credits: "10",
        user_id: userId || "anonymous",
        product: "Pro Pack - 10 Exports",
      },
    };

    // Add timeout to Razorpay API call (45 seconds)
    const orderPromise = razorpay.orders.create(options);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Razorpay API timeout")), 45000);
    });

    const order = await Promise.race([orderPromise, timeoutPromise]) as {
      id: string;
      amount: number;
      currency: string;
      receipt: string;
    };

    if (!order || !order.id) {
      throw new Error("Failed to create Razorpay order");
    }

    // Return order details to frontend
    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: process.env.RAZORPAY_KEY_ID, // Send key_id to frontend (not secret!)
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);

    // Handle specific errors
    if (error instanceof Error) {
      // Check for timeout
      if (error.message.includes("timeout") || error.message.includes("Timeout")) {
        return NextResponse.json(
          { error: "Payment service is slow. Please try again in a moment." },
          { status: 504 }
        );
      }

      // Check for authentication errors
      if (error.message.includes("authentication") || error.message.includes("401")) {
        return NextResponse.json(
          { error: "Payment authentication failed. Please contact support." },
          { status: 401 }
        );
      }

      // Check for network errors
      if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
        return NextResponse.json(
          { error: "Cannot connect to payment service. Please try again later." },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to create payment order" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const isConfigured = !!(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );

  return NextResponse.json({
    status: isConfigured ? "configured" : "not_configured",
    message: isConfigured
      ? "Razorpay is ready"
      : "Razorpay credentials not set in environment variables",
  });
}
