"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

interface Payment {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  credits_added: number;
  status: string;
  created_at: string;
}

export default function PaymentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("payments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setPayments(data || []);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError("Failed to load payment history");
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchPayments();
    }
  }, [user?.id, authLoading]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format amount (paise to rupees)
  const formatAmount = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toFixed(0)}`;
  };

  // Get status badge styles
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-stone-500/10 text-stone-400 border-stone-500/20";
    }
  };

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
        <header className="border-b border-stone-800 bg-[#0c0a09]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  Blog<span className="text-orange-500">2</span>Visuals
                </span>
              </Link>

              {/* Navigation */}
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm text-stone-400 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/payments"
                  className="text-sm text-orange-400 font-medium"
                >
                  Payments
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard"
                className="text-stone-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                Payment History
              </h1>
            </div>
            <p className="text-stone-400">
              View all your past transactions and credit purchases
            </p>
          </div>

          {/* Loading State */}
          {(isLoading || authLoading) && (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-orange-500 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-stone-400">Loading payment history...</span>
              </div>
            </div>
          )}

          {/* Not Authenticated */}
          {!authLoading && !isAuthenticated && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Sign in required</h2>
              <p className="text-stone-400 mb-6">Please sign in to view your payment history</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !authLoading && isAuthenticated && payments.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">No payments yet</h2>
              <p className="text-stone-400 mb-6">Your payment history will appear here after your first purchase</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl"
              >
                Get Credits
              </Link>
            </div>
          )}

          {/* Payments Table */}
          {!isLoading && !authLoading && isAuthenticated && payments.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-2xl bg-[#1c1917]/80 border border-stone-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-800">
                      <th className="text-left px-6 py-4 text-sm font-medium text-stone-400">Date</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-stone-400">Amount</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-stone-400">Credits</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-stone-400">Payment ID</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-stone-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, index) => (
                      <tr
                        key={payment.id}
                        className={`${index !== payments.length - 1 ? "border-b border-stone-800/50" : ""} hover:bg-stone-800/30 transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-white text-sm">
                            {formatDate(payment.created_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">
                            {formatAmount(payment.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {payment.credits_added}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs text-stone-400 bg-stone-800 px-2 py-1 rounded">
                            {payment.razorpay_payment_id || "—"}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusStyles(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 rounded-xl bg-[#1c1917]/80 border border-stone-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-stone-400">
                        {formatDate(payment.created_at)}
                      </span>
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusStyles(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-stone-500 mb-1">Amount</p>
                        <p className="text-xl font-bold text-white">
                          {formatAmount(payment.amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-500 mb-1">Credits Added</p>
                        <p className="text-xl font-bold text-emerald-400">
                          +{payment.credits_added}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-800">
                      <p className="text-xs text-stone-500 mb-1">Payment ID</p>
                      <code className="text-xs text-stone-400 bg-stone-800 px-2 py-1 rounded block truncate">
                        {payment.razorpay_payment_id || "—"}
                      </code>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Total Purchases: {payments.length}
                    </h3>
                    <p className="text-stone-400 text-sm">
                      Total spent: {formatAmount(payments.reduce((sum, p) => sum + p.amount, 0))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-stone-400 mb-1">Total Credits Purchased</p>
                    <p className="text-3xl font-bold text-orange-400">
                      {payments.reduce((sum, p) => sum + p.credits_added, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-stone-800/50 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <span>© 2026 Blog2Visuals.</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-sm text-stone-500 hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="text-sm text-stone-500 hover:text-white transition-colors">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
