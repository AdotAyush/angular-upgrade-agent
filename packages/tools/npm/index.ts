// FILE: packages/tools/npm/index.ts
import { execTools } from '../exec/index.js';

export interface NPMInstallOptions {
    legacyPeerDeps?: boolean;
    force?: boolean;
    ignoreScripts?: boolean;
}

export const npmTools = {
    install: async (cwd: string, options: NPMInstallOptions = {}): Promise<void> => {
        const args = ['install'];
        if (options.legacyPeerDeps) args.push('--legacy-peer-deps');
        if (options.force) args.push('--force');
        if (options.ignoreScripts) args.push('--ignore-scripts');

        await execTools.run('npm', args, cwd);
    },

    installPackage: async (
        cwd: string,
        packageName: string,
        version?: string,
        dev = false,
        options: NPMInstallOptions = {}
    ): Promise<void> => {
        const args = ['install', version ? `${packageName}@${version}` : packageName];
        if (dev) args.push('--save-dev');
        if (options.legacyPeerDeps) args.push('--legacy-peer-deps');
        if (options.force) args.push('--force');

        await execTools.run('npm', args, cwd);
    },

    uninstallPackage: async (cwd: string, packageName: string): Promise<void> => {
        await execTools.run('npm', ['uninstall', packageName], cwd);
    },

    viewVersion: async (packageName: string): Promise<string> => {
        const output = await execTools.run('npm', ['view', packageName, 'version'], '.');
        return output.trim();
    },

    getPeerDependencies: async (packageName: string, version: string): Promise<Record<string, string>> => {
        try {
            const output = await execTools.run('npm', ['view', `${packageName}@${version}`, 'peerDependencies', '--json'], '.');
            return JSON.parse(output);
        } catch (e) {
            return {};
        }
    },

    list: async (cwd: string): Promise<any> => {
        const output = await execTools.run('npm', ['list', '--json', '--depth=0'], cwd);
        return JSON.parse(output);
    },

    audit: async (cwd: string, auditLevel: 'info' | 'low' | 'moderate' | 'high' | 'critical' = 'high'): Promise<any> => {
        try {
            const output = await execTools.run('npm', ['audit', '--json', `--audit-level=${auditLevel}`], cwd);
            return JSON.parse(output);
        } catch (e: any) {
            // npm audit returns non-zero if vulnerabilities found
            if (e.stdout) {
                try {
                    return JSON.parse(e.stdout);
                } catch {
                    return { vulnerabilities: {}, error: e.message };
                }
            }
            throw e;
        }
    }
};
