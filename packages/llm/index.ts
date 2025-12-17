// FILE: packages/llm/index.ts
import { z } from 'zod';

export interface LLMAdapter {
    /**
     * Complete a prompt
     * @param prompt The prompt to complete
     * @param tools Optional list of tools (OpenAI format)
     */
    complete(prompt: string, tools?: any[]): Promise<string>;

    /**
     * Complete a prompt and return a structured JSON object
     */
    completeJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T>;
}

export * from './adapters/openai.js';
export * from './adapters/bedrock.js';
export * from './adapters/mock.js';
export * from './adapters/grok.js';
