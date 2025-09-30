// src/config/currencyConfig.js
export const SUPPORTED_CURRENCIES = [
  // Major Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-EU' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  
  // Asian Currencies
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'zh-HK' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', locale: 'zh-TW' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', locale: 'vi-VN' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH' },
  
  // Middle Eastern Currencies
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', locale: 'ar-SA' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', locale: 'ar-QA' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', locale: 'he-IL' },
  
  // African Currencies
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', locale: 'ar-EG' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', locale: 'en-GH' },
  
  // European Currencies (Non-Euro)
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', locale: 'nb-NO' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', locale: 'da-DK' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', locale: 'pl-PL' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', locale: 'cs-CZ' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', locale: 'hu-HU' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', locale: 'ro-RO' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', locale: 'bg-BG' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', locale: 'hr-HR' },
  
  // Latin American Currencies
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', locale: 'es-MX' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$', locale: 'es-AR' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$', locale: 'es-CL' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'CO$', locale: 'es-CO' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', locale: 'es-PE' },
  
  // Other Important Currencies
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', locale: 'uk-UA' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', locale: 'kk-KZ' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', locale: 'ur-PK' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', locale: 'bn-BD' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', locale: 'si-LK' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', locale: 'ne-NP' },
  
  // Oceanian Currencies
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$', locale: 'en-FJ' },
];

export const COUNTRY_CURRENCY_MAP = {
  // North America
  'US': 'USD', 'CA': 'CAD', 'MX': 'MXN',
  
  // Europe
  'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
  'NL': 'EUR', 'BE': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'AT': 'EUR',
  'FI': 'EUR', 'GR': 'EUR', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK',
  'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN',
  'HR': 'HRK', 'SK': 'EUR', 'SI': 'EUR', 'LT': 'EUR', 'LV': 'EUR',
  'EE': 'EUR', 'LU': 'EUR', 'MT': 'EUR', 'CY': 'EUR',
  
  // Asia
  'JP': 'JPY', 'CN': 'CNY', 'IN': 'INR', 'KR': 'KRW', 'SG': 'SGD',
  'HK': 'HKD', 'TW': 'TWD', 'TH': 'THB', 'MY': 'MYR', 'ID': 'IDR',
  'VN': 'VND', 'PH': 'PHP', 'PK': 'PKR', 'BD': 'BDT', 'LK': 'LKR',
  'NP': 'NPR', 'MM': 'MMK', 'KH': 'KHR', 'LA': 'LAK', 'MN': 'MNT',
  
  // Middle East
  'AE': 'AED', 'SA': 'SAR', 'QA': 'QAR', 'TR': 'TRY', 'IL': 'ILS',
  'KW': 'KWD', 'OM': 'OMR', 'BH': 'BHD', 'JO': 'JOD', 'LB': 'LBP',
  
  // Africa
  'ZA': 'ZAR', 'EG': 'EGP', 'NG': 'NGN', 'KE': 'KES', 'GH': 'GHS',
  'ET': 'ETB', 'TZ': 'TZS', 'UG': 'UGX', 'DZ': 'DZD', 'MA': 'MAD',
  'SD': 'SDG', 'AO': 'AOA', 'MZ': 'MZN', 'ZM': 'ZMW',
  
  // Latin America
  'BR': 'BRL', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN',
  'VE': 'VES', 'EC': 'USD', 'UY': 'UYU', 'PY': 'PYG', 'BO': 'BOB',
  'CR': 'CRC', 'DO': 'DOP', 'GT': 'GTQ', 'HN': 'HNL',
  
  // Oceania
  'AU': 'AUD', 'NZ': 'NZD', 'FJ': 'FJD', 'PG': 'PGK', 'SB': 'SBD',
  
  // Other
  'RU': 'RUB', 'UA': 'UAH', 'KZ': 'KZT', 'BY': 'BYN',
};

export const CURRENCY_CONFIG = {
  baseCurrency: 'USD',
  
  // More reliable free APIs
  exchangeRateAPIs: [
    'https://open.er-api.com/v6/latest/USD',
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'https://api.frankfurter.app/latest?from=USD'
  ],

  updateInterval: 24 * 60 * 60 * 1000, // 24 hours

  // Expanded fallback rates for worldwide currencies
  fallbackRates: {
    USD: 1, EUR: 0.92, GBP: 0.79, JPY: 148.50, CAD: 1.35, AUD: 1.52,
    CHF: 0.88, CNY: 7.18, INR: 83.25, SGD: 1.35, HKD: 7.82, KRW: 1320.50,
    TWD: 31.45, THB: 35.80, MYR: 4.68, IDR: 15600, VND: 24350, PHP: 56.30,
    AED: 3.67, SAR: 3.75, QAR: 3.64, TRY: 32.15, ILS: 3.86, ZAR: 18.75,
    EGP: 30.90, NGN: 1600, KES: 157, GHS: 12.45, SEK: 10.45, NOK: 10.25,
    DKK: 6.85, PLN: 4.05, CZK: 22.45, HUF: 355, RON: 4.55, BGN: 1.80,
    HRK: 6.65, BRL: 5.05, MXN: 17.25, ARS: 350, CLP: 890, COP: 3900,
    PEN: 3.75, RUB: 92, UAH: 36.80, KZT: 470, PKR: 280, BDT: 109.50,
    LKR: 320, NPR: 132, NZD: 1.62, FJD: 2.25
  }
};