/**
 * Utility functions for generating URL-friendly slugs from names
 */

/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function createSlug(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generates a SEO-friendly profile URL with slug in the path
 * @param baseUrl - The base URL (window.location.origin)
 * @param view - The view type ('startup', 'mentor', 'investor', 'advisor')
 * @param slug - The slug to include in the URL path
 * @param idValue - The ID value (optional, for backward compatibility)
 * @returns The complete URL with slug in path format: /startup/startup-name
 */
export function createProfileUrl(
  baseUrl: string,
  view: 'startup' | 'mentor' | 'investor' | 'advisor',
  slug: string,
  idValue?: string
): string {
  // Remove trailing slash from baseUrl
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  // Create SEO-friendly path-based URL
  // Format: /startup/startup-name or /mentor/mentor-name, etc.
  if (slug) {
    return `${cleanBaseUrl}/${view}/${slug}`;
  }
  
  // Fallback to query params if no slug (backward compatibility)
  const url = new URL(cleanBaseUrl);
  if (idValue) {
    const idParam = view === 'startup' ? 'startupId' : 
                   view === 'mentor' ? 'mentorId' : 
                   view === 'investor' ? 'investorId' : 
                   'advisorId';
    url.searchParams.set('view', view);
    url.searchParams.set(idParam, idValue);
  }
  return url.toString();
}

/**
 * Parses a URL path to extract profile type and slug
 * @param pathname - The pathname from window.location.pathname
 * @returns Object with view type and slug, or null if not a profile URL
 */
export function parseProfileUrl(pathname: string): { view: 'startup' | 'mentor' | 'investor' | 'advisor'; slug: string } | null {
  const pathParts = pathname.split('/').filter(part => part);
  
  if (pathParts.length >= 2) {
    const view = pathParts[0] as 'startup' | 'mentor' | 'investor' | 'advisor';
    const slug = pathParts[1];
    
    if (['startup', 'mentor', 'investor', 'advisor'].includes(view) && slug) {
      return { view, slug };
    }
  }
  
  return null;
}




