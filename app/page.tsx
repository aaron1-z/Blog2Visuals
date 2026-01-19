"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";
import Link from "next/link";
import InfographicPreview from "./components/InfographicPreview";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

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
const PRO_PRICE_INR = 199;
const STORAGE_KEY = "blog2visuals_downloads";
const CREDITS_KEY = "blog2visuals_credits";

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
  const infographicRef = useRef<HTMLDivElement>(null);

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

  // Calculate limits based on free + paid credits
  const totalAllowedDownloads = FREE_DOWNLOAD_LIMIT + paidCredits;
  const hasReachedLimit = downloadCount >= totalAllowedDownloads;
  const remainingDownloads = Math.max(0, totalAllowedDownloads - downloadCount);

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
            body: JSON.stringify({ user_id: user?.id || null }),
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
        currency: orderData.currency || "INR",
        name: "Blog2Visuals",
        description: `Pro Pack - ${PRO_DOWNLOAD_CREDITS} Exports`,
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
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadPng = async () => {
    if (!infographicRef.current || hasReachedLimit) return;

    setIsExporting(true);
    setError(null);

    try {
      // Step 1: Deduct credit in Supabase (if user is authenticated)
      if (user?.id) {
        // Get auth headers for secure API call
        const authHeaders = await getAuthHeaders();
        
        const deductResponse = await fetch("/api/deduct-credit", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ user_id: user.id }),
        });

        const deductData = await deductResponse.json();

        if (!deductResponse.ok || !deductData.success) {
          // Handle unauthorized access
          if (deductResponse.status === 401 || deductResponse.status === 403) {
            setError("Session expired. Please login again.");
            setIsExporting(false);
            return;
          }
          // Prevent negative credits - stop if insufficient
          if (deductData.error === "Insufficient credits") {
            setError("No credits remaining. Please purchase more credits.");
            setIsExporting(false);
            return;
          }
          throw new Error(deductData.error || "Failed to deduct credit");
        }

        // Step 2: Update UI credit count immediately with response from server
        setPaidCredits(deductData.credits);
        localStorage.setItem(CREDITS_KEY, deductData.credits.toString());
      }

      // Step 3: Get the actual infographic element inside the container
      const element = infographicRef.current.querySelector(".aspect-square") as HTMLElement;
      if (!element) {
        throw new Error("Infographic element not found");
      }

      // Generate PNG with high quality
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2, // 2x for retina/high-res (1080x1080 becomes 2160x2160)
        cacheBust: true,
        backgroundColor: undefined,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `blog2visuals-infographic-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      // Increment local download count (for tracking)
      const newCount = downloadCount + 1;
      setDownloadCount(newCount);
      localStorage.setItem(STORAGE_KEY, newCount.toString());
    } catch (err) {
      console.error("Error exporting image:", err);
      setError(err instanceof Error ? err.message : "Failed to export image. Please try again.");
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
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Payment successful — Credits added!</p>
              <p className="text-sm text-emerald-100">You now have {totalAllowedDownloads} downloads available</p>
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
              <Link href="/features" className="text-sm text-stone-400 hover:text-white transition-colors">Features</Link>
              <Link href="/pricing" className="text-sm text-stone-400 hover:text-white transition-colors">Pricing</Link>
              <Link href="/examples" className="text-sm text-stone-400 hover:text-white transition-colors">Examples</Link>
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
          <div className="mt-12 max-w-2xl mx-auto animate-fade-up-delay-4">
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
                    type="url"
                    value={blogUrl}
                    onChange={(e) => setBlogUrl(e.target.value)}
                    placeholder="Paste your blog URL here..."
                    className="flex-1 bg-transparent text-white placeholder-stone-500 outline-none py-3 text-base"
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerate()}
                    disabled={isLoading || showSummary || showResult}
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !blogUrl.trim() || showSummary || showResult}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:from-stone-700 disabled:to-stone-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:shadow-none"
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

            {/* Quick suggestions */}
            {step === "input" && !error && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
                <span className="text-stone-500">Try:</span>
                {['medium.com', 'dev.to', 'hashnode.com'].map((site) => (
                  <button
                    key={site}
                    onClick={() => setBlogUrl(`https://${site}/example-article`)}
                    className="px-3 py-1 rounded-lg bg-white/5 text-stone-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {site}
                  </button>
                ))}
              </div>
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
                  <button
                    onClick={handleGenerateInfographic}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Generate Infographic
                  </button>
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

                {/* Infographic Preview */}
                <div ref={infographicRef} id="infographic-container" className="mb-6">
                  <InfographicPreview summary={summary} theme={selectedTheme} />
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
                    <span>{remainingDownloads} free download{remainingDownloads !== 1 ? 's' : ''} remaining</span>
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
                        <h4 className="text-white font-semibold mb-1">Free limit reached</h4>
                        <p className="text-stone-400 text-sm mb-3">
                          You've used your free download. Get {PRO_DOWNLOAD_CREDITS} more exports for just ₹{PRO_PRICE_INR}.
                        </p>
                        <button 
                          onClick={handlePayment}
                          disabled={isProcessingPayment}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:from-stone-600 disabled:to-stone-600 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-orange-500/25 disabled:shadow-none disabled:cursor-wait"
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
                              Buy {PRO_DOWNLOAD_CREDITS} Exports - ₹{PRO_PRICE_INR}
                            </>
                          )}
                        </button>
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
                  <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all duration-300">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New
                  </button>
                </div>

                {/* Social Captions */}
                {(twitterCaption || linkedinCaption) && (
                  <div className="mt-6 pt-6 border-t border-stone-800">
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
                          <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {linkedinCaption}
                          </p>
                        </div>
                      )}
                    </div>
        </div>
                )}

                {/* Format options */}
                <div className="mt-6 pt-6 border-t border-stone-800">
                  <p className="text-sm text-stone-400 mb-3">Export for:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Twitter', icon: '𝕏' },
                      { name: 'LinkedIn', icon: 'in' },
                      { name: 'Instagram', icon: '📷' },
                      { name: 'Pinterest', icon: '📌' },
                    ].map((platform) => (
                      <button
                        key={platform.name}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-stone-300 hover:text-white transition-all"
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

          {/* Features hint */}
          {step === "input" && !error && (
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
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
