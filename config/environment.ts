// Environment configuration for different deployment environments
export const environment = {
  // Development
  development: {
    siteUrl: 'http://localhost:5173',
    emailRedirectUrl: 'http://localhost:5173/complete-registration',
    passwordResetUrl: 'http://localhost:5173/reset-password',
    supabaseUrl: 'https://dlesebbmlrewsbmqvuza.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZXNlYmJtbHJld3NibXF2dXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTMxMTcsImV4cCI6MjA3MDEyOTExN30.zFTVSgL5QpVqEDc-nQuKbaG_3egHZEm-V17UvkOpFCQ'
  },
  
  // Production - UPDATED WITH ACTUAL DOMAIN
  production: {
    siteUrl: 'https://trackmystartup.com',
    emailRedirectUrl: 'https://trackmystartup.com/complete-registration',
    passwordResetUrl: 'https://trackmystartup.com/reset-password',
    supabaseUrl: 'https://dlesebbmlrewsbmqvuza.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZXNlYmJtbHJld3NibXF2dXphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTMxMTcsImV4cCI6MjA3MDEyOTExN30.zFTVSgL5QpVqEDc-nQuKbaG_3egHZEm-V17UvkOpFCQ'
  }
};

// Function to get current environment
export const getCurrentEnvironment = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    const hostname = window.location.hostname;
    // Force production for your domain and any Vercel preview under it
    if (host.endsWith('trackmystartup.com')) return 'production';
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
    return 'production';
  }
  return 'development';
};

// Function to get current config
export const getCurrentConfig = () => {
  const env = getCurrentEnvironment();
  return environment[env];
};
