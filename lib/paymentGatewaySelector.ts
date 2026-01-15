import { supabase } from './supabase';

/**
 * Payment Gateway Selector
 * Determines which payment gateway to use based on user's country
 * - Razorpay: For India
 * - PayAid: For all other countries
 */

export type PaymentGateway = 'razorpay' | 'stripe' | 'paypal';

/**
 * Indian country identifiers
 */
const INDIAN_COUNTRIES = [
  'India',
  'IN',
  'IND',
  'भारत',
  'Bharat',
  'Hindustan'
];

/**
 * Select payment gateway based on country
 * @param country - User's country name or code
 * @returns 'razorpay' for India, 'paypal' for others
 */
export function selectPaymentGateway(country: string | null | undefined): PaymentGateway {
  if (!country) {
    // Default to paypal if country is not specified
    return 'paypal';
  }

  const normalizedCountry = country.trim();
  
  // Check if country matches any Indian identifier
  const isIndia = INDIAN_COUNTRIES.some(indianCountry => 
    normalizedCountry.toLowerCase() === indianCountry.toLowerCase() ||
    normalizedCountry.toLowerCase().includes(indianCountry.toLowerCase())
  );

  return isIndia ? 'razorpay' : 'paypal';
}

/**
 * Get user's country from their profile
 * @param userId - User ID
 * @returns Country name or null
 */
export async function getUserCountry(userId: string): Promise<string | null> {
  try {
    // Skip user_profiles table - it seems to not exist or have RLS issues
    // Try to get country from startups table first (most reliable)
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .select('country, country_of_registration')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!startupError && startup) {
      // Check both country and country_of_registration columns
      if (startup.country) {
        return startup.country;
      }
      if (startup.country_of_registration) {
        return startup.country_of_registration;
      }
    }

    // Try to get country from user_subscriptions (if they have a subscription)
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('country')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subError && subscription?.country) {
      return subscription.country;
    }

    // Try to get from users table (if country column exists)
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('country')
        .eq('id', userId)
        .maybeSingle();

      if (!userError && user?.country) {
        return user.country;
      }
    } catch (userErr) {
      // Column might not exist, that's okay - silently continue
    }

    return null;
  } catch (error) {
    console.error('Error getting user country:', error);
    return null;
  }
}

/**
 * Get payment gateway for a specific user
 * @param userId - User ID
 * @returns Payment gateway type
 */
export async function getPaymentGatewayForUser(userId: string): Promise<PaymentGateway> {
  const country = await getUserCountry(userId);
  return selectPaymentGateway(country);
}

/**
 * Get currency for payment gateway
 * @param gateway - Payment gateway type
 * @returns Currency code
 */
export function getCurrencyForGateway(gateway: PaymentGateway): string {
  // Both gateways will use EUR for global plans
  // Razorpay can handle EUR, and PayAid will use EUR
  return 'EUR';
}

/**
 * Check if gateway supports currency
 * @param gateway - Payment gateway type
 * @param currency - Currency code
 * @returns True if supported
 */
export function isCurrencySupported(gateway: PaymentGateway, currency: string): boolean {
  if (currency === 'EUR') {
    return true; // Both gateways support EUR
  }
  
  if (gateway === 'razorpay') {
    // Razorpay supports INR and other currencies
    return ['INR', 'USD', 'EUR', 'GBP'].includes(currency);
  }
  
  if (gateway === 'stripe' || gateway === 'paypal') {
    // Stripe/PayPal support EUR and other international currencies
    return ['EUR', 'USD', 'GBP'].includes(currency);
  }
  
  return false;
}
