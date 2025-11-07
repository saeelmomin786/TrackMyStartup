
/**
 * Generates a unique investor code in the format INV-XXXXXX
 * @returns A unique investor code
 */
export function generateInvestorCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'INV-';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Validates if a string is a valid investor code format
 * @param code The code to validate
 * @returns True if valid, false otherwise
 */
export function isValidInvestorCode(code: string): boolean {
  const investorCodeRegex = /^INV-[A-Z0-9]{6}$/;
  return investorCodeRegex.test(code);
}

/**
 * Generates a unique Investment Advisor code in the format IA-XXXXXX
 * @returns A unique Investment Advisor code
 */
export function generateInvestmentAdvisorCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'IA-';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Validates if a string is a valid Investment Advisor code format
 * @param code The code to validate
 * @returns True if valid, false otherwise
 */
export function isValidInvestmentAdvisorCode(code: string): boolean {
  const advisorCodeRegex = /^IA-[A-Z0-9]{6}$/;
  return advisorCodeRegex.test(code);
}

/**
 * Currency formatting utility functions
 */

/**
 * Formats a number as currency with the specified currency code
 * @param value The numeric value to format
 * @param currency The currency code (e.g., 'USD', 'EUR', 'INR')
 * @param options Additional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number, 
  currency: string = 'USD', 
  options: {
    notation?: 'standard' | 'compact';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const { notation = 'standard', minimumFractionDigits, maximumFractionDigits } = options;
  
  // Get appropriate locale based on currency
  const getLocaleForCurrency = (currency: string): string => {
    const localeMap: Record<string, string> = {
      'USD': 'en-US',
      'EUR': 'en-EU',
      'GBP': 'en-GB',
      'INR': 'en-IN',
      'CAD': 'en-CA',
      'AUD': 'en-AU',
      'JPY': 'ja-JP',
      'CHF': 'de-CH',
      'SGD': 'en-SG',
      'CNY': 'zh-CN',
      'BRL': 'pt-BR',
      'MXN': 'es-MX',
      'KRW': 'ko-KR',
      'HKD': 'en-HK',
      'NZD': 'en-NZ',
      'SEK': 'sv-SE',
      'NOK': 'nb-NO',
      'DKK': 'da-DK',
      'PLN': 'pl-PL',
      'CZK': 'cs-CZ',
      'HUF': 'hu-HU',
      'RUB': 'ru-RU',
      'TRY': 'tr-TR',
      'ZAR': 'en-ZA',
      'ILS': 'he-IL',
      'AED': 'ar-AE',
      'SAR': 'ar-SA',
      'QAR': 'ar-QA',
      'KWD': 'ar-KW',
      'BHD': 'ar-BH',
      'OMR': 'ar-OM',
      'JOD': 'ar-JO',
      'LBP': 'ar-LB',
      'EGP': 'ar-EG',
      'MAD': 'ar-MA',
      'TND': 'ar-TN',
      'DZD': 'ar-DZ',
      'LYD': 'ar-LY',
      'SDG': 'ar-SD',
      'ETB': 'am-ET',
      'KES': 'sw-KE',
      'UGX': 'sw-UG',
      'TZS': 'sw-TZ',
      'RWF': 'rw-RW',
      'BIF': 'rn-BI',
      'DJF': 'so-DJ',
      'SOS': 'so-SO',
      'ERN': 'ti-ER',
      'SSP': 'en-SS',
      'CDF': 'fr-CD',
      'AOA': 'pt-AO',
      'BWP': 'en-BW',
      'LSL': 'st-LS',
      'SZL': 'en-SZ',
      'MZN': 'pt-MZ',
      'MWK': 'ny-MW',
      'ZMW': 'en-ZM',
      'ZWL': 'en-ZW',
      'NAD': 'en-NA',
      'MGA': 'mg-MG',
      'MUR': 'en-MU',
      'SCR': 'en-SC',
      'KMF': 'ar-KM',
      'MVR': 'dv-MV',
      'LKR': 'si-LK',
      'BDT': 'bn-BD',
      'NPR': 'ne-NP',
      'BTN': 'dz-BT',
      'PKR': 'ur-PK',
      'AFN': 'fa-AF',
      'IRR': 'fa-IR',
      'IQD': 'ar-IQ',
      'SYP': 'ar-SY',
      'YER': 'ar-YE',
      'AMD': 'hy-AM',
      'AZN': 'az-AZ',
      'GEL': 'ka-GE',
      'KZT': 'kk-KZ',
      'KGS': 'ky-KG',
      'TJS': 'tg-TJ',
      'TMT': 'tk-TM',
      'UZS': 'uz-UZ',
      'MNT': 'mn-MN',
      'LAK': 'lo-LA',
      'KHR': 'km-KH',
      'VND': 'vi-VN',
      'THB': 'th-TH',
      'MYR': 'ms-MY',
      'IDR': 'id-ID',
      'PHP': 'en-PH',
      'MMK': 'my-MM',
      'BND': 'ms-BN',
      'FJD': 'en-FJ',
      'PGK': 'en-PG',
      'SBD': 'en-SB',
      'VUV': 'bi-VU',
      'WST': 'sm-WS',
      'TOP': 'to-TO',
      'XPF': 'fr-PF',
      'ISK': 'is-IS'
    };
    return localeMap[currency] || 'en-US';
  }
  
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    notation: notation,
  };

  if (minimumFractionDigits !== undefined) {
    formatOptions.minimumFractionDigits = minimumFractionDigits;
  }
  if (maximumFractionDigits !== undefined) {
    formatOptions.maximumFractionDigits = maximumFractionDigits;
  }

  const locale = getLocaleForCurrency(currency);
  return new Intl.NumberFormat(locale, formatOptions).format(value);
}

/**
 * Formats a number as compact currency (e.g., $1.2M, €500K)
 * @param value The numeric value to format
 * @param currency The currency code
 * @returns Formatted compact currency string
 */
export function formatCurrencyCompact(value: number, currency: string = 'USD'): string {
  return formatCurrency(value, currency, { notation: 'standard' });
}

/**
 * Gets the currency symbol for a given currency code
 * @param currency The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CHF': 'CHF',
    'SGD': 'S$',
    'CNY': '¥',
    'BTN': 'Nu.', // Bhutan
    'AMD': '֏', // Armenia
    'BYN': 'Br', // Belarus
    'GEL': '₾', // Georgia
    'ILS': '₪', // Israel
    'JOD': 'د.ا', // Jordan
    'NGN': '₦', // Nigeria
    'PHP': '₱', // Philippines
    'RUB': '₽', // Russia
    'LKR': '₨', // Sri Lanka
    'BRL': 'R$', // Brazil
    'VND': '₫', // Vietnam
    'MMK': 'K', // Myanmar
    'AZN': '₼', // Azerbaijan
    'RSD': 'дин.', // Serbia
    'HKD': 'HK$', // Hong Kong
    'PKR': '₨', // Pakistan
    'MCO': '€', // Monaco (uses Euro)
  };
  
  return symbols[currency] || currency;
}

/**
 * Gets the currency name for a given currency code
 * @param currency The currency code
 * @returns The currency name
 */
export function getCurrencyName(currency: string): string {
  const names: Record<string, string> = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'INR': 'Indian Rupee',
    'CAD': 'Canadian Dollar',
    'AUD': 'Australian Dollar',
    'JPY': 'Japanese Yen',
    'CHF': 'Swiss Franc',
    'SGD': 'Singapore Dollar',
    'CNY': 'Chinese Yuan',
    'BTN': 'Bhutanese Ngultrum',
    'AMD': 'Armenian Dram',
    'BYN': 'Belarusian Ruble',
    'GEL': 'Georgian Lari',
    'ILS': 'Israeli Shekel',
    'JOD': 'Jordanian Dinar',
    'NGN': 'Nigerian Naira',
    'PHP': 'Philippine Peso',
    'RUB': 'Russian Ruble',
    'LKR': 'Sri Lankan Rupee',
    'BRL': 'Brazilian Real',
    'VND': 'Vietnamese Dong',
    'MMK': 'Myanmar Kyat',
    'AZN': 'Azerbaijani Manat',
    'RSD': 'Serbian Dinar',
    'HKD': 'Hong Kong Dollar',
    'PKR': 'Pakistani Rupee',
    'MCO': 'Euro', // Monaco uses Euro
  };
  
  return names[currency] || currency;
}

/**
 * Gets the currency code for a given country
 * @param country The country name
 * @returns The currency code
 */
export function getCurrencyForCountry(country: string): string {
  const countryToCurrency: Record<string, string> = {
    'United States': 'USD',
    'India': 'INR',
    'Bhutan': 'BTN',
    'Armenia': 'AMD',
    'Belarus': 'BYN',
    'Georgia': 'GEL',
    'Israel': 'ILS',
    'Jordan': 'JOD',
    'Nigeria': 'NGN',
    'Philippines': 'PHP',
    'Russia': 'RUB',
    'Singapore': 'SGD',
    'Sri Lanka': 'LKR',
    'United Kingdom': 'GBP',
    'Austria': 'EUR',
    'Germany': 'EUR',
    'Hong Kong': 'HKD',
    'Serbia': 'RSD',
    'Brazil': 'BRL',
    'Greece': 'EUR',
    'Vietnam': 'VND',
    'Myanmar': 'MMK',
    'Azerbaijan': 'AZN',
    'Finland': 'EUR',
    'Netherlands': 'EUR',
    'Monaco': 'EUR',
    'Pakistan': 'PKR',
  };
  
  return countryToCurrency[country] || 'USD';
}

/**
 * Gets the currency code for a given country code
 * @param countryCode The country code (e.g., 'US', 'IN', 'SG')
 * @returns The currency code
 */
export function getCurrencyForCountryCode(countryCode: string): string {
  const countryCodeToCurrency: Record<string, string> = {
    'US': 'USD', // United States
    'IN': 'INR', // India
    'BT': 'BTN', // Bhutan
    'AM': 'AMD', // Armenia
    'BY': 'BYN', // Belarus
    'GE': 'GEL', // Georgia
    'IL': 'ILS', // Israel
    'JO': 'JOD', // Jordan
    'NG': 'NGN', // Nigeria
    'PH': 'PHP', // Philippines
    'RU': 'RUB', // Russia
    'SG': 'SGD', // Singapore
    'LK': 'LKR', // Sri Lanka
    'GB': 'GBP', // United Kingdom
    'AT': 'EUR', // Austria
    'DE': 'EUR', // Germany
    'HK': 'HKD', // Hong Kong
    'RS': 'RSD', // Serbia
    'BR': 'BRL', // Brazil
    'GR': 'EUR', // Greece
    'VN': 'VND', // Vietnam
    'MM': 'MMK', // Myanmar
    'AZ': 'AZN', // Azerbaijan
    'FI': 'EUR', // Finland
    'NL': 'EUR', // Netherlands
    'MC': 'EUR', // Monaco
    'PK': 'PKR', // Pakistan
  };
  
  return countryCodeToCurrency[countryCode] || 'USD';
}

/**
 * Gets country-specific professional titles for CA and CS equivalents
 * @param countryCode The country code (e.g., 'AT', 'IN', 'US')
 * @returns Object with caTitle and csTitle
 */
/**
 * Converts country code to full country name for display
 * @param countryCodeOrName The country code (e.g., "IN") or country name (e.g., "India")
 * @returns The full country name for display
 */
export function normalizeCountryNameForDisplay(countryCodeOrName: string | null | undefined): string {
  if (!countryCodeOrName) return 'Unknown';
  
  // Country code to full name mapping
  const codeToNameMap: Record<string, string> = {
    'US': 'United States',
    'IN': 'India',
    'GB': 'United Kingdom',
    'UK': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'SG': 'Singapore',
    'JP': 'Japan',
    'CN': 'China',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'EG': 'Egypt',
    'AE': 'UAE',
    'SA': 'Saudi Arabia',
    'IL': 'Israel',
    'AT': 'Austria',
    'HK': 'Hong Kong',
    'NL': 'Netherlands',
    'FI': 'Finland',
    'GR': 'Greece',
    'VN': 'Vietnam',
    'MM': 'Myanmar',
    'AZ': 'Azerbaijan',
    'RS': 'Serbia',
    'MC': 'Monaco',
    'PK': 'Pakistan',
    'PH': 'Philippines',
    'JO': 'Jordan',
    'GE': 'Georgia',
    'BY': 'Belarus',
    'AM': 'Armenia',
    'BT': 'Bhutan',
    'LK': 'Sri Lanka',
    'RU': 'Russia',
    'IT': 'Italy',
    'ES': 'Spain',
    'PT': 'Portugal',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'IE': 'Ireland',
    'NZ': 'New Zealand',
    'KR': 'South Korea',
    'TH': 'Thailand',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'BD': 'Bangladesh',
    'NP': 'Nepal'
  };
  
  // Check if it's already a full country name (exists in values)
  const isFullName = Object.values(codeToNameMap).includes(countryCodeOrName);
  if (isFullName) {
    return countryCodeOrName;
  }
  
  // Try to find by code (case-insensitive)
  const upperCode = countryCodeOrName.toUpperCase();
  return codeToNameMap[upperCode] || countryCodeOrName;
}

/**
 * Converts country name to country code
 * @param countryName The country name (e.g., "India", "United States")
 * @returns The country code (e.g., "IN", "US") or null if not found
 */
export function getCountryCodeFromName(countryName: string | null | undefined): string | null {
  if (!countryName) return null;
  
  // Country code to full name mapping (reverse lookup)
  const codeToNameMap: Record<string, string> = {
    'US': 'United States',
    'IN': 'India',
    'GB': 'United Kingdom',
    'UK': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'SG': 'Singapore',
    'JP': 'Japan',
    'CN': 'China',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'EG': 'Egypt',
    'AE': 'UAE',
    'SA': 'Saudi Arabia',
    'IL': 'Israel',
    'AT': 'Austria',
    'HK': 'Hong Kong',
    'NL': 'Netherlands',
    'FI': 'Finland',
    'GR': 'Greece',
    'VN': 'Vietnam',
    'MM': 'Myanmar',
    'AZ': 'Azerbaijan',
    'RS': 'Serbia',
    'MC': 'Monaco',
    'PK': 'Pakistan',
    'PH': 'Philippines',
    'JO': 'Jordan',
    'GE': 'Georgia',
    'BY': 'Belarus',
    'AM': 'Armenia',
    'BT': 'Bhutan',
    'LK': 'Sri Lanka',
    'RU': 'Russia',
    'IT': 'Italy',
    'ES': 'Spain',
    'PT': 'Portugal',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'IE': 'Ireland',
    'NZ': 'New Zealand',
    'KR': 'South Korea',
    'TH': 'Thailand',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'BD': 'Bangladesh',
    'NP': 'Nepal'
  };
  
  // Create reverse lookup
  const nameToCodeMap: Record<string, string> = {};
  Object.entries(codeToNameMap).forEach(([code, name]) => {
    nameToCodeMap[name.toLowerCase()] = code;
  });
  
  // Try to find by name (case-insensitive)
  const normalizedName = countryName.trim();
  const code = nameToCodeMap[normalizedName.toLowerCase()];
  if (code) return code;
  
  // If it's already a 2-letter code, return it
  if (normalizedName.length === 2 && codeToNameMap[normalizedName.toUpperCase()]) {
    return normalizedName.toUpperCase();
  }
  
  return null;
}

export function getCountryProfessionalTitles(countryCode: string): { caTitle: string; csTitle: string } {
  const professionalTitles: Record<string, { caTitle: string; csTitle: string }> = {
    'AT': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Austria
    'IN': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // India
    'US': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // United States
    'GB': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // United Kingdom
    'DE': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Germany
    'SG': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // Singapore
    'HK': { caTitle: 'CPA', csTitle: 'Company Secretary' }, // Hong Kong
    'NL': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Netherlands
    'FI': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Finland
    'GR': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Greece
    'BR': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Brazil
    'VN': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Vietnam
    'MM': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Myanmar
    'AZ': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Azerbaijan
    'RS': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Serbia
    'MC': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Monaco
    'PK': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // Pakistan
    'PH': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Philippines
    'NG': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // Nigeria
    'JO': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Jordan
    'IL': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Israel
    'GE': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Georgia
    'BY': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Belarus
    'AM': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Armenia
    'BT': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // Bhutan
    'LK': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // Sri Lanka
    'RU': { caTitle: 'Tax Advisor', csTitle: 'Management' }, // Russia
    // Additional countries
    'CA': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Canada
    'AU': { caTitle: 'CPA', csTitle: 'Company Secretary' }, // Australia
    'FR': { caTitle: 'Expert-Comptable', csTitle: 'Secrétaire Général' }, // France
    'JP': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Japan
    'CN': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // China
    'MX': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Mexico
    'ZA': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // South Africa
    'KE': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Kenya
    'EG': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Egypt
    'AE': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // UAE
    'SA': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Saudi Arabia
    'IT': { caTitle: 'Dottore Commercialista', csTitle: 'Segretario Generale' }, // Italy
    'ES': { caTitle: 'CPA', csTitle: 'Secretario General' }, // Spain
    'PT': { caTitle: 'CPA', csTitle: 'Secretário Geral' }, // Portugal
    'BE': { caTitle: 'Expert-Comptable', csTitle: 'Secrétaire Général' }, // Belgium
    'CH': { caTitle: 'Expert-Comptable', csTitle: 'Secrétaire Général' }, // Switzerland
    'SE': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Sweden
    'NO': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Norway
    'DK': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Denmark
    'IE': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Ireland
    'NZ': { caTitle: 'CPA', csTitle: 'Company Secretary' }, // New Zealand
    'KR': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // South Korea
    'TH': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Thailand
    'MY': { caTitle: 'CPA', csTitle: 'Company Secretary' }, // Malaysia
    'ID': { caTitle: 'CPA', csTitle: 'Corporate Secretary' }, // Indonesia
    'BD': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' }, // Bangladesh
    'NP': { caTitle: 'Chartered Accountant', csTitle: 'Company Secretary' } // Nepal
  };
  
  return professionalTitles[countryCode] || { caTitle: 'CA', csTitle: 'CS' };
}

