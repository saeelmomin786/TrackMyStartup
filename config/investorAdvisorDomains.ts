/**
 * Domain to Investment Advisor Code Mapping
 * 
 * This file maps investor advisor domains to their corresponding investment advisor codes.
 * When a user registers from one of these domains, the investment advisor code will be
 * automatically set for that user.
 * 
 * Format: domain (without protocol) -> investment advisor code
 * Example: "mulsetu.com" -> "IA-XXXXXX"
 * 
 * HOW TO FIND ADVISOR CODES:
 * 1. Run the SQL query in FIND_INVESTMENT_ADVISOR_CODES.sql to find advisor codes
 * 2. Search by advisor name, email, or firm name
 * 3. Copy the investment_advisor_code value and add it to the mapping below
 * 
 * Example:
 * - Advisor: Sarvesh
 * - Domain: sarvesh.trackmystartup.com or sarvesh.com
 * - Code from database: IA-ABC123
 * - Mapping: 'sarvesh.trackmystartup.com': 'IA-ABC123'
 */

export const INVESTOR_ADVISOR_DOMAIN_MAP: Record<string, string> = {
  // Example mapping - replace with actual domains and codes
  // Format: 'domain.com': 'INVESTMENT_ADVISOR_CODE'
  
  // Example: Mulsetu advisor
  'mulsetu.com': 'INVESTOR123', // ⚠️ Replace with actual code from database
  
  // Example: Sarvesh advisor
  // 'sarvesh.trackmystartup.com': 'IA-XXXXXX', // ⚠️ Find code using FIND_INVESTMENT_ADVISOR_CODES.sql
  // 'sarvesh.com': 'IA-XXXXXX', // If they have their own domain
  
  // Add more mappings here as needed
  // Note: Investment Advisor codes typically follow the format IA-XXXXXX
  // but you can use any code format that matches your system
  // 
  // Steps to add a new mapping:
  // 1. Find the advisor's code using FIND_INVESTMENT_ADVISOR_CODES.sql
  // 2. Get their domain/subdomain (e.g., 'advisor.trackmystartup.com' or 'advisor.com')
  // 3. Add the mapping: 'domain.com': 'IA-XXXXXX'
};

/**
 * Get investment advisor code from domain
 * @param domain - The domain name (e.g., "mulsetu.com")
 * @returns The investment advisor code if found, null otherwise
 */
export function getAdvisorCodeFromDomain(domain: string): string | null {
  if (!domain) return null;
  
  // Normalize domain: remove protocol, www, trailing slashes, and convert to lowercase
  const normalizedDomain = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove http:// or https://
    .replace(/^www\./, '') // Remove www.
    .replace(/\/.*$/, '') // Remove path
    .trim();
  
  // Direct match
  if (INVESTOR_ADVISOR_DOMAIN_MAP[normalizedDomain]) {
    return INVESTOR_ADVISOR_DOMAIN_MAP[normalizedDomain];
  }
  
  // Check for subdomain matches (e.g., "www.mulsetu.com" should match "mulsetu.com")
  const domainParts = normalizedDomain.split('.');
  if (domainParts.length >= 2) {
    const baseDomain = domainParts.slice(-2).join('.'); // Get last two parts (e.g., "mulsetu.com")
    if (INVESTOR_ADVISOR_DOMAIN_MAP[baseDomain]) {
      return INVESTOR_ADVISOR_DOMAIN_MAP[baseDomain];
    }
  }
  
  return null;
}

/**
 * Extract domain from a URL
 * @param url - The full URL or domain string
 * @returns The normalized domain name
 */
export function extractDomainFromUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    // If it's already a domain (no protocol), use it directly
    if (!url.includes('://')) {
      return url.toLowerCase().replace(/^www\./, '').trim();
    }
    
    // Parse as URL to extract hostname
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase().replace(/^www\./, '');
  } catch (e) {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    return match ? match[1].toLowerCase().replace(/^www\./, '') : null;
  }
}

