// 환율 정보와 통화 변환 유틸리티
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number; // USD 기준 환율
}

// 지원하는 통화 목록 (USD 기준 환율)
export const CURRENCIES: Record<string, Currency> = {
  KR: {
    code: "KRW",
    symbol: "₩",
    name: "원",
    rate: 1350, // 1 USD = 1,350 KRW
  },
  US: {
    code: "USD",
    symbol: "$",
    name: "달러",
    rate: 1, // 기준 통화
  },
  JP: {
    code: "JPY",
    symbol: "¥",
    name: "엔",
    rate: 150, // 1 USD = 150 JPY
  },
  CN: {
    code: "CNY",
    symbol: "¥",
    name: "위안",
    rate: 7.2, // 1 USD = 7.2 CNY
  },
  GB: {
    code: "GBP",
    symbol: "£",
    name: "파운드",
    rate: 0.8, // 1 USD = 0.8 GBP
  },
  EU: {
    code: "EUR",
    symbol: "€",
    name: "유로",
    rate: 0.92, // 1 USD = 0.92 EUR
  },
  CA: {
    code: "CAD",
    symbol: "C$",
    name: "캐나다 달러",
    rate: 1.35, // 1 USD = 1.35 CAD
  },
  AU: {
    code: "AUD",
    symbol: "A$",
    name: "호주 달러",
    rate: 1.5, // 1 USD = 1.5 AUD
  },
};

// 국가 코드에서 통화 정보 가져오기
export function getCurrencyForCountry(countryCode: string): Currency {
  return CURRENCIES[countryCode] || CURRENCIES.US; // 기본값은 USD
}

// USD를 특정 통화로 변환
export function convertFromUSD(usdAmount: number, targetCurrency: Currency): number {
  return usdAmount * targetCurrency.rate;
}

// 특정 통화를 USD로 변환
export function convertToUSD(amount: number, sourceCurrency: Currency): number {
  return amount / sourceCurrency.rate;
}

// 가격을 사용자의 통화로 포맷
export function formatPrice(usdPrice: number, currency: Currency): string {
  const convertedPrice = convertFromUSD(usdPrice, currency);
  
  // 통화별 소수점 처리
  let formattedAmount: string;
  if (currency.code === "KRW" || currency.code === "JPY") {
    // 원, 엔은 소수점 없이 표시
    formattedAmount = Math.round(convertedPrice).toLocaleString();
  } else {
    // 기타 통화는 소수점 2자리
    formattedAmount = convertedPrice.toFixed(2);
  }
  
  return `${currency.symbol}${formattedAmount}`;
}

// 두 통화 간 직접 변환
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  const usdAmount = convertToUSD(amount, fromCurrency);
  return convertFromUSD(usdAmount, toCurrency);
}