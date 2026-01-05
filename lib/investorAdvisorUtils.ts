import { extractDomainFromUrl } from '../config/investorAdvisorDomains';
import { supabase } from './supabase';

/**
 * Get investment advisor code from domain by querying the database
 * This function queries the database to find which advisor's domain matches
 * and returns their investment_advisor_code.
 * 
 * @param domain - The domain to look up (e.g., "sarvesh.trackmystartup.com")
 * @returns The investment advisor code if found, null otherwise
 */
export async function getAdvisorCodeFromDomain(domain: string): Promise<string | null> {
  if (!domain || typeof window === 'undefined') return null;
  
  try {
    // Normalize domain: remove protocol, www, trailing slashes, and convert to lowercase
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '') // Remove http:// or https://
      .replace(/^www\./, '') // Remove www.
      .replace(/\/.*$/, '') // Remove path
      .trim();
    
    if (!normalizedDomain) return null;
    
    console.log('🔍 Looking up advisor code for domain:', normalizedDomain);
    
    // First try user_profiles table (new multi-profile system)
    // Query with case-insensitive matching
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('investment_advisor_code, investor_advisor_domain')
      .eq('role', 'Investment Advisor')
      .not('investment_advisor_code', 'is', null)
      .not('investor_advisor_domain', 'is', null)
      .ilike('investor_advisor_domain', normalizedDomain);
    
    if (!profileError && profileData && profileData.length > 0) {
      const matchedProfile = profileData[0];
      console.log('✅ Found advisor code in user_profiles:', matchedProfile.investment_advisor_code);
      return matchedProfile.investment_advisor_code;
    }
    
    // Also check for base domain match (e.g., if normalizedDomain is subdomain)
    const domainParts = normalizedDomain.split('.');
    if (domainParts.length >= 2) {
      const baseDomain = domainParts.slice(-2).join('.');
      const { data: baseProfileData, error: baseProfileError } = await supabase
        .from('user_profiles')
        .select('investment_advisor_code, investor_advisor_domain')
        .eq('role', 'Investment Advisor')
        .not('investment_advisor_code', 'is', null)
        .not('investor_advisor_domain', 'is', null)
        .ilike('investor_advisor_domain', baseDomain);
      
      if (!baseProfileError && baseProfileData && baseProfileData.length > 0) {
        const matchedProfile = baseProfileData[0];
        console.log('✅ Found advisor code in user_profiles (base domain match):', matchedProfile.investment_advisor_code);
        return matchedProfile.investment_advisor_code;
      }
    }
    
    // Fallback to users table (old system)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('investment_advisor_code, investor_advisor_domain')
      .eq('role', 'Investment Advisor')
      .not('investment_advisor_code', 'is', null)
      .not('investor_advisor_domain', 'is', null)
      .ilike('investor_advisor_domain', normalizedDomain);
    
    if (!userError && userData && userData.length > 0) {
      const matchedUser = userData[0];
      console.log('✅ Found advisor code in users table:', matchedUser.investment_advisor_code);
      return matchedUser.investment_advisor_code;
    }
    
    // Check base domain in users table
    if (domainParts.length >= 2) {
      const baseDomain = domainParts.slice(-2).join('.');
      const { data: baseUserData, error: baseUserError } = await supabase
        .from('users')
        .select('investment_advisor_code, investor_advisor_domain')
        .eq('role', 'Investment Advisor')
        .not('investment_advisor_code', 'is', null)
        .not('investor_advisor_domain', 'is', null)
        .ilike('investor_advisor_domain', baseDomain);
      
      if (!baseUserError && baseUserData && baseUserData.length > 0) {
        const matchedUser = baseUserData[0];
        console.log('✅ Found advisor code in users table (base domain match):', matchedUser.investment_advisor_code);
        return matchedUser.investment_advisor_code;
      }
    }
    
    console.log('⚠️ No advisor found for domain:', normalizedDomain);
    return null;
  } catch (error) {
    console.error('❌ Error looking up advisor code from domain:', error);
    return null;
  }
}

/**
 * Get investment advisor code from referrer domain
 * This function checks the document.referrer to determine if the user
 * came from an investor advisor domain and returns the corresponding code.
 * 
 * @returns The investment advisor code if found, null otherwise
 */
export async function getAdvisorCodeFromReferrer(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const referrer = document.referrer;
  if (!referrer) return null;
  
  const domain = extractDomainFromUrl(referrer);
  if (!domain) return null;
  
  return await getAdvisorCodeFromDomain(domain);
}

/**
 * Get investment advisor code from current domain
 * This function checks the current window.location.hostname to determine
 * if the user is on an investor advisor domain.
 * 
 * @returns The investment advisor code if found, null otherwise
 */
export async function getAdvisorCodeFromCurrentDomain(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  if (!hostname) return null;
  
  // Skip localhost and main domain
  if (hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.includes('localhost:') ||
      hostname === 'trackmystartup.com' ||
      hostname === 'www.trackmystartup.com') {
    return null;
  }
  
  const domain = extractDomainFromUrl(hostname);
  if (!domain) return null;
  
  return await getAdvisorCodeFromDomain(domain);
}

/**
 * Get investment advisor code from URL query parameter
 * This function checks if an advisorCode is passed as a URL parameter.
 * 
 * @returns The investment advisor code if found, null otherwise
 */
export function getAdvisorCodeFromQueryParam(): string | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const advisorCode = urlParams.get('advisorCode') || urlParams.get('advisor_code');
  
  return advisorCode ? advisorCode.trim() : null;
}

/**
 * Get investment advisor code from multiple sources
 * Checks in order: URL query param, referrer domain, current domain
 * 
 * @returns The investment advisor code if found, null otherwise
 * @note This is now async because it queries the database
 */
export async function getInvestmentAdvisorCode(): Promise<string | null> {
  // Priority 1: Check URL query parameter (synchronous, no DB query needed)
  const queryCode = getAdvisorCodeFromQueryParam();
  if (queryCode) {
    console.log('📋 Investment Advisor Code from query param:', queryCode);
    return queryCode;
  }
  
  // Priority 2: Check referrer domain (async - queries database)
  const referrerCode = await getAdvisorCodeFromReferrer();
  if (referrerCode) {
    console.log('🔗 Investment Advisor Code from referrer:', referrerCode);
    return referrerCode;
  }
  
  // Priority 3: Check current domain (async - queries database)
  const currentDomainCode = await getAdvisorCodeFromCurrentDomain();
  if (currentDomainCode) {
    console.log('🌐 Investment Advisor Code from current domain:', currentDomainCode);
    return currentDomainCode;
  }
  
  return null;
}

