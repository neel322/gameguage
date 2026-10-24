// Standard INR conversion rate (1 USD ≈ ₹83)
export const USD_TO_INR_RATE = 83;

export function formatINR(amount: number, isAlreadyInr = false): string {
  const value = isAlreadyInr ? amount : Math.round(amount * USD_TO_INR_RATE);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}