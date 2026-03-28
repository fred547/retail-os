/**
 * Format a number as currency using the brand's currency code.
 * Falls back to plain number formatting if currency code is invalid.
 */
export function formatCurrency(amount: number, currencyCode: string = "MUR"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
