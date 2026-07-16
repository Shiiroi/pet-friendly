import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY must not be empty'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY must not be empty'),
  VITE_ENFORCE_GEOFENCE: z.preprocess((val) => val === 'true', z.boolean()).default(false),
});

const parseEnv = () => {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_ENFORCE_GEOFENCE: import.meta.env.VITE_ENFORCE_GEOFENCE,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMsg = Object.entries(errors)
      .map(([key, val]) => `  ${key}: ${val?.join(', ')}`)
      .join('\n');
    
    throw new Error(
      `[Env Validation Failed] Missing or invalid environment variables:\n${errorMsg}`
    );
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
