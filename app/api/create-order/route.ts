import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";

// Ensure this route uses the Node.js runtime (required for Razorpay + crypto)
export const runtime = "nodejs";

// Generate a random receipt ID
function generateReceiptId(): string {
  return `rcpt_${crypto.randomBytes(8).toString("hex")}_${Date.now()}`;
}

// Pricing configuration for different currencies
const PRICING = {
  INR: {
    proPack: 19900, // ₹199 in paise
    business: 99900, // ₹999 in paise
  },
  USD: {
    proPack: 299, // $2.99 in cents
    business: 1299, // $12.99 in cents
  },
};

type SupportedCurrency = "INR" | "USD";
type ProductType = "proPack" | "business";

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

    // Initialize Razorpay INSIDE the handler to avoid build-time issues
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Parse request body
    let userId: string | null = null;
    let currency: SupportedCurrency = "INR";
    let product: ProductType = "proPack";
    
    try {
      const body = await request.json();
      userId = body.user_id || null;
      
      // Validate and set currency
      if (body.currency === "USD" || body.currency === "INR") {
        currency = body.currency;
      }
      
      // Validate and set product type
      if (body.product === "business") {
        product = "business";
      }
    } catch {
      // Body is optional, continue with defaults
    }

    // Get amount based on currency and product
    const amount = PRICING[currency][product];
    const credits = product === "proPack" ? "10" : "50";
    const productName = product === "proPack" 
      ? "Pro Pack - 10 Exports" 
      : "Business Pack - 50 Exports";

    // Create Razorpay order with timeout
    const options = {
      amount: amount,
      currency: currency,
      receipt: generateReceiptId(),
      notes: {
        credits: credits,
        user_id: userId || "anonymous",
        product: productName,
      },
    };

    // Add timeout to Razorpay API call (45 seconds)
    const orderPromise = razorpay.orders.create(options);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Razorpay API timeout")), 45000);
    });

    const order = (await Promise.race([orderPromise, timeoutPromise])) as {
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
      if (error.message.toLowerCase().includes("timeout")) {
        return NextResponse.json(
          { error: "Payment service is slow. Please try again in a moment." },
          { status: 504 }
        );
      }

      // Check for authentication errors
      if (
        error.message.toLowerCase().includes("authentication") ||
        error.message.includes("401")
      ) {
        return NextResponse.json(
          { error: "Payment authentication failed. Please contact support." },
          { status: 401 }
        );
      }

      // Check for network errors
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND")
      ) {
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
