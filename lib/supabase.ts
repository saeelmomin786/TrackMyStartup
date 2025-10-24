import { createClient } from '@supabase/supabase-js'
import { getCurrentConfig } from '../config/environment'

// Get current environment configuration
const config = getCurrentConfig();

if (typeof window !== 'undefined' && window.location.host.endsWith('trackmystartup.com')) {
  // Suppress noisy logs in production
} else {
  // Keep logs in development
  // eslint-disable-next-line no-console
  console.log('Current environment config:', config);
}

// Custom storage implementation that doesn't trigger on window focus
const customStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
    }
  }
};

// Avoid multiple clients in the same browser context
const globalAny = window as any;
if (!globalAny.__supabaseClient) {
  globalAny.__supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'supabase-auth',
      autoRefreshToken: true, // Enable automatic token refresh for proper authentication
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Use custom storage to prevent window focus triggers
      storage: customStorage,
      // Disable debug mode to reduce unnecessary events
      debug: false
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.38.0'
      }
    },
    db: {
      schema: 'public'
    }
  });
}

export const supabase = globalAny.__supabaseClient as ReturnType<typeof createClient>;

if (!(typeof window !== 'undefined' && window.location.host.endsWith('trackmystartup.com'))) {
  console.log('Supabase client initialized successfully');
  console.log('Email redirect URL:', config.emailRedirectUrl);
}

// Types for our database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'Investor' | 'Startup' | 'CA' | 'CS' | 'Admin' | 'Startup Facilitation Center'
          startup_name?: string
          center_name?: string
          registration_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'Investor' | 'Startup' | 'CA' | 'CS' | 'Admin' | 'Startup Facilitation Center'
          startup_name?: string
          center_name?: string
          registration_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'Investor' | 'Startup' | 'CA' | 'CS' | 'Admin' | 'Startup Facilitation Center'
          startup_name?: string
          center_name?: string
          registration_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      startups: {
        Row: {
          id: number
          name: string
          investment_type: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Bridge'
          investment_value: number
          equity_allocation: number
          current_valuation: number
          compliance_status: 'Compliant' | 'Pending' | 'Non-Compliant'
          sector: string
          total_funding: number
          total_revenue: number
          registration_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          investment_type: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Bridge'
          investment_value: number
          equity_allocation: number
          current_valuation: number
          compliance_status?: 'Compliant' | 'Pending' | 'Non-Compliant'
          sector: string
          total_funding: number
          total_revenue: number
          registration_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          investment_type?: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Bridge'
          investment_value?: number
          equity_allocation?: number
          current_valuation?: number
          compliance_status?: 'Compliant' | 'Pending' | 'Non-Compliant'
          sector?: string
          total_funding?: number
          total_revenue?: number
          registration_date?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}