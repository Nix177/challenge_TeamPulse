/**
 * Supabase Frontend Configuration — Team Pulse
 * 
 * Contains ONLY public client credentials (project URL and publishable key).
 * SECURITY NOTICE: NEVER place a Supabase service-role key or database secret in frontend code.
 */
export const SUPABASE_CONFIG = Object.freeze({
  supabaseUrl: 'https://qsfcfqstvmmyqchlrkhk.supabase.co',
  supabasePublishableKey: 'sb_publishable_yPlrdLevpZxNkpQxMG3qxA_MWIjF0zA',
});

/**
 * Returns true if valid, non-placeholder Supabase public credentials are configured.
 * @returns {boolean}
 */
export function isBackendConfigured() {
  return (
    typeof SUPABASE_CONFIG.supabaseUrl === 'string' &&
    SUPABASE_CONFIG.supabaseUrl.startsWith('https://') &&
    !SUPABASE_CONFIG.supabaseUrl.includes('YOUR_SUPABASE_PROJECT_ID') &&
    typeof SUPABASE_CONFIG.supabasePublishableKey === 'string' &&
    SUPABASE_CONFIG.supabasePublishableKey.length > 20 &&
    !SUPABASE_CONFIG.supabasePublishableKey.includes('YOUR_SUPABASE_PUBLISHABLE_KEY')
  );
}
