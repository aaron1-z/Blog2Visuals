"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function PrivacyPage() {
  const { isAuthenticated } = useAuth();

  const sections = [
    {
      title: "Information We Collect",
      content: [
        "Account information (email address) when you sign up",
        "Blog URLs you submit for processing",
        "Payment information processed securely through Razorpay",
        "Usage data to improve our services",
      ],
    },
    {
      title: "How We Use Your Information",
      content: [
        "To provide and maintain our service",
        "To process your blog URLs and generate infographics",
        "To process payments and manage your credits",
        "To send important service updates",
        "To improve our AI models and user experience",
      ],
    },
    {
      title: "Data Storage & Security",
      content: [
        "Your data is stored securely using Supabase's encrypted infrastructure",
        "We never share your personal information with third parties for marketing",
        "Blog content is processed but not permanently stored after generation",
        "Payment information is handled by Razorpay and never stored on our servers",
      ],
    },
    {
      title: "Your Rights",
      content: [
        "Access your personal data at any time",
        "Request deletion of your account and data",
        "Export your data in a standard format",
        "Opt out of non-essential communications",
      ],
    },
    {
      title: "Cookies & Tracking",
      content: [
        "We use essential cookies for authentication",
        "Local storage is used to save your preferences",
        "We do not use third-party tracking or advertising cookies",
      ],
    },
    {
      title: "Third-Party Services",
      content: [
        "Supabase for authentication and data storage",
        "Razorpay for payment processing",
        "HuggingFace for AI-powered text processing",
        "Vercel for hosting and content delivery",
      ],
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0c0a09]" />
      <div className="fixed inset-0 grid-pattern" />
      <div className="fixed inset-0 noise-overlay" />
      
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/20 via-orange-600/5 to-transparent blur-3xl" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <header>
          <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
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

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-8 text-center">
          <h1 
            className="text-4xl md:text-5xl font-extrabold leading-tight mb-6"
            style={{ fontFamily: 'var(--font-syne), sans-serif' }}
          >
            Privacy{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>
          
          <p className="text-lg text-stone-400 max-w-2xl mx-auto mb-4">
            Your privacy matters to us. Here's how we handle your data.
          </p>
          
          <p className="text-sm text-stone-500">
            Last updated: January 2026
          </p>
        </section>

        {/* Content */}
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={index} className="p-6 rounded-2xl bg-[#1c1917]/50 border border-stone-800">
                <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  {section.title}
                </h2>
                <ul className="space-y-3">
                  {section.content.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-stone-300">
                      <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-center">
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Questions About Your Privacy?
            </h2>
            <p className="text-stone-400 mb-6 max-w-xl mx-auto">
              If you have any questions about this Privacy Policy or how we handle your data, please don't hesitate to contact us.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300"
            >
              Contact Us
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-stone-800/50">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <span>© 2026 Blog2Visuals.</span>
                <span>Powered by AI.</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-sm text-orange-400 font-medium">Privacy</Link>
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
