import { exchangeRates, type ExchangeRate } from "@shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";
import * as cron from "node-cron";

export interface CurrencyRates {
  [key: string]: number;
}

class ExchangeService {
  private cachedRates: CurrencyRates | null = null;
  private lastUpdate: Date | null = null;

  constructor() {
    // Initialize exchange rates on startup
    this.initializeRates();
    
    // Schedule daily updates at 3:00 AM KST
    cron.schedule('0 3 * * *', () => {
      this.updateRates();
    }, {
      timezone: 'Asia/Seoul'
    });
  }

  private async initializeRates() {
    try {
      // Try to load from database first
      const existingRates = await this.getRatesFromDB();
      if (existingRates) {
        this.cachedRates = JSON.parse(existingRates.rates);
        this.lastUpdate = existingRates.updatedAt;
        console.log('Loaded cached exchange rates from database');
      } else {
        // If no rates in DB, fetch fresh ones
        await this.updateRates();
      }
    } catch (error) {
      console.error('Failed to initialize exchange rates:', error);
      // Use fallback rates
      this.cachedRates = this.getFallbackRates();
    }
  }

  private async getRatesFromDB(): Promise<ExchangeRate | null> {
    try {
      const [rates] = await db.select()
        .from(exchangeRates)
        .where(eq(exchangeRates.baseCurrency, 'KRW'))
        .orderBy(desc(exchangeRates.updatedAt))
        .limit(1);
      return rates || null;
    } catch (error) {
      console.error('Error fetching rates from DB:', error);
      return null;
    }
  }

  private getFallbackRates(): CurrencyRates {
    // Fallback rates - approximate values
    return {
      USD: 1350,
      EUR: 1470,
      JPY: 9.0,
      GBP: 1710,
      CNY: 185,
      CAD: 995,
      AUD: 860
    };
  }

  async updateRates(): Promise<boolean> {
    try {
      console.log('Updating exchange rates...');
      
      // Try exchangerate-api.com which may use this API key format
      const apiKey = process.env.EXCHANGE_API_KEY;
      const apiUrl = apiKey 
        ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/KRW`
        : 'https://api.exchangerate.host/latest?base=KRW&symbols=USD,EUR,JPY,GBP,CNY,CAD,AUD';
      
      console.log('Fetching exchange rates with API key...');
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API response: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if it's exchangerate-api.com response format
      if (data.result === 'success' && data.conversion_rates) {
        // Convert from KRW base rates (already in correct format)
        const newRates: CurrencyRates = {};
        const targetCurrencies = ['USD', 'EUR', 'JPY', 'GBP', 'CNY', 'CAD', 'AUD'];
        
        targetCurrencies.forEach(currency => {
          const rate = data.conversion_rates[currency];
          if (typeof rate === 'number' && rate > 0) {
            newRates[currency] = Math.round((1 / rate) * 100) / 100; // Inverse for KRW->currency
          }
        });
        
        // Save to database
        await db.insert(exchangeRates).values({
          baseCurrency: 'KRW',
          rates: JSON.stringify(newRates),
        });

        // Update cache
        this.cachedRates = newRates;
        this.lastUpdate = new Date();

        console.log('Exchange rates updated successfully:', newRates);
        return true;
      }
      
      // Fallback to old format check
      if (!data.success || !data.rates) {
        throw new Error('Invalid API response format');
      }

      // Legacy format handling
      const newRates: CurrencyRates = {};
      Object.entries(data.rates).forEach(([currency, rate]) => {
        if (typeof rate === 'number' && rate > 0) {
          newRates[currency] = Math.round((1 / rate) * 100) / 100;
        }
      });

      // Save to database
      await db.insert(exchangeRates).values({
        baseCurrency: 'KRW',
        rates: JSON.stringify(newRates),
      });

      // Update cache
      this.cachedRates = newRates;
      this.lastUpdate = new Date();

      console.log('Exchange rates updated successfully:', newRates);
      return true;
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      
      // If we have no cached rates, use fallback
      if (!this.cachedRates) {
        this.cachedRates = this.getFallbackRates();
        this.lastUpdate = new Date();
        console.log('Using fallback rates due to API failure');
      }
      
      return false;
    }
  }

  getRates(): CurrencyRates {
    return this.cachedRates || this.getFallbackRates();
  }

  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const rates = this.getRates();
    
    if (fromCurrency === toCurrency) {
      return amount;
    }

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
      return Math.round(krwAmount);
    }

    const toRate = rates[toCurrency];
    if (!toRate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    return Math.round((krwAmount / toRate) * 100) / 100;
  }

  formatCurrency(amount: number, currency: string, originalAmount?: number, originalCurrency?: string): string {
    const symbols: { [key: string]: string } = {
      KRW: '₩',
      USD: '$',
      EUR: '€',
      JPY: '¥',
      GBP: '£',
      CNY: '¥',
      CAD: 'C$',
      AUD: 'A$'
    };

    const symbol = symbols[currency] || currency;
    
    // Format the main amount
    let formatted = '';
    if (currency === 'KRW' || currency === 'JPY') {
      formatted = `${symbol}${Math.round(amount).toLocaleString()}`;
    } else {
      formatted = `${symbol}${amount.toFixed(2)}`;
    }

    // Add original currency in parentheses if different
    if (originalAmount && originalCurrency && originalCurrency !== currency) {
      const originalSymbol = symbols[originalCurrency] || originalCurrency;
      if (originalCurrency === 'KRW' || originalCurrency === 'JPY') {
        formatted += ` (${originalSymbol}${Math.round(originalAmount).toLocaleString()})`;
      } else {
        formatted += ` (${originalSymbol}${originalAmount.toFixed(2)})`;
      }
    }

    return formatted;
  }
}

export const exchangeService = new ExchangeService();