"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "Perfect for trying out Blog2Visuals",
      features: [
        "1 free export",
        "All themes included",
        "AI summarization",
        "Social captions",
        "1080x1080 PNG export",
      ],
      limitations: ["Limited to 1 download"],
      cta: "Get Started",
      ctaLink: "/",
      popular: false,
    },
    {
      name: "Pro Pack",
      price: "₹199",
      period: "one-time",
      description: "Best for content creators",
      features: [
        "10 export credits",
        "All themes included",
        "AI summarization",
        "Twitter & LinkedIn captions",
        "High-res PNG export",
        "Priority support",
      ],
      limitations: [],
      cta: "Buy Now",
      ctaLink: "/#pricing",
      popular: true,
    },
    {
      name: "Business",
      price: "₹999",
      period: "one-time",
      description: "For teams and agencies",
      features: [
        "50 export credits",
        "All themes included",
        "AI summarization",
        "All social captions",
        "High-res PNG export",
        "Priority support",
        "Custom branding (coming soon)",
      ],
      limitations: [],
      cta: "Contact Sales",
      ctaLink: "/contact",
      popular: false,
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
              <Link href="/pricing" className="text-sm text-orange-400 font-medium">Pricing</Link>
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
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-sm text-orange-400 font-medium">Simple Pricing</span>
          </div>
          
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            style={{ fontFamily: 'var(--font-syne), sans-serif' }}
          >
            Pay once,{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              create forever
            </span>
          </h1>
          
          <p className="text-lg text-stone-400 max-w-2xl mx-auto">
            No subscriptions. No hidden fees. Just simple credit packs that never expire.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-6 lg:p-8 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                  plan.popular
                    ? "bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30 scale-105"
                    : "bg-[#1c1917]/80 border-stone-800 hover:border-stone-700"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                    {plan.name}
                  </h3>
                  <p className="text-stone-400 text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-stone-500 ml-2">/{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-stone-300">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, i) => (
                    <li key={i} className="flex items-center gap-3 text-stone-500">
                      <svg className="w-5 h-5 text-stone-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaLink}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 font-semibold rounded-xl transition-all duration-300 ${
                    plan.popular
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                      : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Do credits expire?",
                a: "No! Your credits never expire. Use them whenever you need.",
              },
              {
                q: "Can I get a refund?",
                a: "Yes, we offer a 7-day money-back guarantee if you're not satisfied.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit/debit cards, UPI, and net banking via Razorpay.",
              },
              {
                q: "Can I upgrade my plan later?",
                a: "Absolutely! You can purchase additional credit packs anytime.",
              },
              {
                q: "What happens after I use all credits?",
                a: "You can purchase more credits or continue using the free tier with 1 export.",
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group p-6 rounded-xl bg-[#1c1917]/80 border border-stone-800 hover:border-stone-700 transition-all"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-medium text-white">{faq.q}</span>
                  <svg className="w-5 h-5 text-stone-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-stone-400">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Start creating for free
            </h2>
            <p className="text-stone-400 max-w-xl mx-auto mb-8">
              Try Blog2Visuals with 1 free export. No credit card required.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Get Started Free
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
