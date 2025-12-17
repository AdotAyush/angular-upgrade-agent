// FILE: packages/llm/adapters/bedrock.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { LLMAdapter } from '../index.js';
import { z } from 'zod';

export class BedrockAdapter implements LLMAdapter {
    private client: BedrockRuntimeClient;
    private modelId: string;

    constructor(
        region: string = 'us-east-1',
        modelId: string = 'anthropic.claude-3-sonnet-20240229-v1:0',
        credentials?: { accessKeyId: string; secretAccessKey: string }
    ) {
        this.client = new BedrockRuntimeClient({
            region,
            credentials
        });
        this.modelId = modelId;
    }

    async complete(prompt: string, tools?: any[]): Promise<string> {
        // Claude 3 Messages API format
        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4096,
            messages: [
                { role: "user", content: prompt }
            ],
            // If tools are provided, we'd add them here. 
            // Note: Bedrock/Claude tool use syntax differs slightly from OpenAI, 
            // but for this implementation we'll focus on text generation or assume 
            // the prompt includes the tool definitions in text if using older models,
            // or map correctly for Claude 3 native tools.
            tools: tools ? this.mapToolsToClaude(tools) : undefined
        };

        const command = new InvokeModelCommand({
            modelId: this.modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        try {
            const response = await this.client.send(command);
            const decoded = new TextDecoder().decode(response.body);
            const json = JSON.parse(decoded);

            // Handle tool use response
            if (json.content && json.content.some((c: any) => c.type === 'tool_use')) {
                // In a real agent, we would execute the tool and loop back.
                // For this adapter interface, we might need to return a structured object.
                // For now, return the text content to satisfy interface or JSON string of tool use.
                return JSON.stringify(json.content);
            }

            return json.content[0]?.text || '';
        } catch (error) {
            console.error("Bedrock Invoke Error:", error);
            throw error;
        }
    }

    async completeJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
        // Claude is good at following instructions. We append the schema to the prompt.
        // Ideally we use tool_use with a "return_result" tool to force JSON.
        const schemaDesc = JSON.stringify(this.zodToJsonSchema(schema), null, 2);
        const enrichedPrompt = `${prompt}\n\nCheck your output against this JSON schema:\n${schemaDesc}\n\nRespond ONLY with valid JSON.`;

        const result = await this.complete(enrichedPrompt);
        try {
            // Extract JSON from potential markdown blocks
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : result;
            return JSON.parse(jsonStr);
        } catch (e) {
            throw new Error(`Failed to parse JSON from Bedrock response: ${result}`);
        }
    }

    private mapToolsToClaude(openaiTools: any[]): any[] {
        // Mapping logic from OpenAI format to Claude format
        return openaiTools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters
        }));
    }

    private zodToJsonSchema(schema: z.ZodType<any>): any {
        // Simplified internal converter or use 'zod-to-json-schema' library
        // For this snippet, we assume a basic description is enough for the LLM
        return { type: "object", description: "Schema validation required" };
    }
}
