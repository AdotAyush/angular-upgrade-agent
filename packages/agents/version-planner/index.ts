// FILE: packages/agents/version-planner/index.ts
import { AgentContext, UpgradeTask } from '../../schemas/agentSchemas.js';
import { LLMAdapter } from '../../llm/index.js';
import * as semver from 'semver';
import { KnowledgeBaseService } from '../../knowledge-base/service.js';

export class VersionPlannerAgent {
    constructor(
        private llm: LLMAdapter,
        private knowledgeBase: KnowledgeBaseService
    ) { }

    async run(context: AgentContext): Promise<UpgradeTask[]> {
        const current = context.currentVersion || '16.0.0';
        const target = context.targetVersion || '18.0.0';

        console.log(`Planning upgrade path from ${current} to ${target}...`);

        // Calculate upgrade path using knowledge base
        const path = this.calculateUpgradePath(current, target);
        console.log(`Upgrade path: ${path.map(v => v.version).join(' -> ')}`);

        const tasks: UpgradeTask[] = [];
        let previousStepId: string | null = null;

        for (let i = 0; i < path.length; i++) {
            const version = path[i];
            const stepId = `upgrade-to-${version.version.replace(/\./g, '-')}`;

            // Environment check
            tasks.push({
                id: `${stepId}-env`,
                type: 'ENVIRONMENT_CHECK',
                description: `Verify environment for Angular ${version.version}`,
                dependencies: previousStepId ? [previousStepId] : [],
                status: 'PENDING',
                agent: 'EnvironmentAgent',
                data: {
                    targetVersion: version.version,
                    nodeRange: version.nodeRange,
                    typescriptRange: version.typescriptRange
                }
            });

            // Dependency upgrade
            tasks.push({
                id: `${stepId}-deps`,
                type: 'DEPENDENCY_UPGRADE',
                description: `Upgrade dependencies to Angular ${version.version}`,
                dependencies: [`${stepId}-env`],
                status: 'PENDING',
                agent: 'DependencyAgent',
                data: { targetVersion: version.version }
            });

            // Code migrations
            if (version.breakingChanges && version.breakingChanges.length > 0) {
                tasks.push({
                    id: `${stepId}-runtime`,
                    type: 'RUNTIME_FIX',
                    description: `Apply runtime fixes for ${version.version}`,
                    dependencies: [`${stepId}-deps`],
                    status: 'PENDING',
                    agent: 'RuntimeAgent',
                    data: { targetVersion: version.version, breakingChanges: version.breakingChanges }
                });

                tasks.push({
                    id: `${stepId}-router`,
                    type: 'ROUTER_FIX',
                    description: `Update router for ${version.version}`,
                    dependencies: [`${stepId}-runtime`],
                    status: 'PENDING',
                    agent: 'RouterAgent'
                });

                tasks.push({
                    id: `${stepId}-ui`,
                    type: 'UI_MIGRATION',
                    description: `Analyze and migrate UI templates for ${version.version}`,
                    dependencies: [`${stepId}-router`],
                    status: 'PENDING',
                    agent: 'UIAgent',
                    data: { targetVersion: version.version }
                });
            }

            // Build
            tasks.push({
                id: `${stepId}-build`,
                type: 'BUILD_FIX',
                description: `Build and fix errors for Angular ${version.version}`,
                dependencies: version.breakingChanges ? [`${stepId}-ui`] : [`${stepId}-deps`],
                status: 'PENDING',
                agent: 'BuildAgent'
            });

            // Tests
            tasks.push({
                id: `${stepId}-test`,
                type: 'TEST',
                description: `Run tests for ${version.version}`,
                dependencies: [`${stepId}-build`],
                status: 'PENDING',
                agent: 'TestAgent'
            });

            previousStepId = `${stepId}-test`;
        }

        // Final report
        tasks.push({
            id: 'final-report',
            type: 'REPORT',
            description: 'Generate upgrade report',
            dependencies: previousStepId ? [previousStepId] : [],
            status: 'PENDING',
            agent: 'ReportAgent'
        });

        return tasks;
    }

    private calculateUpgradePath(current: string, target: string): any[] {
        const currentMajor = semver.major(semver.coerce(current) || current);
        const targetMajor = semver.major(semver.coerce(target) || target);

        if (currentMajor === targetMajor) {
            // Same major version, direct upgrade
            return [this.knowledgeBase.getAngularVersion(target)].filter(Boolean);
        }

        // Get all versions in range
        const versions = this.knowledgeBase.getVersionRange(
            String(currentMajor),
            String(targetMajor)
        );

        // Filter to major versions only for step-by-step upgrade
        return versions.filter(v => {
            const major = semver.major(v.version);
            return major > currentMajor && major <= targetMajor;
        });
    }
}
