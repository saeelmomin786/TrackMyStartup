/**
 * Service to resolve slugs to database IDs for SEO-friendly URLs
 */

import { supabase } from './supabase';
import { createSlug } from './slugUtils';

/**
 * Resolves a startup slug to a startup ID
 * @param slug - The slug from the URL
 * @returns The startup ID or null if not found
 */
export async function resolveStartupSlug(slug: string): Promise<number | null> {
  try {
    // Try startups_public view first (accessible to everyone)
    // This ensures it works for both authenticated and unauthenticated users
    let { data: startups, error } = await supabase
      .from('startups_public')
      .select('id, name');
    
    // If public view fails, try the full startups table (for authenticated users)
    if (error) {
      console.log('Public view query failed, trying startups table:', error);
      const result = await supabase
        .from('startups')
        .select('id, name');
      startups = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error('Error resolving startup slug:', error);
      return null;
    }
    
    if (!startups) return null;
    
    // Find startup where slug matches
    const matchingStartup = startups.find(startup => {
      const startupSlug = createSlug(startup.name);
      return startupSlug === slug;
    });
    
    if (matchingStartup) {
      return matchingStartup.id;
    }
    
    // If no match found, log for debugging
    console.log('No matching startup found for slug:', slug);
    console.log('Available startups:', startups.map(s => ({ id: s.id, name: s.name, slug: createSlug(s.name) })));
    
    return null;
  } catch (error) {
    console.error('Error resolving startup slug:', error);
    return null;
  }
}

/**
 * Resolves a mentor slug to a user_id
 * @param slug - The slug from the URL
 * @returns The user_id or null if not found
 */
export async function resolveMentorSlug(slug: string): Promise<string | null> {
  try {
    // If slug looks like an invalid identifier (like "mentorId"), return null
    // This will trigger a redirect in App.tsx
    if (slug.toLowerCase() === 'mentorid' || slug.toLowerCase() === 'mentor-id') {
      return null;
    }
    
    // Check if slug is a UUID (user_id format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(slug)) {
      // It's a UUID, try to find mentor by user_id
      const { data: mentor, error } = await supabase
        .from('mentor_profiles')
        .select('user_id, mentor_name')
        .eq('user_id', slug)
        .single();
      
      if (!error && mentor) {
        return mentor.user_id;
      }
      return null;
    }
    
    // Query mentor_profiles table
    const { data: mentors, error } = await supabase
      .from('mentor_profiles')
      .select('user_id, mentor_name');
    
    if (error) {
      console.error('Error resolving mentor slug:', error);
      return null;
    }
    
    if (!mentors) return null;
    
    // Find mentor where slug matches mentor_name
    const matchingMentor = mentors.find(mentor => {
      const mentorSlug = createSlug(mentor.mentor_name);
      return mentorSlug === slug;
    });
    
    return matchingMentor?.user_id || null;
  } catch (error) {
    console.error('Error resolving mentor slug:', error);
    return null;
  }
}

/**
 * Resolves an investor slug to a user_id
 * @param slug - The slug from the URL
 * @returns The user_id or null if not found
 */
export async function resolveInvestorSlug(slug: string): Promise<string | null> {
  try {
    // Query investor_profiles table
    const { data: investors, error } = await supabase
      .from('investor_profiles')
      .select('user_id, investor_name');
    
    if (error) {
      console.error('Error resolving investor slug:', error);
      return null;
    }
    
    if (!investors) return null;
    
    // Find investor where slug matches investor_name
    const matchingInvestor = investors.find(investor => {
      const investorSlug = createSlug(investor.investor_name);
      return investorSlug === slug;
    });
    
    return matchingInvestor?.user_id || null;
  } catch (error) {
    console.error('Error resolving investor slug:', error);
    return null;
  }
}

/**
 * Resolves an advisor slug to a user_id
 * @param slug - The slug from the URL
 * @returns The user_id or null if not found
 */
export async function resolveAdvisorSlug(slug: string): Promise<string | null> {
  try {
    // Query investment_advisor_profiles table
    // Use firm_name as primary identifier (as per user requirement)
    const { data: advisors, error } = await supabase
      .from('investment_advisor_profiles')
      .select('user_id, firm_name, advisor_name');
    
    if (error) {
      console.error('Error resolving advisor slug:', error);
      return null;
    }
    
    if (!advisors) return null;
    
    // Find advisor where slug matches firm_name (preferred) or advisor_name
    const matchingAdvisor = advisors.find(advisor => {
      const firmSlug = createSlug(advisor.firm_name);
      const advisorSlug = createSlug(advisor.advisor_name);
      return firmSlug === slug || advisorSlug === slug;
    });
    
    return matchingAdvisor?.user_id || null;
  } catch (error) {
    console.error('Error resolving advisor slug:', error);
    return null;
  }
}

/**
 * Resolves a slug to the appropriate ID based on view type
 * @param view - The profile type
 * @param slug - The slug from the URL
 * @returns The ID (number for startups, string for others) or null
 */
export async function resolveSlug(
  view: 'startup' | 'mentor' | 'investor' | 'advisor',
  slug: string
): Promise<number | string | null> {
  switch (view) {
    case 'startup':
      return await resolveStartupSlug(slug);
    case 'mentor':
      return await resolveMentorSlug(slug);
    case 'investor':
      return await resolveInvestorSlug(slug);
    case 'advisor':
      return await resolveAdvisorSlug(slug);
    default:
      return null;
  }
}

