import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

// Database interface skeleton to be populated later with actual generated types
export interface Database {
  public: {
    Tables: {
      [key: string]: any;
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      [key: string]: any;
    };
  };
}

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);
