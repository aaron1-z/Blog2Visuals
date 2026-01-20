"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function TermsPage() {
  const { isAuthenticated } = useAuth();

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using Blog2Visuals, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. We reserve the right to modify these terms at any time, and your continued use of the service constitutes acceptance of any changes.`,
    },
    {
      title: "2. Service Description",
      content: `Blog2Visuals is an AI-powered tool that transforms blog content into visual infographics. Users can submit blog URLs, which are processed to extract content, generate summaries, and create shareable infographics. The service includes free and paid tiers with different export limits.`,
    },
    {
      title: "3. User Accounts",
      content: `You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information when creating an account. You are responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.`,
    },
    {
      title: "4. Acceptable Use",
      content: `You agree not to use Blog2Visuals to: submit content that infringes on copyrights or intellectual property rights; generate content that is illegal, harmful, or offensive; attempt to reverse engineer or exploit our systems; share your account credentials with others; use automated systems to abuse the service.`,
    },
    {
      title: "5. Content & Intellectual Property",
      content: `You retain ownership of content you submit. By using our service, you grant us a limited license to process your content for generating infographics. The generated infographics are yours to use, but the Blog2Visuals branding and underlying technology remain our property. You are responsible for ensuring you have the right to use any content you submit.`,
    },
    {
      title: "6. Payments & Credits",
      content: `Credit purchases are non-refundable. Credits do not expire. Prices are subject to change with notice. Payment processing is handled by Razorpay. You agree to pay all applicable taxes. We reserve the right to modify pricing for future purchases.`,
    },
    {
      title: "7. Service Availability",
      content: `We strive to maintain high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue features with or without notice. We are not liable for any loss resulting from service interruptions. Scheduled maintenance will be communicated when possible.`,
    },
    {
      title: "8. Limitation of Liability",
      content: `Blog2Visuals is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid for the service in the past 12 months. We do not guarantee the accuracy or quality of AI-generated content.`,
    },
    {
      title: "9. Termination",
      content: `We may terminate or suspend your account at any time for violation of these terms. You may delete your account at any time through your account settings. Upon termination, your right to use the service ceases immediately. Unused credits are forfeited upon account termination.`,
    },
    {
      title: "10. Governing Law",
      content: `These terms are governed by the laws of India. Any disputes shall be resolved in the courts of India. You agree to submit to the personal jurisdiction of these courts. International users agree to comply with local laws regarding online conduct and content.`,
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
            Terms of{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Service
            </span>
          </h1>
          
          <p className="text-lg text-stone-400 max-w-2xl mx-auto mb-4">
            Please read these terms carefully before using Blog2Visuals.
          </p>
          
          <p className="text-sm text-stone-500">
            Last updated: January 2026
          </p>
        </section>

        {/* Content */}
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className="p-6 rounded-2xl bg-[#1c1917]/50 border border-stone-800">
                <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  {section.title}
                </h2>
                <p className="text-stone-300 leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-center">
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Questions About These Terms?
            </h2>
            <p className="text-stone-400 mb-6 max-w-xl mx-auto">
              If you have any questions about these Terms of Service, please contact us.
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
                <Link href="/privacy" className="text-sm text-stone-500 hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="text-sm text-orange-400 font-medium">Terms</Link>
                <Link href="/contact" className="text-sm text-stone-500 hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
