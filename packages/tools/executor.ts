// FILE: packages/tools/executor.ts
import { fsTools } from './fs/index.js';
import { execTools } from './exec/index.js';
import { npmTools } from './npm/index.js';
import { gitTools } from './git/index.js';

export interface ToolCall {
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export class ToolExecutor {
    async execute(toolCall: ToolCall): Promise<any> {
        const { name, arguments: argsStr } = toolCall.function;
        let args: any;

        try {
            args = JSON.parse(argsStr);
        } catch (e) {
            throw new Error(`Invalid tool arguments JSON: ${argsStr}`);
        }

        switch (name) {
            case 'readFile':
                return await fsTools.readFile(args.path);

            case 'writeFile':
                await fsTools.writeFile(args.path, args.content);
                return { success: true, path: args.path };

            case 'runCommand':
                return await execTools.run(args.command, args.args || [], args.cwd || '.');

            case 'npmInstall':
                await npmTools.install(args.cwd);
                return { success: true };

            case 'gitCommit':
                await gitTools.commit(args.cwd, args.message);
                return { success: true };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    async executeBatch(toolCalls: ToolCall[]): Promise<any[]> {
        const results = [];
        for (const call of toolCalls) {
            try {
                const result = await this.execute(call);
                results.push({ success: true, result });
            } catch (error: any) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }
}
