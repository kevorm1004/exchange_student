interface CurrencyRates {
  [currency: string]: number;
}

interface ExchangeData {
  rates: CurrencyRates;
  lastUpdate: string | null;
  baseCurrency: string;
}

class ClientExchangeService {
  private exchangeData: ExchangeData | null = null;

  setRates(data: ExchangeData) {
    this.exchangeData = data;
  }

  formatPrice(amount: number, currency: string): string {
    const symbols: { [key: string]: string } = {
      KRW: '₩',
      USD: '$',
      EUR: '€',
      JPY: '¥',
      GBP: '£',
      CNY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      SGD: 'S$',
    };

    // If currency is already KRW, show KRW only
    if (currency === 'KRW') {
      return `₩${Math.round(amount).toLocaleString()}`;
    }

    // If we don't have exchange data, show original currency only
    if (!this.exchangeData) {
      const symbol = symbols[currency] || currency;
      if (currency === 'JPY') {
        return `¥${Math.round(amount).toLocaleString()}`;
      }
      return `${symbol}${amount.toFixed(2)}`;
    }

    // Convert to KRW and show KRW as primary with original in parentheses
    try {
      const krwAmount = this.convert(amount, currency, 'KRW');
      const symbol = symbols[currency] || currency;
      
      // Format KRW amount as primary
      const krwPrice = `${Math.round(krwAmount).toLocaleString()}원`;
      
      // Format original currency in parentheses
      let originalPrice = '';
      if (currency === 'JPY') {
        originalPrice = `¥${Math.round(amount).toLocaleString()}`;
      } else {
        originalPrice = `${symbol}${amount.toFixed(2)}`;
      }
      
      return `${krwPrice} (${originalPrice})`;
    } catch (error) {
      console.warn(`Currency conversion failed for ${currency}:`, error);
      // Fallback to original currency only
      const symbol = symbols[currency] || currency;
      if (currency === 'JPY') {
        return `¥${Math.round(amount).toLocaleString()}`;
      }
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    if (!this.exchangeData) {
      throw new Error('Exchange rates not available');
    }

    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = this.exchangeData.rates;

    // Convert to KRW first
    let krwAmount = amount;
    if (fromCurrency !== 'KRW') {
      const fromRate = rates[fromCurrency];
      if (!fromRate) {
        throw new Error(`Exchange rate not found for ${fromCurrency}`);
      }
      krwAmount = amount * fromRate;
    }

    // Convert from KRW to target currency
    if (toCurrency === 'KRW') {
      return krwAmount;
    }

    const toRate = rates[toCurrency];
    if (!toRate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    return krwAmount / toRate;
  }
}

export const clientExchangeService = new ClientExchangeService();