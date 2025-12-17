// FILE: packages/llm/adapters/mock.ts
import { LLMAdapter } from '../index.js';
import { z } from 'zod';

export class MockLLMAdapter implements LLMAdapter {
    async complete(prompt: string, tools?: any[]): Promise<string> {
        if (tools && tools.length > 0) {
            // Return a dummy tool call to verify wiring
            return JSON.stringify([{ type: 'function', function: { name: 'readFile', arguments: '{"path": "package.json"}' } }]);
        }
        return "Mock response";
    }

    async completeJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
        // This requires us to fake data matching T, which is hard generically.
        // For now, throw or return 'any' cast if we assume the mock is only for simple tests.
        // In a real robust mock, we'd use a generative library like faker or similar.
        throw new Error("MockLLMAdapter.completeJson not implemented for generic schema");
    }
}
