export function formatCurrency(amount: number, currency: string = '$'): string {
  const formatted = Math.abs(amount).toFixed(2);
  return `${currency}${formatted}`;
}

export function formatProfit(amount: number, currency: string = '$'): string {
  const prefix = amount >= 0 ? '+' : '-';
  return `${prefix}${currency}${Math.abs(amount).toFixed(2)}`;
}
