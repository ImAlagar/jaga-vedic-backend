// src/utils/currencyUtils.js
export const COUNTRY_CURRENCY_MAP = {
  US: 'USD', IN: 'INR', GB: 'GBP', EU: 'EUR', CA: 'CAD',
  AU: 'AUD', JP: 'JPY', CN: 'CNY', BR: 'BRL', MX: 'MXN',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  RU: 'RUB', KR: 'KRW', SG: 'SGD', AE: 'AED', SA: 'SAR',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP', TR: 'TRY',
  ID: 'IDR', TH: 'THB', VN: 'VND', MY: 'MYR', PH: 'PHP'
};

export const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 88.72, CAD: 1.36,
  AUD: 1.52, JPY: 149.50, CNY: 7.24, BRL: 4.92, MXN: 17.25,
  RUB: 92.50, TRY: 28.75, ZAR: 18.90, SGD: 1.34
};

// Cache for exchange rates
let exchangeRatesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fetch current exchange rates
export async function fetchExchangeRates(baseCurrency = 'USD') {
  // Check cache first
  if (exchangeRatesCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return exchangeRatesCache;
  }

  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
    
    if (!response.ok) throw new Error('Frankfurter API request failed');
    
    const data = await response.json();
    const rates = { ...data.rates, [baseCurrency]: 1 };
    
    // Update cache
    exchangeRatesCache = rates;
    cacheTimestamp = Date.now();
    
    return rates;
  } catch (error) {
    console.error('Exchange rate fetch failed, using fallback rates', error);
    return FALLBACK_RATES;
  }
}

// Convert price between currencies
export function convertPrice(price, from = 'USD', to = 'USD', rates = FALLBACK_RATES) {
  if (!price && price !== 0) return 0;

  if (from === to) return price;
  if (!rates[to] || !rates[from]) {
    console.warn(`Missing exchange rate for ${to} or ${from}`);
    const fallback = FALLBACK_RATES[to];
    return fallback ? price * fallback : price;
  }

  const usdValue = from === 'USD' ? price : price / rates[from];
  const converted = usdValue * rates[to];
  return Number(converted.toFixed(2));
}

// Get currency symbol
export function getCurrencySymbol(currency = 'USD') {
  const symbols = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
    CAD: 'CA$', AUD: 'A$', CNY: 'CN¥', BRL: 'R$', MXN: 'MX$',
    KRW: '₩', RUB: '₽', TRY: '₺', ZAR: 'R', SEK: 'kr',
    NOK: 'kr', DKK: 'kr', PLN: 'zł', THB: '฿', PHP: '₱',
    SGD: 'S$', AED: 'AED', SAR: 'SAR'
  };
  return symbols[currency] || currency;
}

// Format price with currency
export function formatPrice(price, currency = 'USD', locale = 'en-US') {
  const convertedPrice = convertPrice(price, 'USD', currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedPrice);
  } catch (error) {
    console.warn('Currency format failed, using fallback', error);
    return `${convertedPrice.toFixed(2)} ${currency}`;
  }
}

// Get user's currency based on country
export function getUserCurrency(countryCode) {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
}