// Base URL for Supabase Edge Functions.
//
// Prefers VITE_SUPABASE_PROJECT_ID, but falls back to the project ref embedded
// in VITE_SUPABASE_URL. Without the fallback, an environment that sets the URL
// but not the project id builds fetches against https://undefined.supabase.co
// and every function call fails silently.

/** Pulls `abcdef` out of `https://abcdef.supabase.co`. */
export function deriveProjectRef(supabaseUrl: string | undefined): string | undefined {
  const host = supabaseUrl?.trim().replace(/^https?:\/\//, '').split('/')[0];
  return host ? host.split('.')[0] : undefined;
}

const projectId =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ||
  deriveProjectRef(import.meta.env.VITE_SUPABASE_URL as string | undefined);

export const FUNCTIONS_URL = `https://${projectId}.supabase.co/functions/v1`;
