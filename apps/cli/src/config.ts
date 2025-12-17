// FILE: apps/cli/src/config.ts
import { z } from 'zod';

export const ConfigSchema = z.object({
    targetVersion: z.string().default('latest'),
    dryRun: z.boolean().default(false),
    interactive: z.boolean().default(true),
    verbose: z.boolean().default(false)
});

export type Config = z.infer<typeof ConfigSchema>;
