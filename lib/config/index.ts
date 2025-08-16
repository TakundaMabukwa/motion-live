/**
 * Application configuration
 * Central place for all environment variables and configuration settings
 */
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  mapbox: {
    token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  },
  app: {
    name: 'Motion Live',
    version: '1.0.0',
  }
};

export default config;
