import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { clientExchangeService } from "@/lib/exchange";

export function useExchangeRates() {
  const { data: exchangeData, isLoading, error } = useQuery({
    queryKey: ['/api/exchange'],
    staleTime: 1000 * 60 * 60, // 1 hour - rates don't change often
    refetchInterval: 1000 * 60 * 60 * 24, // Refetch daily
  });

  // Update client service when rates change
  useEffect(() => {
    if (exchangeData) {
      clientExchangeService.setRates(exchangeData);
    }
  }, [exchangeData]);

  const formatPrice = (amount: number, currency: string) => {
    if (!exchangeData || isLoading) {
      // Fallback formatting while loading
      const symbols: { [key: string]: string } = {
        KRW: '₩',
        USD: '$',
        EUR: '€',
        JPY: '¥',
        GBP: '£',
        CNY: '¥',
      };
      const symbol = symbols[currency] || currency;
      
      if (currency === 'KRW' || currency === 'JPY') {
        return `${symbol}${Math.round(amount).toLocaleString()}`;
      }
      return `${symbol}${amount.toFixed(2)}`;
    }

    return clientExchangeService.formatPrice(amount, currency);
  };

  const convert = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (!exchangeData || isLoading) {
      return amount; // Return original amount if rates not loaded
    }

    return clientExchangeService.convert(amount, fromCurrency, toCurrency);
  };

  return {
    exchangeData,
    isLoading,
    error,
    formatPrice,
    convert,
    rates: exchangeData?.rates || {},
    lastUpdate: exchangeData?.lastUpdate || null,
  };
}