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
        // Stage all changes, including untracked files
        await execTools.run('git', ['add', '-A'], cwd);
        // Only commit if there are changes
        const status = await gitTools.status(cwd);
        if (status.trim()) {
            await execTools.run('git', ['commit', '-m', message, '--no-verify'], cwd);
        }
    },
    checkout: async (cwd: string, branchOrHash: string): Promise<void> => {
        // Force checkout to ensure clean state if needed, but safe implies checking status first
        // ideally we stash or fail if dirty, but for upgrade agent we assume control
        await execTools.run('git', ['checkout', branchOrHash], cwd);
    },
    createBranch: async (cwd: string, branchName: string): Promise<void> => {
        await execTools.run('git', ['checkout', '-b', branchName], cwd);
    },
    getCurrentBranch: async (cwd: string): Promise<string> => {
        const raw = await execTools.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
        return raw.trim();
    },
    clean: async (cwd: string): Promise<void> => {
        // Hard reset to HEAD to discard changes
        await execTools.run('git', ['reset', '--hard'], cwd);
        await execTools.run('git', ['clean', '-fd'], cwd);
    }
};
