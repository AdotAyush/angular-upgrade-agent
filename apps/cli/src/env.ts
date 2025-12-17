// FILE: apps/cli/src/env.ts
import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
    OPENAI_API_KEY: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    GROK_API_KEY: z.string().optional(),
    DEBUG: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
