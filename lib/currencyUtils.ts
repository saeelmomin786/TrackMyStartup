/**
 * Currency conversion utilities
 * Handles conversion from EUR (database currency) to user's local currency
 */

// Currency conversion rates (EUR to other currencies)
export const currencyRates: { [key: string]: number } = {
  'EUR': 1.0,
  'USD': 1.08,  // 1 EUR = 1.08 USD
  'INR': 90.0,  // 1 EUR = 90 INR
  'GBP': 0.85,  // 1 EUR = 0.85 GBP
  'CAD': 1.47,  // 1 EUR = 1.47 CAD
  'AUD': 1.65,  // 1 EUR = 1.65 AUD
  'SGD': 1.45,  // 1 EUR = 1.45 SGD
  'JPY': 160.0, // 1 EUR = 160 JPY
  'CNY': 7.8,   // 1 EUR = 7.8 CNY
  'BRL': 5.4,   // 1 EUR = 5.4 BRL
  'MXN': 18.0,  // 1 EUR = 18 MXN
  'ZAR': 20.0,  // 1 EUR = 20 ZAR
  'NGN': 1600.0, // 1 EUR = 1600 NGN
  'KES': 140.0, // 1 EUR = 140 KES
  'EGP': 33.0,  // 1 EUR = 33 EGP
  'AED': 3.97,  // 1 EUR = 3.97 AED
  'SAR': 4.05,  // 1 EUR = 4.05 SAR
  'ILS': 4.0,   // 1 EUR = 4.0 ILS
};

/**
 * Convert EUR amount to user's currency
 */
export const convertCurrency = (eurAmount: number, targetCurrency: string): number => {
  const rate = currencyRates[targetCurrency] || 1.0;
  return eurAmount * rate;
};

/**
 * Get appropriate locale for currency formatting
 */
export const getCurrencyLocale = (currency: string): string => {
  const localeMap: { [key: string]: string } = {
    'INR': 'en-IN',
    'USD': 'en-US',
    'GBP': 'en-GB',
    'CAD': 'en-CA',
    'AUD': 'en-AU',
    'SGD': 'en-SG',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
    'BRL': 'pt-BR',
    'MXN': 'es-MX',
    'ZAR': 'en-ZA',
    'NGN': 'en-NG',
    'KES': 'en-KE',
    'EGP': 'ar-EG',
    'AED': 'ar-AE',
    'SAR': 'ar-SA',
    'ILS': 'he-IL',
    'EUR': 'en-EU',
  };
  
  return localeMap[currency] || 'en-EU';
};

/**
 * Format currency amount from EUR to user's currency
 */
export const formatCurrencyFromEUR = (eurAmount: number, targetCurrency: string): string => {
  const convertedAmount = convertCurrency(eurAmount, targetCurrency);
  const locale = getCurrencyLocale(targetCurrency);
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 2
  }).format(convertedAmount);
};