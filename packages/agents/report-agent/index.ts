// FILE: packages/agents/report-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { fsTools } from '../../tools/index.js';
import { StorageAdapter } from '../../storage/index.js';

export class ReportAgent {
    constructor(private storage?: StorageAdapter) { }

    async run(context: AgentContext): Promise<void> {
        console.log('Generating upgrade report...');

        // Gather all completed tasks
        const tasks = this.storage ? await this.storage.getAllTasks() : [];

        const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
        const failedTasks = tasks.filter(t => t.status === 'FAILED');

        const report = `# Angular Upgrade Report

## Summary
- **Target Version**: ${context.targetVersion}
- **Project**: ${context.projectRoot}
- **Date**: ${new Date().toISOString()}

## Results
- ✅ Completed Tasks: ${completedTasks.length}
- ❌ Failed Tasks: ${failedTasks.length}
- Total Tasks: ${tasks.length}

## Completed Tasks
${completedTasks.map(t => `- [x] ${t.description} (${t.agent})`).join('\n')}

${failedTasks.length > 0 ? `## Failed Tasks
${failedTasks.map(t => `- [ ] ${t.description} (${t.agent})`).join('\n')}` : ''}

## Recommendations
${this.generateRecommendations(context, failedTasks)}
`;

        const reportPath = `${context.projectRoot}/UPGRADE_REPORT.md`;
        await fsTools.writeFile(reportPath, report);
        console.log(`✅ Report generated: ${reportPath}`);
    }

    private generateRecommendations(context: AgentContext, failedTasks: any[]): string {
        if (failedTasks.length === 0) {
            return '- Upgrade completed successfully\n- Run `npm test` to verify all tests pass\n- Review breaking changes in your application code';
        }

        return failedTasks.map(t =>
            `- Review and fix: ${t.description}`
        ).join('\n');
    }
}
