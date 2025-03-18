// Exchange rates against 1 USD (approximate values - would need to be updated regularly in a production app)
export const EXCHANGE_RATES = {
  USD: 1,
  UGX: 3750, // 1 USD = ~3750 UGX
  KES: 130, // 1 USD = ~130 KES
}

export type SupportedCurrency = keyof typeof EXCHANGE_RATES

// Convert amount from source currency to target currency
export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number {
  // If both currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }

  // Convert to USD first (as base currency)
  const amountInUSD = amount / EXCHANGE_RATES[fromCurrency]
  
  // Then convert from USD to target currency
  return amountInUSD * EXCHANGE_RATES[toCurrency]
}

// Format currency according to locale and currency code
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const formatter = new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency: currency,
    maximumFractionDigits: currency === "UGX" || currency === "KES" ? 0 : 2,
  })

  return formatter.format(amount)
}

// Get appropriate locale for formatting
function getCurrencyLocale(currency: SupportedCurrency): string {
  switch (currency) {
    case "KES":
      return "en-KE"
    case "UGX":
      return "en-UG"
    case "USD":
      return "en-US"
    default:
      return "en-US"
  }
}

// Get the currency display name
export function getCurrencyName(currency: SupportedCurrency): string {
  switch (currency) {
    case "KES":
      return "Kenya Shillings"
    case "UGX":
      return "Uganda Shillings"
    case "USD":
      return "US Dollars"
    default:
      return currency
  }
} 