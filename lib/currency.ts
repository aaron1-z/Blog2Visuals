"use client";

export type Currency = "INR" | "USD";

export interface PriceConfig {
  currency: Currency;
  symbol: string;
  proPack: number;
  proPackDisplay: string;
  business: number;
  businessDisplay: string;
  proPackPaise: number; // Amount in smallest currency unit (paise/cents)
  businessPaise: number;
}

const INDIA_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Calcutta",
];

const INDIA_LOCALES = ["en-IN", "hi-IN", "hi", "bn-IN", "ta-IN", "te-IN", "mr-IN", "gu-IN", "kn-IN", "ml-IN", "pa-IN"];

const STORAGE_KEY = "blog2visuals_currency";

/**
 * Detect if user is likely from India based on timezone and locale
 */
function detectIsIndia(): boolean {
  try {
    // Check timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (INDIA_TIMEZONES.includes(timezone)) {
      return true;
    }

    // Check browser language/locale
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (INDIA_LOCALES.some(locale => lang.toLowerCase().startsWith(locale.toLowerCase().split("-")[0]))) {
        return true;
      }
    }

    return false;
  } catch {
    // Default to USD for international if detection fails
    return false;
  }
}

/**
 * Get cached currency preference from localStorage
 */
export function getCachedCurrency(): Currency | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached === "INR" || cached === "USD") {
      return cached;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save currency preference to localStorage
 */
export function setCachedCurrency(currency: Currency): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Detect and return the appropriate currency for the user
 * Uses cached value if available, otherwise auto-detects
 */
export function detectCurrency(): Currency {
  // Check cache first
  const cached = getCachedCurrency();
  if (cached) {
    return cached;
  }

  // Auto-detect based on timezone/locale
  const isIndia = detectIsIndia();
  const currency: Currency = isIndia ? "INR" : "USD";
  
  // Cache the result
  setCachedCurrency(currency);
  
  return currency;
}

/**
 * Get pricing configuration based on currency
 */
export function getPriceConfig(currency: Currency): PriceConfig {
  if (currency === "INR") {
    return {
      currency: "INR",
      symbol: "₹",
      proPack: 199,
      proPackDisplay: "₹199",
      business: 999,
      businessDisplay: "₹999",
      proPackPaise: 19900, // 199 * 100 paise
      businessPaise: 99900, // 999 * 100 paise
    };
  }
  
  // USD pricing
  return {
    currency: "USD",
    symbol: "$",
    proPack: 2.99,
    proPackDisplay: "$2.99",
    business: 12.99,
    businessDisplay: "$12.99",
    proPackPaise: 299, // 2.99 * 100 cents
    businessPaise: 1299, // 12.99 * 100 cents
  };
}

/**
 * Toggle between INR and USD
 */
export function toggleCurrency(current: Currency): Currency {
  const newCurrency: Currency = current === "INR" ? "USD" : "INR";
  setCachedCurrency(newCurrency);
  return newCurrency;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: Currency): string {
  if (currency === "INR") {
    return `₹${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}
