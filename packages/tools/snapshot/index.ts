// FILE: packages/tools/snapshot/index.ts
import { gitTools } from '../git/index.js';

export const snapshotTools = {
    create: async (cwd: string, name: string): Promise<string> => {
        const branchName = `snapshot/${name}-${Date.now()}`;
        await gitTools.createBranch(cwd, branchName);
        return branchName;
    },
    restore: async (cwd: string, snapshotId: string): Promise<void> => {
        await gitTools.checkout(cwd, snapshotId);
    }
};
