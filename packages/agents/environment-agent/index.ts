// FILE: packages/agents/environment-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { execTools } from '../../tools/index.js';
import { EnvironmentError } from '../../core/errors.js';
import * as semver from 'semver';

export class EnvironmentAgent {
    async run(context: AgentContext, taskData?: any): Promise<void> {
        console.log('Checking environment compatibility...');

        const nodeVersion = await execTools.run('node', ['--version'], '.');
        const npmVersion = await execTools.run('npm', ['--version'], '.');

        const cleanNodeVersion = nodeVersion.trim().replace('v', '');
        const cleanNpmVersion = npmVersion.trim();

        console.log(`Node: ${cleanNodeVersion}, NPM: ${cleanNpmVersion}`);

        // Check against required ranges if provided
        if (taskData?.nodeRange) {
            if (!semver.satisfies(cleanNodeVersion, taskData.nodeRange)) {
                throw new EnvironmentError(
                    `Node version ${cleanNodeVersion} does not satisfy required range ${taskData.nodeRange}`,
                    { current: cleanNodeVersion, required: taskData.nodeRange }
                );
            }
        }

        // Check for git
        try {
            await execTools.run('git', ['--version'], '.');
        } catch (e) {
            throw new EnvironmentError('Git is not installed or not in PATH');
        }

        // Check for Angular CLI
        try {
            const ngVersion = await execTools.run('ng', ['version'], context.projectRoot);
            console.log(`Angular CLI detected`);
        } catch (e) {
            console.warn('Angular CLI not found globally. Will use npx.');
        }

        console.log('✅ Environment check passed');
    }
}
