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

  // Force update rates for testing
  async forceUpdateRates(): Promise<boolean> {
    this.cachedRates = null; // Clear cache to force API call
    this.lastUpdate = null;
    return await this.updateRates();
  }

  async updateRates(): Promise<boolean> {
    try {
      console.log('Updating exchange rates from Korea Eximbank...');
      
      // Use Korea Eximbank API
      const apiKey = process.env.KOREAEXIM_API_KEY;
      if (!apiKey) {
        throw new Error('Korea Eximbank API key not found');
      }
      
      // Get current date in YYYYMMDD format
      const today = new Date();
      const searchDate = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      const apiUrl = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${apiKey}&searchdate=${searchDate}&data=AP01`;
      
      console.log('Fetching exchange rates from Korea Eximbank API...');
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API response: ${response.status}`);
      }

      const data = await response.json();
      
      // Check if data is an array (Korea Eximbank format)
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid API response format from Korea Eximbank');
      }
      
      // Check for error result
      if (data[0].result && data[0].result !== 1) {
        const errorMessages = {
          2: 'DATA코드 오류',
          3: '인증코드 오류', 
          4: '일일제한횟수 마감'
        };
        throw new Error(`Korea Eximbank API error: ${errorMessages[data[0].result] || 'Unknown error'}`);
      }

      // Convert Korea Eximbank data to our format
      const newRates: CurrencyRates = {};
      
      console.log('Processing Korea Eximbank data:', data.slice(0, 3)); // Log first 3 items for debugging
      
      data.forEach((item: any) => {
        if (item.result === 1 && item.cur_unit && item.deal_bas_r) {
          let currency = '';
          let rate = parseFloat(item.deal_bas_r.replace(/,/g, '')); // Remove commas
          
          // Map currency codes
          switch (item.cur_unit) {
            case 'USD':
              currency = 'USD';
              break;
            case 'EUR':
              currency = 'EUR';
              break;
            case 'JPY(100)':
              currency = 'JPY';
              rate = rate / 100; // Convert JPY(100) to single JPY
              break;
            case 'GBP':
              currency = 'GBP';
              break;
            case 'CNH':
            case 'CNY':
              currency = 'CNY';
              break;
            case 'CAD':
              currency = 'CAD';
              break;
            case 'AUD':
              currency = 'AUD';
              break;
          }
          
          if (currency && rate > 0) {
            newRates[currency] = Math.round(rate * 100) / 100;
            console.log(`Mapped ${item.cur_unit} -> ${currency}: ${rate}`);
          }
        }
      });

      // Validate we have the essential currencies
      if (!newRates.USD || !newRates.EUR) {
        throw new Error('Essential currency rates (USD, EUR) not found in API response');
      }

      // Save to database
      await db.insert(exchangeRates).values({
        baseCurrency: 'KRW',
        rates: JSON.stringify(newRates),
      });

      // Update cache
      this.cachedRates = newRates;
      this.lastUpdate = new Date();

      console.log('Exchange rates updated successfully from Korea Eximbank:', newRates);
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