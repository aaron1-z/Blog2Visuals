import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Target email - stored server-side, never exposed to client
const TARGET_EMAIL = "adityakittu2773@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Log the contact submission (for now)
    console.log("=== New Contact Form Submission ===");
    console.log(`From: ${name} <${email}>`);
    console.log(`To: ${TARGET_EMAIL}`);
    console.log(`Message: ${message}`);
    console.log("===================================");

    // Option 1: Use Resend (if RESEND_API_KEY is set)
    if (process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Blog2Visuals <onboarding@resend.dev>",
            to: TARGET_EMAIL,
            subject: `Contact Form: Message from ${name}`,
            html: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <p>${message.replace(/\n/g, "<br>")}</p>
            `,
            reply_to: email,
          }),
        });

        if (resendResponse.ok) {
          return NextResponse.json({ success: true, method: "resend" });
        }
      } catch (emailError) {
        console.error("Resend error:", emailError);
      }
    }

    // Option 2: Use Web3Forms (free, no API key needed for basic use)
    // You can set up a free account at web3forms.com and add WEB3FORMS_KEY
    if (process.env.WEB3FORMS_KEY) {
      try {
        const web3Response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_key: process.env.WEB3FORMS_KEY,
            name,
            email,
            message,
            subject: `Blog2Visuals Contact: ${name}`,
          }),
        });

        if (web3Response.ok) {
          return NextResponse.json({ success: true, method: "web3forms" });
        }
      } catch (web3Error) {
        console.error("Web3Forms error:", web3Error);
      }
    }

    // Fallback: Just log and return success
    // In production, you should set up one of the email services above
    return NextResponse.json({ 
      success: true, 
      method: "logged",
      note: "Message logged. Set RESEND_API_KEY or WEB3FORMS_KEY for email delivery."
    });

  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to process contact form" },
      { status: 500 }
    );
  }
}
