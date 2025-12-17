// FILE: packages/agents/build-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { angularTools } from '../../tools/index.js';
import { LLMAdapter } from '../../llm/index.js';
import { ToolExecutor, ToolCall } from '../../tools/executor.js';
import { toolDefinitions } from '../../tools/definitions.js';
import { BuildError } from '../../core/errors.js';

export class BuildAgent {
    constructor(
        private llm: LLMAdapter,
        private toolExecutor: ToolExecutor
    ) { }

    async run(context: AgentContext): Promise<void> {
        console.log('Starting Build Verification with Auto-Repair...');
        let healthy = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 3;

        while (!healthy && attempts < MAX_ATTEMPTS) {
            attempts++;
            try {
                await angularTools.ngBuild(context.projectRoot);
                console.log('✅ Build successful');
                healthy = true;
            } catch (error: any) {
                console.log(`❌ Build failed (Attempt ${attempts}/${MAX_ATTEMPTS})`);
                const errorLog = error.stdout || error.stderr || error.message || '';

                if (attempts >= MAX_ATTEMPTS) {
                    throw new BuildError(
                        `Build failed after ${MAX_ATTEMPTS} attempts`,
                        { lastError: errorLog.substring(0, 1000) }
                    );
                }

                // Attempt auto-repair
                console.log('Attempting autonomous repair...');
                await this.attemptRepair(context, errorLog);
            }
        }
    }

    private async attemptRepair(context: AgentContext, errorLog: string): Promise<void> {
        const prompt = `
Angular build failed. Analyze the error and use available tools to fix it.

ERROR LOG:
${errorLog.substring(0, 2000)}

Available tools: readFile, writeFile
Analyze the error, identify the problematic file, read it, and write the corrected version.
`;

        try {
            const response = await this.llm.complete(prompt, toolDefinitions);

            // Parse and execute tool calls
            const toolCalls = this.parseToolCalls(response);
            if (toolCalls.length > 0) {
                console.log(`Executing ${toolCalls.length} tool calls...`);
                const results = await this.toolExecutor.executeBatch(toolCalls);

                const successful = results.filter(r => r.success).length;
                console.log(`Tool execution: ${successful}/${results.length} successful`);
            } else {
                console.log(`LLM analysis: ${response.substring(0, 200)}...`);
            }
        } catch (e: any) {
            console.warn(`Auto-repair failed: ${e.message}`);
        }
    }

    private parseToolCalls(response: string): ToolCall[] {
        try {
            const parsed = JSON.parse(response);
            if (Array.isArray(parsed)) {
                return parsed.filter(call => call.type === 'function' && call.function);
            }
            return [];
        } catch {
            return [];
        }
    }
}
