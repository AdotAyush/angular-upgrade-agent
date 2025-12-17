// FILE: packages/llm/adapters/openai.ts
import { OpenAI } from 'openai';
import { LLMAdapter } from '../index.js';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

export class OpenAIAdapter implements LLMAdapter {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }

    async complete(prompt: string, tools?: any[]): Promise<string> {
        return this.withRetry(async () => {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                tools: tools, // Pass tools if present
                tool_choice: tools ? 'auto' : undefined
            });

            const msg = response.choices[0].message;
            if (msg.tool_calls) {
                return JSON.stringify(msg.tool_calls); // Return tool calls as string for agent to parse
            }
            return msg.content || '';
        });
    }

    async completeJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
        return this.withRetry(async () => {
            const response = await this.client.beta.chat.completions.parse({
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                response_format: zodResponseFormat(schema as any, 'response'), // Force type for Zod schema
                temperature: 0,
            });

            if (!response.choices[0].message.parsed) {
                throw new Error('Failed to parse JSON response');
            }
            return response.choices[0].message.parsed;
        });
    }

    private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                if (error?.status === 429 || error?.status >= 500) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
    }
}
