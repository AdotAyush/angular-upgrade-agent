// FILE: apps/cli/src/commands/upgrade.ts
import { Command } from 'commander';
import { Orchestrator, TaskDAG, SessionContext } from '../../../packages/core/index.js';
import { InMemoryStorage } from '../../../packages/storage/memory/index.js';
import { OpenAIAdapter } from '../../../packages/llm/adapters/openai.js';
import { BedrockAdapter } from '../../../packages/llm/adapters/bedrock.js';
import { GrokAdapter } from '../../../packages/llm/adapters/grok.js';
import { MockLLMAdapter } from '../../../packages/llm/adapters/mock.js';
import { KnowledgeBaseService } from '../../../packages/knowledge-base/service.js';
import { env } from '../env.js';
import * as path from 'path';

export const upgradeCommand = new Command('upgrade')
    .description('Upgrade an Angular project')
    .option('-t, --target <version>', 'Target Angular version', 'latest')
    .option('-d, --dry-run', 'Run without making changes', false)
    .option('--llm <provider>', 'LLM provider: openai, bedrock, or mock', 'openai')
    .option('--bedrock-region <region>', 'AWS Bedrock region', 'us-east-1')
    .action(async (options) => {
        console.log('🚀 Angular Upgrade Agent Starting...\n');

        // Initialize storage
        const storage = new InMemoryStorage();

        // Initialize LLM
        let llm;
        switch (options.llm) {
            case 'bedrock':
                console.log('Using AWS Bedrock (Claude 3)');
                llm = new BedrockAdapter(
                    options.bedrockRegion,
                    undefined, // use default model
                    // Pass credentials if they exist in env
                    (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) ? {
                        accessKeyId: env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
                    } : undefined
                );
                break;
            case 'grok':
                if (!env.GROK_API_KEY) {
                    console.error('❌ GROK_API_KEY not set.');
                    process.exit(1);
                }
                console.log('Using Grok (xAI)');
                llm = new GrokAdapter(env.GROK_API_KEY);
                break;
            case 'openai':
                if (!env.OPENAI_API_KEY) {
                    console.error('❌ OPENAI_API_KEY not set. Use --llm mock or set environment variable.');
                    process.exit(1);
                }
                llm = new OpenAIAdapter(env.OPENAI_API_KEY);
                console.log('Using OpenAI GPT-4');
                break;
            default:
                llm = new MockLLMAdapter();
                console.warn('⚠️  Using MOCK LLM - limited functionality\n');
        }

        // Initialize knowledge base
        const knowledgeBase = new KnowledgeBaseService(
            path.join(__dirname, '../../../packages/knowledge-base')
        );
        await knowledgeBase.loadAll();
        console.log('📚 Knowledge base loaded\n');

        // Create context and DAG
        const context = new SessionContext({
            projectRoot: process.cwd(),
            targetVersion: options.target,
            dryRun: options.dryRun,
            interactive: true
        });
        const dag = new TaskDAG();

        // Create orchestrator
        const orchestrator = new Orchestrator(dag, context, storage, llm, knowledgeBase);

        try {
            await orchestrator.init(process.cwd(), options.target);
            await orchestrator.run();
            console.log('\n✅ Upgrade completed successfully!');
        } catch (error: any) {
            console.error('\n❌ Upgrade failed:', error.message);
            process.exit(1);
        }
    });
