// FILE: packages/tools/angular/index.ts
import { execTools } from '../exec/index.js';

export const angularTools = {
    ngUpdate: async (cwd: string, packages: string[], args: string[] = []): Promise<string> => {
        // e.g. ng update @angular/core @angular/cli
        return execTools.run('ng', ['update', ...packages, ...args], cwd);
    },
    ngBuild: async (cwd: string): Promise<string> => {
        return execTools.run('ng', ['build'], cwd);
    },
    ngTest: async (cwd: string): Promise<string> => {
        return execTools.run('ng', ['test', '--watch=false'], cwd);
    }
};
