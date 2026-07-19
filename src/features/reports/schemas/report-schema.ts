import { z } from 'zod';

/**
 * Zod validation schema representing policy review claims.
 */
export const reportSchema = z.object({
  claim: z.enum(['allowed', 'not_allowed', 'outdoor_only']),
  notes: z
    .string()
    .max(100, 'Notes must be less than 100 characters')
    .nullable()
    .optional(),
});

export type ReportFormData = z.infer<typeof reportSchema>;
