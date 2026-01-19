import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const HUGGINGFACE_API_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn";

const TIMEOUT_MS = 60000; // 60 seconds timeout (model may need to warm up)
const MAX_INPUT_LENGTH = 4000; // BART has token limits

export async function POST(request: NextRequest) {
  try {
    // Check for API key (supports both HF_TOKEN and HUGGINGFACE_API_KEY)
    const apiKey = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "HuggingFace API key not configured. Set HF_TOKEN in environment." },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.trim().length < 50) {
      return NextResponse.json(
        { error: "Content is too short to summarize (minimum 50 characters)" },
        { status: 400 }
      );
    }

    // Truncate content if too long
    const truncatedContent = content.substring(0, MAX_INPUT_LENGTH);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Call HuggingFace API
      const response = await fetch(HUGGINGFACE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: truncatedContent,
          parameters: {
            max_length: 200, // Increased for more complete summaries
            min_length: 50, // Increased minimum length
            do_sample: false,
            num_beams: 4, // Better quality
            early_stopping: true,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle model loading state (HuggingFace returns 503 when model is loading)
      if (response.status === 503) {
        const data = await response.json();
        const estimatedTime = data.estimated_time || 20;
        return NextResponse.json(
          {
            error: "Model is loading",
            estimated_time: estimatedTime,
            retry: true,
          },
          { status: 503 }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("HuggingFace API error:", response.status, errorData);

        if (response.status === 401) {
          return NextResponse.json(
            { error: "Invalid HuggingFace API key" },
            { status: 401 }
          );
        }

        if (response.status === 429) {
          return NextResponse.json(
            { error: "Rate limit exceeded. Please try again later." },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error:
              errorData.error ||
              `HuggingFace API error: ${response.status}`,
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      // HuggingFace returns an array with summary_text
      let summary: string;
      if (Array.isArray(data) && data[0]?.summary_text) {
        summary = data[0].summary_text;
      } else if (typeof data === "string") {
        summary = data;
      } else if (data.summary_text) {
        summary = data.summary_text;
      } else {
        console.error("Unexpected response format:", data);
        return NextResponse.json(
          { error: "Unexpected response format from HuggingFace" },
          { status: 500 }
        );
      }

      return NextResponse.json({ summary });

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          return NextResponse.json(
            { error: "Request timed out. The model may be loading, please try again." },
            { status: 504 }
          );
        }
      }
      throw fetchError;
    }

  } catch (error) {
    console.error("Summarize error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to summarize: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
