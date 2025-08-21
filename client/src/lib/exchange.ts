// Client-side exchange rate utilities
// Note: Client should only use rates provided by server, never fetch external APIs directly

export interface CurrencyRates {
  [key: string]: number;
}

export interface ExchangeData {
  rates: CurrencyRates;
  lastUpdate: string;
  baseCurrency: string;
}

// Currency symbols mapping
export const CURRENCY_SYMBOLS: { [key: string]: string } = {
  KRW: '₩',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
  CNY: '¥',
  CAD: 'C$',
  AUD: 'A$'
};

// Currency names mapping
export const CURRENCY_NAMES: { [key: string]: string } = {
  KRW: '한국 원',
  USD: '미국 달러',
  EUR: '유로',
  JPY: '일본 엔',
  GBP: '영국 파운드',
  CNY: '중국 위안',
  CAD: '캐나다 달러',
  AUD: '호주 달러'
};

// Supported currencies list
export const SUPPORTED_CURRENCIES = [
  { code: 'KRW', name: '한국 원', symbol: '₩' },
  { code: 'USD', name: '미국 달러', symbol: '$' },
  { code: 'EUR', name: '유로', symbol: '€' },
  { code: 'JPY', name: '일본 엔', symbol: '¥' },
  { code: 'GBP', name: '영국 파운드', symbol: '£' },
  { code: 'CNY', name: '중국 위안', symbol: '¥' },
  { code: 'CAD', name: '캐나다 달러', symbol: 'C$' },
  { code: 'AUD', name: '호주 달러', symbol: 'A$' }
];

export class ClientExchangeService {
  private rates: CurrencyRates = {};
  private lastUpdate: Date | null = null;

  setRates(exchangeData: ExchangeData) {
    this.rates = exchangeData.rates;
    this.lastUpdate = new Date(exchangeData.lastUpdate);
  }

  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Convert to KRW first
    let krwAmount = amount;
    if (fromCurrency !== 'KRW') {
      const fromRate = this.rates[fromCurrency];
      if (!fromRate) {
        console.warn(`Exchange rate not found for ${fromCurrency}`);
        return amount; // Return original amount if rate not found
      }
      krwAmount = amount * fromRate;
    }

    // Convert from KRW to target currency
    if (toCurrency === 'KRW') {
      return Math.round(krwAmount);
    }

    const toRate = this.rates[toCurrency];
    if (!toRate) {
      console.warn(`Exchange rate not found for ${toCurrency}`);
      return amount; // Return original amount if rate not found
    }

    return Math.round((krwAmount / toRate) * 100) / 100;
  }

  formatCurrency(amount: number, currency: string, showOriginal?: { amount: number; currency: string }): string {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    
    // Format the main amount
    let formatted = '';
    if (currency === 'KRW' || currency === 'JPY') {
      formatted = `${symbol}${Math.round(amount).toLocaleString()}`;
    } else {
      formatted = `${symbol}${amount.toFixed(2)}`;
    }

    // Add original currency in parentheses if different
    if (showOriginal && showOriginal.currency !== currency) {
      const originalSymbol = CURRENCY_SYMBOLS[showOriginal.currency] || showOriginal.currency;
      if (showOriginal.currency === 'KRW' || showOriginal.currency === 'JPY') {
        formatted += ` (${originalSymbol}${Math.round(showOriginal.amount).toLocaleString()})`;
      } else {
        formatted += ` (${originalSymbol}${showOriginal.amount.toFixed(2)})`;
      }
    }

    return formatted;
  }

  formatPrice(originalAmount: number, originalCurrency: string): string {
    // Always show KRW as primary, with original currency in parentheses if different
    if (originalCurrency === 'KRW') {
      return this.formatCurrency(originalAmount, 'KRW');
    }

    const krwAmount = this.convert(originalAmount, originalCurrency, 'KRW');
    return this.formatCurrency(krwAmount, 'KRW', { 
      amount: originalAmount, 
      currency: originalCurrency 
    });
  }

  getRates(): CurrencyRates {
    return { ...this.rates };
  }

  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }
}

// Create singleton instance
export const clientExchangeService = new ClientExchangeService();