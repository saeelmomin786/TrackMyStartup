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
 * Generates a profile URL with slug
 * @param baseUrl - The base URL (window.location.origin + window.location.pathname)
 * @param view - The view type ('startup', 'mentor', 'investor', 'advisor')
 * @param id - The ID parameter name ('startupId', 'mentorId', 'investorId', 'advisorId', or 'userId')
 * @param idValue - The ID value
 * @param slug - The slug to include in the URL
 * @returns The complete URL with slug
 */
export function createProfileUrl(
  baseUrl: string,
  view: 'startup' | 'mentor' | 'investor' | 'advisor',
  id: string,
  idValue: string,
  slug: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('view', view);
  url.searchParams.set(id, idValue);
  
  // Add slug if provided
  if (slug) {
    url.searchParams.set('name', slug);
  }
  
  return url.toString();
}




