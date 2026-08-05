/**
 * Supabase Frontend Configuration — Team Pulse
 * 
 * Contains only public client credentials (project URL and publishable anon key).
 * SECURITY NOTICE: NEVER place a Supabase service-role key in frontend code.
 */
export const SUPABASE_CONFIG = Object.freeze({
  // Replace these placeholder values with your actual Supabase project credentials
  supabaseUrl: 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
});

/**
 * Returns true if valid, non-placeholder Supabase credentials are configured.
 */
export function isBackendConfigured() {
  return (
    typeof SUPABASE_CONFIG.supabaseUrl === 'string' &&
    SUPABASE_CONFIG.supabaseUrl.startsWith('https://') &&
    !SUPABASE_CONFIG.supabaseUrl.includes('YOUR_SUPABASE_PROJECT_ID') &&
    typeof SUPABASE_CONFIG.supabaseAnonKey === 'string' &&
    SUPABASE_CONFIG.supabaseAnonKey.length > 20 &&
    !SUPABASE_CONFIG.supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );
}
