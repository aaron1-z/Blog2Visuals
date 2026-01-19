import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const MAX_CONTENT_LENGTH = 4000;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format. Please provide a valid HTTP/HTTPS URL." },
        { status: 400 }
      );
    }

    // Fetch HTML from the URL
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script").remove();
    $("style").remove();
    $("nav").remove();
    $("footer").remove();
    $("header").remove();
    $("aside").remove();
    $("iframe").remove();
    $("noscript").remove();
    $("svg").remove();
    $("form").remove();
    $("[role='navigation']").remove();
    $("[role='banner']").remove();
    $("[role='contentinfo']").remove();
    $(".nav, .navbar, .navigation").remove();
    $(".footer, .site-footer").remove();
    $(".header, .site-header").remove();
    $(".sidebar, .side-bar").remove();
    $(".comments, .comment-section").remove();
    $(".advertisement, .ad, .ads").remove();
    $(".social-share, .share-buttons").remove();
    $(".related-posts, .recommended").remove();

    // Try to find main article content using common selectors
    const articleSelectors = [
      "article",
      "[role='main']",
      "main",
      ".post-content",
      ".article-content",
      ".entry-content",
      ".content",
      ".post-body",
      ".article-body",
      ".blog-post",
      ".post",
      "#content",
      "#main-content",
    ];

    let content = "";

    // Try each selector to find the best content
    for (const selector of articleSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > content.length) {
          content = text;
        }
      }
    }

    // Fallback to body if no article content found
    if (!content || content.length < 100) {
      content = $("body").text().trim();
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, "\n\n") // Normalize line breaks
      .trim();

    // Limit content length
    if (content.length > MAX_CONTENT_LENGTH) {
      // Try to cut at a sentence boundary
      const truncated = content.substring(0, MAX_CONTENT_LENGTH);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf("."),
        truncated.lastIndexOf("!"),
        truncated.lastIndexOf("?")
      );
      
      if (lastSentenceEnd > MAX_CONTENT_LENGTH * 0.8) {
        content = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        // Cut at last word boundary
        const lastSpace = truncated.lastIndexOf(" ");
        content = truncated.substring(0, lastSpace) + "...";
      }
    }

    // Check if we got meaningful content
    if (!content || content.length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful content from the URL" },
        { status: 422 }
      );
    }

    return NextResponse.json({ content });

  } catch (error) {
    console.error("Scrape error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return NextResponse.json(
          { error: "Request timed out. The URL took too long to respond." },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: `Failed to scrape URL: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
