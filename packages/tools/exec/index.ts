// FILE: packages/tools/exec/index.ts
import { execa } from 'execa';

export const execTools = {
    run: async (command: string, args: string[], cwd: string): Promise<string> => {
        const { stdout } = await execa(command, args, { cwd });
        return stdout;
    }
};

// FILE: packages/tools/git/index.ts
import { execTools } from '../exec/index.js';

export const gitTools = {
    isRepo: async (cwd: string): Promise<boolean> => {
        try {
            await execTools.run('git', ['rev-parse', '--is-inside-work-tree'], cwd);
            return true;
        } catch {
            return false;
        }
    },
    status: async (cwd: string): Promise<string> => {
        return execTools.run('git', ['status', '--porcelain'], cwd);
    },
    commit: async (cwd: string, message: string): Promise<void> => {
        await execTools.run('git', ['add', '.'], cwd);
        await execTools.run('git', ['commit', '-m', message], cwd);
    },
    checkout: async (cwd: string, branchOrHash: string): Promise<void> => {
        await execTools.run('git', ['checkout', branchOrHash], cwd);
    },
    createBranch: async (cwd: string, branchName: string): Promise<void> => {
        await execTools.run('git', ['checkout', '-b', branchName], cwd);
    }
};
