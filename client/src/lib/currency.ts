// 환율 정보 (실제 운영시에는 API에서 가져와야 함)
const exchangeRates = {
  USD: 1350, // 1 USD = 1350 KRW
  EUR: 1450, // 1 EUR = 1450 KRW  
  JPY: 9,    // 1 JPY = 9 KRW
  CNY: 188,  // 1 CNY = 188 KRW
  KRW: 1,    // 1 KRW = 1 KRW
};

export function formatCurrency(amount: number, currency: string = 'KRW'): string {
  if (!amount) return '₩0';
  
  // 원래 통화가 KRW인 경우 그대로 표시
  if (currency === 'KRW') {
    return `₩${amount.toLocaleString('ko-KR')}`;
  }
  
  // 다른 통화를 KRW로 변환
  const rate = exchangeRates[currency as keyof typeof exchangeRates];
  if (!rate) {
    return `${getCurrencySymbol(currency)}${amount.toLocaleString()}`;
  }
  
  const krwAmount = Math.round(amount * rate);
  const originalAmount = `${getCurrencySymbol(currency)}${amount.toLocaleString()}`;
  const krwFormatted = `₩${krwAmount.toLocaleString('ko-KR')}`;
  
  return `${originalAmount} (${krwFormatted})`;
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    JPY: '¥',
    CNY: '¥',
    KRW: '₩',
  };
  
  return symbols[currency] || currency;
}

export function convertToKRW(amount: number, fromCurrency: string): number {
  if (fromCurrency === 'KRW') return amount;
  
  const rate = exchangeRates[fromCurrency as keyof typeof exchangeRates];
  if (!rate) return amount;
  
  return Math.round(amount * rate);
}

export function getSupportedCurrencies(): string[] {
  return Object.keys(exchangeRates);
}

export const SUPPORTED_CURRENCIES = Object.keys(exchangeRates);

export function convertFromUSD(amount: number, toCurrency: string): number {
  if (toCurrency === 'USD') return amount;
  
  const rate = exchangeRates[toCurrency as keyof typeof exchangeRates];
  if (!rate) return amount;
  
  return Math.round(amount / (exchangeRates.USD / rate));
}