"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";
import Link from "next/link";
import InfographicPreview from "./components/InfographicPreview";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { detectCurrency, getPriceConfig, toggleCurrency, type Currency, type PriceConfig } from "@/lib/currency";

// Declare Razorpay type for TypeScript
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  image?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: { error: { description: string; code: string; reason: string } }) => void) => void;
}

type Step = "input" | "extracting" | "summarizing" | "summarized" | "generating" | "result";
type Theme = "sunset" | "ocean" | "forest" | "purple" | "midnight";

const FREE_DOWNLOAD_LIMIT = 1;
const PRO_DOWNLOAD_CREDITS = 10;
const STORAGE_KEY = "blog2visuals_downloads";
const CREDITS_KEY = "blog2visuals_credits";
const SESSION_LINK_KEY = "blog2visuals_session_link_processed";
const SESSION_FIRST_GENERATION_KEY = "blog2visuals_session_first_generation";
const POST_LOGIN_FREE_USED_KEY = "blog2visuals_post_login_free_used";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [blogUrl, setBlogUrl] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>("sunset");
  const [isExporting, setIsExporting] = useState(false);
  const [twitterCaption, setTwitterCaption] = useState("");
  const [linkedinCaption, setLinkedinCaption] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloadCount, setDownloadCount] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [priceConfig, setPriceConfig] = useState<PriceConfig>(getPriceConfig("INR"));
  const [hasProcessedLink, setHasProcessedLink] = useState(false);
  const [hasGeneratedFirstInfographic, setHasGeneratedFirstInfographic] = useState(false);
  const [hasUsedPostLoginFree, setHasUsedPostLoginFree] = useState(false);
  const infographicRef = useRef<HTMLDivElement>(null);
  const blogUrlInputRef = useRef<HTMLInputElement>(null);
  const trySectionRef = useRef<HTMLDivElement>(null);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Load download count and credits from localStorage on mount
  useEffect(() => {
    const storedCount = localStorage.getItem(STORAGE_KEY);
    if (storedCount) {
      const count = parseInt(storedCount, 10);
      if (!isNaN(count)) {
        setDownloadCount(count);
      }
    }
    
    const storedCredits = localStorage.getItem(CREDITS_KEY);
    if (storedCredits) {
      const credits = parseInt(storedCredits, 10);
      if (!isNaN(credits)) {
        setPaidCredits(credits);
      }
    }
  }, []);

  // Detect currency on mount
  useEffect(() => {
    const detectedCurrency = detectCurrency();
    setCurrency(detectedCurrency);
    setPriceConfig(getPriceConfig(detectedCurrency));
  }, []);

  // Load session state on mount
  useEffect(() => {
    const linkProcessed = sessionStorage.getItem(SESSION_LINK_KEY) === "true";
    const firstGenerationDone = sessionStorage.getItem(SESSION_FIRST_GENERATION_KEY) === "true";
    const postLoginFreeUsed = localStorage.getItem(POST_LOGIN_FREE_USED_KEY) === "true";

    setHasProcessedLink(linkProcessed);
    setHasGeneratedFirstInfographic(firstGenerationDone);
    setHasUsedPostLoginFree(postLoginFreeUsed);
  }, []);

  // Deep-link support: /?try=1#try scrolls to input and focuses it
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const wantsTry = params.get("try") === "1";
    const hasTryHash = window.location.hash === "#try";

    if (!wantsTry && !hasTryHash) return;

    // Wait a tick for layout
    const t = window.setTimeout(() => {
      trySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      blogUrlInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(t);
  }, []);

  // Calculate limits based on authentication status and credits
  let totalAllowedDownloads: number;
  let hasReachedLimit: boolean;
  let remainingDownloads: number;

  if (isAuthenticated) {
    // Authenticated users: start with 1 free download after login, then must buy credits
    const postLoginFreeAvailable = !hasUsedPostLoginFree;
    totalAllowedDownloads = postLoginFreeAvailable ? 1 : paidCredits;
    hasReachedLimit = downloadCount >= totalAllowedDownloads;
    remainingDownloads = Math.max(0, totalAllowedDownloads - downloadCount);
  } else {
    // Non-authenticated users: use the old free limit system
    totalAllowedDownloads = FREE_DOWNLOAD_LIMIT + paidCredits;
    hasReachedLimit = downloadCount >= totalAllowedDownloads;
    remainingDownloads = Math.max(0, totalAllowedDownloads - downloadCount);
  }

  // Handle currency toggle
  const handleCurrencyToggle = () => {
    const newCurrency = toggleCurrency(currency);
    setCurrency(newCurrency);
    setPriceConfig(getPriceConfig(newCurrency));
  };

  // Helper function to get auth headers for secure API calls
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    } catch (err) {
      console.error("Error getting auth session:", err);
    }

    return headers;
  }, []);

  // Handle Razorpay payment with order creation
  const handlePayment = async () => {
    // Edge case: Razorpay script not loaded
    if (typeof window.Razorpay === "undefined") {
      setError("Payment system is loading. Please wait a moment and try again.");
      return;
    }

    // Prevent double-click
    if (isProcessingPayment) {
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
      // Step 1: Create order on backend with timeout and retry
      const createOrder = async (attempt: number = 1): Promise<{ order_id: string; key_id: string; amount: number; currency: string }> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (increased)

        try {
          const response = await fetch("/api/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              user_id: user?.id || null,
              currency: currency, // Pass detected currency
              product: "proPack",
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const data = await response.json();

          if (!response.ok || !data.order_id) {
            throw new Error(data.error || "Failed to create payment order");
          }

          return data;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          // Retry on timeout or network error (max 2 retries)
          if (attempt < 3) {
            const isTimeout = fetchError instanceof Error && fetchError.name === "AbortError";
            const isNetworkError = fetchError instanceof Error && (
              fetchError.message.includes("fetch") || 
              fetchError.message.includes("network") ||
              fetchError.name === "TypeError"
            );
            
            if (isTimeout || isNetworkError) {
              console.log(`Order creation attempt ${attempt} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
              return createOrder(attempt + 1);
            }
          }
          
          // Final error
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            throw new Error("Request timed out. The payment service may be slow. Please try again.");
          }
          throw new Error("Network error. Please check your internet connection and try again.");
        }
      };

      const orderData = await createOrder();

      // Step 2: Open Razorpay checkout with order_id
      const options: RazorpayOptions = {
        key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY || "",
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name: "Blog2Visuals",
        description: `Pro Pack - 10 Exports (${priceConfig.proPackDisplay})`,
        order_id: orderData.order_id,
        handler: async function (response: RazorpayResponse) {
          // Razorpay modal closes automatically after this handler runs
          
          // Step 3: Verify payment on backend with retry logic
          let verifyAttempts = 0;
          const maxAttempts = 3;
          
          const verifyPayment = async (): Promise<void> => {
            verifyAttempts++;
            
            try {
              // Get auth headers for secure API call
              const { data: { session } } = await supabase.auth.getSession();
              const verifyHeaders: Record<string, string> = {
                "Content-Type": "application/json",
              };
              if (session?.access_token) {
                verifyHeaders["Authorization"] = `Bearer ${session.access_token}`;
              }
              
              const verifyController = new AbortController();
              const verifyTimeoutId = setTimeout(() => verifyController.abort(), 30000);

              const verifyResponse = await fetch("/api/verify-payment", {
                method: "POST",
                headers: verifyHeaders,
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  user_id: user?.id || null,
                }),
                signal: verifyController.signal,
              });
              
              clearTimeout(verifyTimeoutId);
              const verifyData = await verifyResponse.json();

              if (verifyResponse.ok && verifyData.success) {
                // Handle duplicate verification (prevent double crediting shown to user)
                if (verifyData.duplicate) {
                  // Already verified - just update UI with current credits
                  setPaidCredits(verifyData.total_credits);
                  localStorage.setItem(CREDITS_KEY, verifyData.total_credits.toString());
                  
                  setPaymentSuccess(true);
                  setPaymentMessage("Payment already verified. Your credits are up to date.");
                  setTimeout(() => {
                    setPaymentSuccess(false);
                    setPaymentMessage("");
                  }, 5000);
                } else {
                  // Fresh verification - update credits
                  const newTotalCredits = verifyData.total_credits || (paidCredits + PRO_DOWNLOAD_CREDITS);
                  setPaidCredits(newTotalCredits);
                  localStorage.setItem(CREDITS_KEY, newTotalCredits.toString());

                  setPaymentSuccess(true);
                  setPaymentMessage(`Payment successful — ${verifyData.credits_added || PRO_DOWNLOAD_CREDITS} credits added!`);
                  setTimeout(() => {
                    setPaymentSuccess(false);
                    setPaymentMessage("");
                  }, 5000);
                }
              } else {
                // Edge case: Payment failed on backend
                const errorCode = verifyData.code;
                let errorMessage = verifyData.error || "Payment verification failed";
                
                switch (errorCode) {
                  case "INVALID_SIGNATURE":
                    errorMessage = "Payment verification failed. If amount was deducted, please contact support.";
                    break;
                  case "PROFILE_ERROR":
                    errorMessage = "Could not update your account. Please contact support with your payment ID.";
                    break;
                  case "CREDIT_UPDATE_ERROR":
                    errorMessage = "Payment received but credits not added. Please contact support.";
                    break;
                  case "REPLAY_ATTACK":
                    errorMessage = "Security error: This order has already been processed. Please contact support if this is unexpected.";
                    break;
                  case "USER_MISMATCH":
                    errorMessage = "Security error: Session mismatch detected. Please login again and try.";
                    break;
                  default:
                    errorMessage = verifyData.error || "Verification failed. Please contact support.";
                }
                
                setError(errorMessage);
              }
            } catch (verifyError) {
              // Edge case: Network error during verification - retry
              if (verifyAttempts < maxAttempts) {
                console.log(`Verification attempt ${verifyAttempts} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                return verifyPayment();
              }
              
              console.error("Verification error after retries:", verifyError);
              setError(
                "Payment may have succeeded but verification failed due to network issues. " +
                "Please check your payment history or contact support. Payment ID: " + 
                response.razorpay_payment_id
              );
            }
          };

          await verifyPayment();
          setIsProcessingPayment(false);
        },
        prefill: {
          name: "",
          email: user?.email || "",
          contact: "",
        },
        theme: {
          color: "#f97316",
        },
        modal: {
          // Edge case: Payment popup closed by user
          ondismiss: function () {
            setIsProcessingPayment(false);
            // Show a subtle message that payment was cancelled
            setError("Payment cancelled. You can try again when ready.");
            // Auto-clear the message after 3 seconds
            setTimeout(() => setError(null), 3000);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      
      // Edge case: Razorpay fails to open
      razorpay.on("payment.failed", function (response: { error: { description: string; code: string; reason: string } }) {
        console.error("Payment failed:", response.error);
        setIsProcessingPayment(false);
        
        // Show appropriate error message based on failure reason
        let errorMessage = "Payment failed. ";
        switch (response.error.reason) {
          case "payment_cancelled":
            errorMessage = "Payment was cancelled.";
            break;
          case "payment_failed":
            errorMessage += response.error.description || "Please try again or use a different payment method.";
            break;
          default:
            errorMessage += response.error.description || "Please try again.";
        }
        setError(errorMessage);
      });
      
      razorpay.open();
    } catch (err) {
      console.error("Payment error:", err);
      // Edge case: General errors
      let errorMessage = "Failed to initiate payment. ";
      if (err instanceof Error) {
        if (err.message.includes("Network") || err.message.includes("internet")) {
          errorMessage = err.message;
        } else if (err.message.includes("timeout")) {
          errorMessage = err.message;
        } else {
          errorMessage += err.message;
        }
      } else {
        errorMessage += "Please try again.";
      }
      setError(errorMessage);
      setIsProcessingPayment(false);
    }
  };

  const handleGenerate = async () => {
    if (!blogUrl.trim()) return;

    // Check if user has already processed a link in this session
    if (hasProcessedLink && !isAuthenticated) {
      setError("You've already processed one link in this session. Please sign in to continue using the service.");
      return;
    }

    // Check if user has generated their first infographic and needs to login
    if (hasGeneratedFirstInfographic && !isAuthenticated) {
      setError("You've generated your first infographic! Please sign in to continue creating more.");
      return;
    }

    setError(null);
    setStep("extracting");
    setContent("");
    setSummary("");

    try {
      // Step 1: Scrape content from URL
      const scrapeResponse = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: blogUrl }),
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok) {
        throw new Error(scrapeData.error || "Failed to extract content");
      }

      // Store the extracted content
      setContent(scrapeData.content);
      setStep("summarizing");

      // Mark that user has processed a link in this session
      setHasProcessedLink(true);
      sessionStorage.setItem(SESSION_LINK_KEY, "true");

      // Step 2: Summarize the content
      const summarizeResponse = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: scrapeData.content }),
      });

      const summarizeData = await summarizeResponse.json();

      if (!summarizeResponse.ok) {
        // Handle model loading - retry after delay
        if (summarizeResponse.status === 503 && summarizeData.retry) {
          const waitTime = (summarizeData.estimated_time || 20) * 1000;
          await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 30000)));
          
          // Retry the request
          const retryResponse = await fetch("/api/summarize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: scrapeData.content }),
          });

          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            throw new Error(retryData.error || "Failed to summarize content");
          }
          
          setSummary(retryData.summary);
        } else {
          throw new Error(summarizeData.error || "Failed to summarize content");
        }
      } else {
        setSummary(summarizeData.summary);
      }

      // Move to summarized step - user can review and click Generate Infographic
      setStep("summarized");

    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setStep("input");
    }
  };

  const handleGenerateInfographic = async () => {
    // Check if authenticated user has used their free download and has no credits
    if (isAuthenticated && hasUsedPostLoginFree && paidCredits <= 0) {
      window.location.href = "/#pricing";
      return;
    }

    setStep("generating");
    setTwitterCaption("");
    setLinkedinCaption("");

    try {
      // Generate social captions in parallel with the "visual generation"
      const socialPromise = fetch("/api/social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ summary }),
      });

      // Simulate visual generation time
      const delayPromise = new Promise(resolve => setTimeout(resolve, 2000));

      // Wait for both
      const [socialResponse] = await Promise.all([socialPromise, delayPromise]);

      if (socialResponse.ok) {
        const socialData = await socialResponse.json();
        setTwitterCaption(socialData.twitter || "");
        setLinkedinCaption(socialData.linkedin || "");
      }
    } catch (err) {
      console.error("Error generating social captions:", err);
      // Continue anyway - captions are optional
    }

    setStep("result");

    // Mark that user has generated their first infographic in this session
    if (!hasGeneratedFirstInfographic) {
      setHasGeneratedFirstInfographic(true);
      sessionStorage.setItem(SESSION_FIRST_GENERATION_KEY, "true");
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setError("Failed to copy to clipboard. Please try selecting and copying manually.");
    }
  };

  // Social sharing functions
  const shareToTwitter = (caption: string) => {
    const encodedText = encodeURIComponent(caption);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, "_blank", "width=600,height=400,scrollbars=yes");
  };

  const shareToLinkedIn = (caption: string) => {
    const encodedText = encodeURIComponent(caption);
    // LinkedIn share URL (simplified - they'll add their own compose UI)
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodedText}`;
    window.open(linkedInUrl, "_blank", "width=600,height=600,scrollbars=yes");
  };

  const shareGeneric = async (platform: string) => {
    // Try Web Share API first (works on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this infographic!",
          text: twitterCaption || summary,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // User cancelled or not supported, fall through to platform-specific
      }
    }

    // Fallback to platform-specific sharing
    const text = twitterCaption || summary;
    switch (platform) {
      case "Twitter":
        shareToTwitter(text);
        break;
      case "LinkedIn":
        shareToLinkedIn(linkedinCaption || text);
        break;
      case "Instagram":
        // Instagram doesn't have a web share API - guide user
        handleCopyToClipboard(twitterCaption || summary, "instagram");
        setPaymentSuccess(true);
        setPaymentMessage("Caption copied! Open Instagram and paste when posting.");
        setTimeout(() => { setPaymentSuccess(false); setPaymentMessage(""); }, 4000);
        break;
      case "Pinterest":
        const pinterestUrl = `https://pinterest.com/pin/create/button/?description=${encodeURIComponent(text)}`;
        window.open(pinterestUrl, "_blank", "width=600,height=600,scrollbars=yes");
        break;
      default:
        handleCopyToClipboard(text, platform.toLowerCase());
    }
  };

  const handleDownloadPng = async () => {
    if (!infographicRef.current || hasReachedLimit) {
      // If limit reached and user is authenticated, redirect to pricing
      if (hasReachedLimit && isAuthenticated) {
        window.location.href = "/#pricing";
        return;
      }
      return;
    }

    setIsExporting(true);
    setError(null);

    // Track if credit was already deducted (to avoid double deduction on retry)
    let creditDeducted = false;

    try {
      // Step 1: Deduct credit FIRST (before export) - strict enforcement
      if (user?.id) {
        const authHeaders = await getAuthHeaders();
        
        // Add timeout for credit deduction API
        const deductController = new AbortController();
        const deductTimeout = setTimeout(() => deductController.abort(), 15000);
        
        try {
          const deductResponse = await fetch("/api/deduct-credit", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ user_id: user.id }),
            signal: deductController.signal,
          });
          clearTimeout(deductTimeout);

          const deductData = await deductResponse.json();

          if (!deductResponse.ok || !deductData.success) {
            if (deductResponse.status === 401 || deductResponse.status === 403) {
              setError("Session expired. Please login again.");
              setIsExporting(false);
              return;
            }
            if (deductData.error === "Insufficient credits") {
              setError("No credits remaining. Please purchase more credits.");
              setIsExporting(false);
              return;
            }
            throw new Error(deductData.error || "Failed to deduct credit");
          }

          // Mark credit as deducted
          creditDeducted = true;

          // Update UI immediately
          setPaidCredits(deductData.credits);
          localStorage.setItem(CREDITS_KEY, deductData.credits.toString());
        } catch (deductErr) {
          clearTimeout(deductTimeout);
          if (deductErr instanceof Error && deductErr.name === "AbortError") {
            throw new Error("Credit verification timed out. Please check your connection and try again.");
          }
          throw deductErr;
        }
      } else {
        // For authenticated users: handle post-login free download
        if (isAuthenticated) {
          if (!hasUsedPostLoginFree) {
            // Using their post-login free download
            setHasUsedPostLoginFree(true);
            localStorage.setItem(POST_LOGIN_FREE_USED_KEY, "true");
            creditDeducted = true;
          } else if (paidCredits <= 0) {
            // No credits left, redirect to pricing
            window.location.href = "/#pricing";
            setIsExporting(false);
            return;
          }
        } else {
          // For non-authenticated users, check localStorage limit
          if (downloadCount >= FREE_DOWNLOAD_LIMIT) {
            setError("Free limit reached. Please sign up to get more credits.");
            setIsExporting(false);
            return;
          }
          creditDeducted = true; // Mark as used for local tracking
        }
      }

      // Step 2: Get the export-ready infographic element (hidden 1080x1080 version)
      const exportContainer = infographicRef.current;
      const element = exportContainer.querySelector(".infographic-export") as HTMLElement;
      if (!element) {
        throw new Error("Export element not found");
      }

      // Step 3: Generate PNG at 1080x1080 with high quality
      const exportPromise = toPng(element, {
        quality: 1.0,
        pixelRatio: 1, // Already at 1080x1080, no need to scale
        cacheBust: true,
        width: 1080,
        height: 1080,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
      });

      // Add timeout to prevent hanging (increased to 45 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Export timed out")), 45000);
      });

      const dataUrl = await Promise.race([exportPromise, timeoutPromise]);

      // Step 4: Create and trigger download
      const link = document.createElement("a");
      link.download = `blog2visuals-infographic-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Step 5: Update local tracking (only for non-authenticated users)
      if (!user?.id && creditDeducted) {
        const newCount = downloadCount + 1;
        setDownloadCount(newCount);
        localStorage.setItem(STORAGE_KEY, newCount.toString());
      }

      // Show success toast briefly
      setPaymentSuccess(true);
      setPaymentMessage("Infographic downloaded successfully!");
      setTimeout(() => {
        setPaymentSuccess(false);
        setPaymentMessage("");
      }, 3000);

    } catch (err) {
      console.error("Error exporting image:", err);
      
      // Better error messages
      if (err instanceof Error) {
        if (err.message.includes("timed out")) {
          setError("Export is taking too long. Please try again or use a faster connection.");
        } else if (err.message.includes("credit")) {
          setError(err.message);
        } else if (err.message.includes("network") || err.message.includes("fetch")) {
          setError("Network error. Please check your connection and try again.");
        } else {
          setError("Failed to export image. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please refresh and try again.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setBlogUrl("");
    setContent("");
    setSummary("");
    setTwitterCaption("");
    setLinkedinCaption("");
    setStep("input");
    setError(null);
  };

  const isLoading = step === "extracting" || step === "summarizing" || step === "generating";
  const showResult = step === "result";
  const showSummary = step === "summarized";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Global Toast Notification */}
      {paymentSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-xl shadow-2xl shadow-emerald-500/25">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {paymentMessage.includes("downloaded") || paymentMessage.includes("Downloaded") ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              ) : paymentMessage.includes("copied") || paymentMessage.includes("Copied") ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-semibold">{paymentMessage || "Success!"}</p>
              {paymentMessage.includes("Credits") && (
                <p className="text-sm text-emerald-100">You now have {totalAllowedDownloads} downloads available</p>
              )}
            </div>
            <button 
              onClick={() => { setPaymentSuccess(false); setPaymentMessage(""); }}
              className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Background layers */}
      <div className="fixed inset-0 bg-[#0c0a09]" />
      <div className="fixed inset-0 grid-pattern" />
      <div className="fixed inset-0 noise-overlay" />
      
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/20 via-orange-600/5 to-transparent blur-3xl animate-float" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="relative z-10">
        {/* Header */}
        <header className="animate-fade-up">
          <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {/* Logo mark */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                Blog<span className="text-orange-500">2</span>Visuals
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-stone-400 hover:text-white transition-colors cursor-pointer">Features</a>
              <a href="#pricing" className="text-sm text-stone-400 hover:text-white transition-colors cursor-pointer">Pricing</a>
              <a href="#examples" className="text-sm text-stone-400 hover:text-white transition-colors cursor-pointer">Examples</a>
            </div>

            <Link 
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="px-5 py-2.5 text-sm font-medium rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              {isAuthenticated ? "Dashboard" : "Sign In"}
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-20">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-up-delay-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-sm text-orange-400 font-medium">AI-Powered Visual Generation</span>
            </div>
          </div>

          {/* Title */}
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-center leading-[1.1] tracking-tight max-w-4xl mx-auto animate-fade-up-delay-2"
            style={{ fontFamily: 'var(--font-syne), sans-serif' }}
          >
            Turn Blogs Into{" "}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent animate-gradient">
              Viral Infographics
            </span>{" "}
            Instantly
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg md:text-xl text-stone-400 text-center max-w-2xl mx-auto leading-relaxed animate-fade-up-delay-3">
            Paste any blog URL and generate social-ready visuals using AI. 
            Perfect for Twitter, LinkedIn, Instagram & more.
          </p>

          {/* Input Section */}
          <div id="try" ref={trySectionRef} className="mt-12 max-w-2xl mx-auto animate-fade-up-delay-4">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/50 via-amber-500/50 to-orange-500/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 group-focus-within:opacity-75 transition-all duration-500" />
              
              {/* Input container */}
              <div className="relative flex flex-col sm:flex-row gap-3 p-2 bg-[#1c1917] rounded-2xl border border-stone-800 group-hover:border-stone-700 group-focus-within:border-orange-500/50 transition-all duration-300">
                <div className="flex-1 flex items-center gap-3 px-4">
                  <svg className="w-5 h-5 text-stone-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <input
                    ref={blogUrlInputRef}
                    type="url"
                    value={blogUrl}
                    onChange={(e) => setBlogUrl(e.target.value)}
                    placeholder={
                      hasProcessedLink && !isAuthenticated
                        ? "Sign in to process another link..."
                        : "Paste your blog URL here..."
                    }
                    className="flex-1 bg-transparent text-white placeholder-stone-500 outline-none py-3 text-base"
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerate()}
                    disabled={isLoading || showSummary || showResult || (hasProcessedLink && !isAuthenticated)}
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !blogUrl.trim() || showSummary || showResult || (hasProcessedLink && !isAuthenticated)}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 font-semibold rounded-xl transition-all duration-300 shadow-lg disabled:shadow-none ${
                    hasProcessedLink && !isAuthenticated
                      ? "bg-stone-700 text-stone-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-orange-500/25 hover:shadow-orange-500/40"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>
                        {step === "extracting" && "Extracting..."}
                        {step === "summarizing" && "Summarizing..."}
                        {step === "generating" && "Generating..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Generate Visual</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-fade-up">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-red-400 font-medium">Error</p>
                  <p className="text-red-400/80 text-sm mt-1">{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Quick suggestions or sign-in prompt */}
            {step === "input" && !error && (
              <>
                {hasProcessedLink && !isAuthenticated ? (
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                    <div className="text-center">
                      <p className="text-orange-400 font-semibold mb-2">Ready for more infographics?</p>
                      <p className="text-stone-300 text-sm mb-4">Sign in to process unlimited links and create amazing visuals!</p>
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign In to Continue
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
                    <span className="text-stone-500">Try:</span>
                    {['medium.com', 'dev.to', 'hashnode.com'].map((site) => (
                      <button
                        key={site}
                        onClick={() => setBlogUrl(`https://${site}/example-article`)}
                        className="px-3 py-1 rounded-lg bg-white/5 text-stone-400 hover:text-white hover:bg-white/10 transition-all"
                        disabled={hasProcessedLink && !isAuthenticated}
                      >
                        {site}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Extracting State */}
          {step === "extracting" && (
            <div className="mt-16 max-w-3xl mx-auto">
              <div className="relative p-8 rounded-2xl bg-[#1c1917]/80 border border-stone-800 backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-stone-800 shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded-lg bg-stone-800 shimmer" />
                      <div className="h-3 w-1/2 rounded-lg bg-stone-800 shimmer" />
                    </div>
                  </div>
                  
                  <div className="aspect-video rounded-xl bg-stone-800 shimmer flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-700/50 mb-4">
                        <svg className="w-8 h-8 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <p className="text-stone-400 text-sm">Extracting content from URL...</p>
                      <p className="text-stone-500 text-xs mt-1">This may take a few seconds</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800 rounded-b-2xl overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '30%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Summarizing State */}
          {step === "summarizing" && (
            <div className="mt-16 max-w-3xl mx-auto">
              <div className="relative p-8 rounded-2xl bg-[#1c1917]/80 border border-stone-800 backdrop-blur-sm">
                <div className="space-y-6">
                  {/* Extraction complete indicator */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">Content extracted</p>
                      <p className="text-stone-500 text-sm">{content.length.toLocaleString()} characters</p>
                    </div>
                  </div>
                  
                  <div className="aspect-video rounded-xl bg-stone-800 shimmer flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-700/50 mb-4">
                        <svg className="w-8 h-8 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                        </svg>
                      </div>
                      <p className="text-stone-400 text-sm">AI is summarizing your content...</p>
                      <p className="text-stone-500 text-xs mt-1">Extracting key points</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800 rounded-b-2xl overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Summary Preview - User can review and click Generate Infographic */}
          {showSummary && (
            <div className="mt-16 max-w-3xl mx-auto animate-fade-up">
              <div className="p-8 rounded-2xl bg-[#1c1917]/80 border border-emerald-500/30 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                      Content Summarized!
                    </h3>
                    <p className="text-emerald-400 text-sm mt-1">
                      Ready to generate your infographic
          </p>
        </div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-stone-900/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">Extract</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-emerald-500 rounded-full" />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">Summarize</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-stone-700 rounded-full" />
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center">
                      <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                      </svg>
                    </div>
                    <span className="text-xs text-stone-500 font-medium">Generate</span>
                  </div>
                </div>

                {/* Summary Preview */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <h4 className="text-white font-semibold">AI Summary</h4>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20">
                    <p className="text-stone-300 leading-relaxed">
                      {summary}
                    </p>
                  </div>
                </div>

                {/* Original content preview (collapsed) */}
                <details className="mb-6 group">
                  <summary className="flex items-center gap-2 cursor-pointer text-stone-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm">View original content ({content.length.toLocaleString()} chars)</span>
                  </summary>
                  <div className="mt-3 p-4 rounded-xl bg-stone-900/50 border border-stone-800 max-h-40 overflow-y-auto">
                    <p className="text-stone-500 text-sm leading-relaxed whitespace-pre-wrap">
                      {content.substring(0, 1000)}{content.length > 1000 && "..."}
                    </p>
                  </div>
                </details>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {(!isAuthenticated || !hasUsedPostLoginFree || paidCredits > 0) ? (
                    <button
                      onClick={handleGenerateInfographic}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Generate Infographic
                    </button>
                  ) : (
                    <button
                      onClick={() => window.location.href = "/#pricing"}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m5-5V8a2 2 0 012-2h1a2 2 0 012 2v5m0 0v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5z" />
                      </svg>
                      Buy Credits to Generate
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Start Over
                  </button>
        </div>
              </div>
            </div>
          )}

          {/* Generating Visual State */}
          {step === "generating" && (
            <div className="mt-16 max-w-3xl mx-auto">
              <div className="relative p-8 rounded-2xl bg-[#1c1917]/80 border border-stone-800 backdrop-blur-sm">
                <div className="space-y-6">
                  {/* Previous steps complete */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">Content summarized</p>
                      <p className="text-stone-500 text-sm line-clamp-1">{summary.substring(0, 60)}...</p>
                    </div>
                  </div>
                  
                  <div className="aspect-video rounded-xl bg-stone-800 shimmer flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-700/50 mb-4">
                        <svg className="w-8 h-8 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <p className="text-stone-400 text-sm">AI is generating your infographic...</p>
                      <p className="text-stone-500 text-xs mt-1">Creating stunning visuals</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="h-10 flex-1 rounded-lg bg-stone-800 shimmer" />
                    <div className="h-10 w-32 rounded-lg bg-stone-800 shimmer" />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800 rounded-b-2xl overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Result Preview Section */}
          {showResult && (
            <div className="mt-16 max-w-4xl mx-auto animate-fade-up">
              <div className="p-8 rounded-2xl bg-[#1c1917]/80 border border-stone-800 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Infographic Generated!</h3>
                      <p className="text-sm text-stone-400">Ready to download and share</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20">
                    Complete
                  </span>
                </div>

                {/* Theme Selector */}
                <div className="mb-6">
                  <p className="text-sm text-stone-400 mb-3">Choose theme:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "sunset" as Theme, name: "Sunset", colors: "from-orange-500 to-purple-600" },
                      { id: "ocean" as Theme, name: "Ocean", colors: "from-cyan-500 to-indigo-700" },
                      { id: "forest" as Theme, name: "Forest", colors: "from-emerald-500 to-teal-700" },
                      { id: "purple" as Theme, name: "Purple", colors: "from-violet-600 to-fuchsia-600" },
                      { id: "midnight" as Theme, name: "Midnight", colors: "from-slate-900 to-neutral-900" },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                          selectedTheme === theme.id
                            ? "bg-white/10 border-orange-500/50 ring-1 ring-orange-500/30"
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${theme.colors}`} />
                        <span className="text-sm text-stone-300">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infographic Preview - Display Version */}
                <div id="infographic-display" className="mb-6">
                  <InfographicPreview summary={summary} theme={selectedTheme} />
                </div>

                {/* Hidden Export Version - Fixed 1080x1080 */}
                <div 
                  ref={infographicRef} 
                  id="infographic-export" 
                  className="fixed -left-[9999px] top-0 pointer-events-none"
                  style={{ width: 1080, height: 1080 }}
                >
                  <InfographicPreview summary={summary} theme={selectedTheme} forExport={true} />
                </div>

                {/* Size info */}
                <p className="text-center text-stone-500 text-sm mb-6">
                  1080 × 1080px • Instagram Ready • PNG
                </p>

                {/* Download limit info */}
                {!hasReachedLimit && (
                  <div className="flex items-center justify-center gap-2 mb-4 text-sm text-stone-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {isAuthenticated
                        ? (hasUsedPostLoginFree ? `${paidCredits} credit${paidCredits !== 1 ? 's' : ''} remaining` : "1 free download remaining")
                        : `${remainingDownloads} free download${remainingDownloads !== 1 ? 's' : ''} remaining`
                      }
                    </span>
                  </div>
                )}

                {/* Payment success message */}
                {paymentSuccess && (
                  <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-fade-up">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-emerald-400 font-semibold">Payment Successful! 🎉</h4>
                        <p className="text-emerald-400/80 text-sm">
                          {paymentMessage || `${PRO_DOWNLOAD_CREDITS} export credits have been added to your account.`}
                        </p>
                      </div>
                      <button 
                        onClick={() => { setPaymentSuccess(false); setPaymentMessage(""); }}
                        className="ml-auto text-emerald-400/60 hover:text-emerald-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upgrade banner when limit reached */}
                {hasReachedLimit && !paymentSuccess && (
                  <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">
                          {isAuthenticated ? "Credits exhausted" : "Free limit reached"}
                        </h4>
                        <p className="text-stone-400 text-sm mb-3">
                          {isAuthenticated
                            ? `You've used your free download. Get ${PRO_DOWNLOAD_CREDITS} more exports for just ${priceConfig.proPackDisplay}.`
                            : `You've used your free download. Get ${PRO_DOWNLOAD_CREDITS} more exports for just ${priceConfig.proPackDisplay}.`
                          }
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.location.href = "/#pricing"}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-orange-500/25"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m5-5V8a2 2 0 012-2h1a2 2 0 012 2v5m0 0v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5z" />
                            </svg>
                            View Pricing
                          </button>
                          <button
                            onClick={handlePayment}
                            disabled={isProcessingPayment}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition-all duration-300 border border-white/20"
                          >
                            {isProcessingPayment ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Buy Now - {priceConfig.proPackDisplay}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDownloadPng}
                    disabled={isExporting || hasReachedLimit}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-300 ${
                      hasReachedLimit
                        ? "bg-stone-700 text-stone-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                    } ${isExporting ? "cursor-wait" : ""}`}
                  >
                    {isExporting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Exporting...</span>
                      </>
                    ) : hasReachedLimit ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Buy Credits to Download</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download PNG</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      // Scroll to social captions section
                      const socialSection = document.getElementById('social-captions');
                      if (socialSection) {
                        socialSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                  <button 
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    New
                  </button>
                </div>

                {/* Social Captions */}
                {(twitterCaption || linkedinCaption) && (
                  <div id="social-captions" className="mt-6 pt-6 border-t border-stone-800 scroll-mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <h4 className="text-white font-semibold">Ready-to-Post Captions</h4>
                    </div>

                    <div className="space-y-4">
                      {/* Twitter Caption */}
                      {twitterCaption && (
                        <div className="p-4 rounded-xl bg-stone-900/50 border border-stone-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">𝕏</span>
                              <span className="text-sm font-medium text-stone-300">Twitter / X</span>
                              <span className="text-xs text-stone-500">({twitterCaption.length}/280)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => shareToTwitter(twitterCaption)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-500/30"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Post
                              </button>
                              <button
                                onClick={() => handleCopyToClipboard(twitterCaption, "twitter")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  copiedField === "twitter"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-white/5 text-stone-400 hover:text-white hover:bg-white/10 border border-transparent"
                                }`}
                              >
                                {copiedField === "twitter" ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {twitterCaption}
                          </p>
                        </div>
                      )}

                      {/* LinkedIn Caption */}
                      {linkedinCaption && (
                        <div className="p-4 rounded-xl bg-stone-900/50 border border-stone-800">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-blue-500">in</span>
                              <span className="text-sm font-medium text-stone-300">LinkedIn</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => shareToLinkedIn(linkedinCaption)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Post
                              </button>
                              <button
                                onClick={() => handleCopyToClipboard(linkedinCaption, "linkedin")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  copiedField === "linkedin"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-white/5 text-stone-400 hover:text-white hover:bg-white/10 border border-transparent"
                                }`}
                              >
                                {copiedField === "linkedin" ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {linkedinCaption}
                          </p>
                        </div>
                      )}
                    </div>
        </div>
                )}

                {/* Share to social platforms */}
                <div className="mt-6 pt-6 border-t border-stone-800">
                  <p className="text-sm text-stone-400 mb-3">Share to:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Twitter', icon: '𝕏', color: 'hover:bg-sky-500/20 hover:border-sky-500/30 hover:text-sky-400' },
                      { name: 'LinkedIn', icon: 'in', color: 'hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-400' },
                      { name: 'Instagram', icon: '📷', color: 'hover:bg-pink-500/20 hover:border-pink-500/30 hover:text-pink-400' },
                      { name: 'Pinterest', icon: '📌', color: 'hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400' },
                    ].map((platform) => (
                      <button
                        key={platform.name}
                        onClick={() => shareGeneric(platform.name)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-stone-300 transition-all ${platform.color}`}
                      >
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Features Section - Scroll Reveal */}
          {step === "input" && !error && (
            <>
              <section id="features" className="mt-32 py-16 scroll-mt-20" style={{ scrollBehavior: 'smooth' }}>
                <div className="max-w-6xl mx-auto px-6">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                      Powerful Features
                    </h2>
                    <p className="text-stone-400 text-lg">Everything you need to create stunning infographics</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        icon: (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ),
                        title: "Lightning Fast",
                        desc: "Generate visuals in under 30 seconds"
                      },
                      {
                        icon: (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        ),
                        title: "Brand Ready",
                        desc: "Customize colors, fonts & layouts"
                      },
                      {
                        icon: (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        ),
                        title: "Share Anywhere",
                        desc: "Optimized for all social platforms"
                      }
                    ].map((feature, i) => (
                      <div 
                        key={i} 
                        className="group p-6 rounded-2xl bg-[#1c1917]/50 border border-stone-800 hover:border-stone-700 hover:bg-[#1c1917] transition-all duration-300"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                          {feature.icon}
                        </div>
                        <h3 className="font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>{feature.title}</h3>
                        <p className="text-sm text-stone-400">{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Pricing Section - Scroll Reveal */}
              <section id="pricing" className="mt-32 py-16 scroll-mt-20" style={{ scrollBehavior: 'smooth' }}>
                <div className="max-w-6xl mx-auto px-6">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                      Simple Pricing
                    </h2>
                    <p className="text-stone-400 text-lg">Choose the plan that works for you</p>
                    
                    {/* Currency Toggle */}
                    <button
                      onClick={handleCurrencyToggle}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-800/50 border border-stone-700 text-stone-300 hover:text-white hover:border-stone-600 transition-all text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {currency === "INR" ? "🇮🇳 INR" : "🇺🇸 USD"}
                      <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {[
                      {
                        name: "Free",
                        price: `${priceConfig.symbol}0`,
                        period: "forever",
                        features: ["1 free export", "All themes", "AI summarization", "Social captions"],
                        cta: "Get Started",
                        ctaLink: "/signup",
                        popular: false,
                      },
                      {
                        name: "Pro Pack",
                        price: priceConfig.proPackDisplay,
                        period: "one-time",
                        features: ["10 export credits", "All themes", "AI summarization", "Priority support"],
                        cta: "Buy Now",
                        ctaLink: "/login",
                        popular: true,
                        onClick: handlePayment,
                      },
                      {
                        name: "Business",
                        price: priceConfig.businessDisplay,
                        period: "one-time",
                        features: ["50 export credits", "All themes", "Priority support", "Custom branding (soon)"],
                        cta: "Contact Sales",
                        ctaLink: "/contact",
                        popular: false,
                      },
                    ].map((plan, i) => (
                      <div
                        key={i}
                        className={`p-8 rounded-2xl border transition-all duration-300 ${
                          plan.popular
                            ? "bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30 scale-105"
                            : "bg-[#1c1917]/50 border-stone-800 hover:border-stone-700"
                        }`}
                      >
                        {plan.popular && (
                          <div className="inline-block px-3 py-1 mb-4 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
                            Most Popular
                          </div>
                        )}
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-white">{plan.price}</span>
                          <span className="text-stone-400 ml-2">/{plan.period}</span>
                        </div>
                        <ul className="space-y-3 mb-6">
                          {plan.features.map((feature, j) => (
                            <li key={j} className="flex items-center gap-2 text-stone-300 text-sm">
                              <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                        {plan.onClick ? (
                          <button
                            onClick={plan.onClick}
                            disabled={isProcessingPayment}
                            className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                              plan.popular
                                ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white"
                                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                            }`}
                          >
                            {isProcessingPayment ? "Processing..." : plan.cta}
                          </button>
                        ) : (
                          <Link
                            href={plan.ctaLink}
                            className={`block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all ${
                              plan.popular
                                ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white"
                                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                            }`}
                          >
                            {plan.cta}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Examples Section - Scroll Reveal */}
              <section id="examples" className="mt-32 py-16 scroll-mt-20" style={{ scrollBehavior: 'smooth' }}>
                <div className="max-w-6xl mx-auto px-6">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                      See It In Action
                    </h2>
                    <p className="text-stone-400 text-lg">Real examples from real blogs</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { title: "Tech Blog", theme: "sunset" as Theme, summary: "AI is revolutionizing software development with automated code generation and intelligent debugging." },
                      { title: "Marketing Guide", theme: "ocean" as Theme, summary: "Content marketing requires video content, AI personalization, and authentic storytelling." },
                      { title: "Productivity Tips", theme: "forest" as Theme, summary: "Remote work productivity: time-blocking, digital minimalism, and async communication." },
                    ].map((example, i) => (
                      <div
                        key={i}
                        className="group p-6 rounded-2xl bg-[#1c1917]/50 border border-stone-800 hover:border-stone-700 transition-all duration-300"
                      >
                        <div className="aspect-square mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                          <InfographicPreview summary={example.summary} theme={example.theme} />
                        </div>
                        <h3 className="font-semibold text-white mb-2">{example.title}</h3>
                        <p className="text-sm text-stone-400 line-clamp-2">{example.summary}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-8">
                    <Link
                      href="/examples"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all"
                    >
                      View More Examples
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </section>
            </>
          )}
      </main>

        {/* Footer */}
        <footer className="border-t border-stone-800/50 mt-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <span>© 2026 Blog2Visuals.</span>
                <span>Powered by AI.</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-sm text-stone-500 hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="text-sm text-stone-500 hover:text-white transition-colors">Terms</Link>
                <Link href="/contact" className="text-sm text-stone-500 hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
