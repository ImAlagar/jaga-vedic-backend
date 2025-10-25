// src/data/currencies.js

/**
 * Comprehensive currency data for worldwide support
 * ISO 4217 currency codes with symbols, names, and regions
 */

export const CURRENCIES = {
  // Major Currencies
  USD: { symbol: '$', name: 'US Dollar', region: 'United States' },
  EUR: { symbol: '€', name: 'Euro', region: 'European Union' },
  GBP: { symbol: '£', name: 'British Pound', region: 'United Kingdom' },
  JPY: { symbol: '¥', name: 'Japanese Yen', region: 'Japan' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar', region: 'Canada' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', region: 'Australia' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc', region: 'Switzerland' },
  CNY: { symbol: 'CN¥', name: 'Chinese Yuan', region: 'China' },
  
  // Asian Currencies
  INR: { symbol: '₹', name: 'Indian Rupee', region: 'India' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', region: 'Singapore' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', region: 'Hong Kong' },
  KRW: { symbol: '₩', name: 'South Korean Won', region: 'South Korea' },
  TWD: { symbol: 'NT$', name: 'New Taiwan Dollar', region: 'Taiwan' },
  THB: { symbol: '฿', name: 'Thai Baht', region: 'Thailand' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', region: 'Malaysia' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', region: 'Indonesia' },
  PHP: { symbol: '₱', name: 'Philippine Peso', region: 'Philippines' },
  VND: { symbol: '₫', name: 'Vietnamese Dong', region: 'Vietnam' },
  
  // Middle East Currencies
  AED: { symbol: 'AED', name: 'UAE Dirham', region: 'United Arab Emirates' },
  SAR: { symbol: 'SAR', name: 'Saudi Riyal', region: 'Saudi Arabia' },
  QAR: { symbol: 'QR', name: 'Qatari Riyal', region: 'Qatar' },
  ILS: { symbol: '₪', name: 'Israeli Shekel', region: 'Israel' },
  TRY: { symbol: '₺', name: 'Turkish Lira', region: 'Turkey' },
  
  // African Currencies
  ZAR: { symbol: 'R', name: 'South African Rand', region: 'South Africa' },
  EGP: { symbol: 'E£', name: 'Egyptian Pound', region: 'Egypt' },
  NGN: { symbol: '₦', name: 'Nigerian Naira', region: 'Nigeria' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', region: 'Kenya' },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi', region: 'Ghana' },
  MAD: { symbol: 'MAD', name: 'Moroccan Dirham', region: 'Morocco' },
  
  // European Currencies (Non-Euro)
  SEK: { symbol: 'kr', name: 'Swedish Krona', region: 'Sweden' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', region: 'Norway' },
  DKK: { symbol: 'kr', name: 'Danish Krone', region: 'Denmark' },
  PLN: { symbol: 'zł', name: 'Polish Zloty', region: 'Poland' },
  CZK: { symbol: 'Kč', name: 'Czech Koruna', region: 'Czech Republic' },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint', region: 'Hungary' },
  RON: { symbol: 'lei', name: 'Romanian Leu', region: 'Romania' },
  
  // Latin American Currencies
  BRL: { symbol: 'R$', name: 'Brazilian Real', region: 'Brazil' },
  MXN: { symbol: 'MX$', name: 'Mexican Peso', region: 'Mexico' },
  ARS: { symbol: 'AR$', name: 'Argentine Peso', region: 'Argentina' },
  CLP: { symbol: 'CL$', name: 'Chilean Peso', region: 'Chile' },
  COP: { symbol: 'CO$', name: 'Colombian Peso', region: 'Colombia' },
  PEN: { symbol: 'S/', name: 'Peruvian Sol', region: 'Peru' },
  
  // Other Important Currencies
  RUB: { symbol: '₽', name: 'Russian Ruble', region: 'Russia' },
  PKR: { symbol: '₨', name: 'Pakistani Rupee', region: 'Pakistan' },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka', region: 'Bangladesh' },
  LKR: { symbol: 'Rs', name: 'Sri Lankan Rupee', region: 'Sri Lanka' },
  NPR: { symbol: 'Rs', name: 'Nepalese Rupee', region: 'Nepal' },
  
  // Oceanian Currencies
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', region: 'New Zealand' },
  FJD: { symbol: 'FJ$', name: 'Fijian Dollar', region: 'Fiji' },
};

/**
 * Country to Currency mapping
 * Maps ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes
 */
export const COUNTRY_CURRENCY_MAP = {
  // North America
  US: 'USD', CA: 'CAD', MX: 'MXN',
  
  // Europe
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', CH: 'CHF', AT: 'EUR', BE: 'EUR', PT: 'EUR', GR: 'EUR',
  IE: 'EUR', FI: 'EUR',
  
  // Asia
  IN: 'INR', CN: 'CNY', JP: 'JPY', KR: 'KRW', SG: 'SGD', HK: 'HKD',
  TW: 'TWD', TH: 'THB', MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND',
  PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
  
  // Middle East
  AE: 'AED', SA: 'SAR', QA: 'QAR', IL: 'ILS', TR: 'TRY',
  
  // Africa
  ZA: 'ZAR', EG: 'EGP', NG: 'NGN', KE: 'KES', GH: 'GHS', MA: 'MAD',
  
  // Latin America
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  
  // Oceania
  AU: 'AUD', NZ: 'NZD', FJ: 'FJD',
  
  // Rest of the world
  RU: 'RUB', UA: 'UAH', KZ: 'KZT',
};

/**
 * Get currency details by code
 */
export function getCurrencyDetails(currencyCode) {
  return CURRENCIES[currencyCode] || { symbol: currencyCode, name: currencyCode, region: 'Unknown' };
}

/**
 * Get currency by country code
 */
export function getCurrencyByCountry(countryCode) {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies() {
  return Object.keys(CURRENCIES);
}

/**
 * Validate if currency is supported
 */
export function isCurrencySupported(currencyCode) {
  return CURRENCIES.hasOwnProperty(currencyCode);
}

export default CURRENCIES;