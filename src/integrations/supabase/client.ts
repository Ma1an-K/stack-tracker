import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ebfhvwadfazehvhevsle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZmh2d2FkZmF6ZWh2aGV2c2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDYyNjksImV4cCI6MjA4NTY4MjI2OX0.2ZqZJ5eORgXuCL-qztJWPGESrWfyBuLHyJBG3j4FzW8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});