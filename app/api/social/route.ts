import { NextRequest, NextResponse } from "next/server";

const HUGGINGFACE_API_URL =
  "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";

const TIMEOUT_MS = 90000; // 90 seconds timeout

async function generateText(
  prompt: string,
  apiKey: string,
  maxTokens: number = 150
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 503) {
      const data = await response.json();
      throw new Error(`Model loading: ${data.estimated_time || 20}s`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text.trim();
    }

    throw new Error("Unexpected response format");
  } finally {
    clearTimeout(timeoutId);
  }
}

function cleanTwitterPost(text: string): string {
  // Extract just the tweet content, remove any extra formatting
  let cleaned = text
    .replace(/^(Tweet:|Twitter:|Here's|Here is|Post:)/i, "")
    .replace(/\n+/g, " ")
    .trim();

  // Remove quotes if present
  if (cleaned.startsWith('"') && cleaned.includes('"')) {
    cleaned = cleaned.replace(/^"/, "").replace(/".*$/, "");
  }

  // Ensure max 280 characters
  if (cleaned.length > 280) {
    cleaned = cleaned.substring(0, 277) + "...";
  }

  return cleaned;
}

function cleanLinkedInPost(text: string): string {
  // Extract the LinkedIn post content
  let cleaned = text
    .replace(/^(LinkedIn:|Post:|Here's|Here is)/i, "")
    .trim();

  // Remove quotes if present at start
  if (cleaned.startsWith('"')) {
    cleaned = cleaned.substring(1);
  }

  // Clean up any trailing incomplete sentences
  const lastPunctuation = Math.max(
    cleaned.lastIndexOf("."),
    cleaned.lastIndexOf("!"),
    cleaned.lastIndexOf("?")
  );

  if (lastPunctuation > cleaned.length * 0.7) {
    cleaned = cleaned.substring(0, lastPunctuation + 1);
  }

  return cleaned;
}

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

    const body = await request.json();
    const { summary } = body;

    if (!summary || typeof summary !== "string") {
      return NextResponse.json(
        { error: "Summary is required" },
        { status: 400 }
      );
    }

    if (summary.trim().length < 20) {
      return NextResponse.json(
        { error: "Summary is too short" },
        { status: 400 }
      );
    }

    // Generate Twitter post
    const twitterPrompt = `<s>[INST] You are a social media expert. Create a viral Twitter/X post based on this summary. The post must be under 280 characters, engaging, and include 1-2 relevant hashtags. Summary: "${summary.substring(0, 500)}" [/INST]`;

    // Generate LinkedIn post
    const linkedinPrompt = `<s>[INST] You are a professional content writer. Create a LinkedIn post based on this summary. Use a professional yet engaging tone. Include a hook, key insights, and a call to action. Add relevant hashtags at the end. Summary: "${summary.substring(0, 500)}" [/INST]`;

    let twitter: string;
    let linkedin: string;

    try {
      // Try to generate both posts in parallel
      const [twitterResult, linkedinResult] = await Promise.allSettled([
        generateText(twitterPrompt, apiKey, 100),
        generateText(linkedinPrompt, apiKey, 300),
      ]);

      if (twitterResult.status === "fulfilled") {
        twitter = cleanTwitterPost(twitterResult.value);
      } else {
        // Fallback: Create a simple Twitter post from the summary
        twitter = createFallbackTwitter(summary);
      }

      if (linkedinResult.status === "fulfilled") {
        linkedin = cleanLinkedInPost(linkedinResult.value);
      } else {
        // Fallback: Create a simple LinkedIn post from the summary
        linkedin = createFallbackLinkedIn(summary);
      }
    } catch (genError) {
      // If generation fails, use fallbacks
      console.error("Generation error:", genError);
      twitter = createFallbackTwitter(summary);
      linkedin = createFallbackLinkedIn(summary);
    }

    return NextResponse.json({ twitter, linkedin });

  } catch (error) {
    console.error("Social post generation error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // If model is loading, return fallback content
      if (error.message.includes("Model loading")) {
        const body = await request.clone().json().catch(() => ({ summary: "" }));
        const summary = body.summary || "";
        return NextResponse.json({
          twitter: createFallbackTwitter(summary),
          linkedin: createFallbackLinkedIn(summary),
        });
      }

      return NextResponse.json(
        { error: `Failed to generate posts: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

function createFallbackTwitter(summary: string): string {
  // Create a simple engaging tweet from the summary
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
  let tweet = sentences[0]?.trim() || summary.substring(0, 200);
  
  // Add engaging prefix
  const prefixes = ["💡", "🚀", "✨", "📌", "🔥"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  
  tweet = `${prefix} ${tweet}`;
  
  // Add hashtag
  tweet += " #insights #knowledge";
  
  // Ensure max 280 chars
  if (tweet.length > 280) {
    tweet = tweet.substring(0, 277) + "...";
  }
  
  return tweet;
}

function createFallbackLinkedIn(summary: string): string {
  // Create a professional LinkedIn post
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  let post = "🎯 Key Insights Worth Sharing\n\n";
  
  // Add main points
  const points = sentences.slice(0, 3);
  points.forEach((point, i) => {
    post += `${i + 1}. ${point.trim()}.\n`;
  });
  
  post += "\n💭 What are your thoughts on this?\n\n";
  post += "#ProfessionalDevelopment #Insights #Learning";
  
  return post;
}
