// FILE: packages/llm/adapters/grok.ts
import OpenAI from 'openai';
import { LLMAdapter } from '../index.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class GrokAdapter implements LLMAdapter {
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, model: string = 'grok-beta') {
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.x.ai/v1' // Grok/xAI API endpoint
        });
        this.model = model;
    }

    async complete(prompt: string, tools?: any[]): Promise<string> {
        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                tools: tools,
                tool_choice: tools ? 'auto' : undefined
            });

            const message = completion.choices[0].message;

            // Handle tool calls
            if (message.tool_calls) {
                // OpenAI SDK returns objects, we return JSON string of them akin to our other adapters
                // or just the raw tool calls array if the caller expects that.
                // Our ToolExecutor expects a string response that *contains* JSON, 
                // or the Orchestrator logic handles parsing. 
                // Let's standardise on returning a JSON string of the tool calls array.
                return JSON.stringify(message.tool_calls);
            }

            return message.content || '';
        } catch (error) {
            console.error('Grok API Error:', error);
            throw error;
        }
    }

    async completeJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
        // Grok beta might not support strict JSON mode yet, so we use the prompt engineering approach
        const jsonSchema = zodToJsonSchema(schema);
        const schemaString = JSON.stringify(jsonSchema, null, 2);

        const systemPrompt = `You are a strict JSON generator. Output only valid JSON matching this schema:\n${schemaString}`;

        try {
            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                model: this.model,
                response_format: { type: 'json_object' } // Try json_object if supported
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error('Empty response from Grok');

            return JSON.parse(content);
        } catch (error) {
            console.warn('Grok JSON parse failed or API error, falling back to text parsing:', error);
            // Fallback: try standard completion and extracting JSON
            const fallback = await this.complete(`${prompt}\n\nRespond ONLY with valid JSON matching:\n${schemaString}`);
            try {
                const match = fallback.match(/\{[\s\S]*\}/);
                return JSON.parse(match ? match[0] : fallback);
            } catch (e) {
                throw new Error(`Failed to parse JSON from Grok response`);
            }
        }
    }
}
