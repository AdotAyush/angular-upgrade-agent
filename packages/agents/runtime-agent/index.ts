// FILE: packages/agents/runtime-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { tsTools } from '../../tools/index.js';
import { SyntaxKind } from 'ts-morph';
import { KnowledgeBaseService } from '../../knowledge-base/service.js';

export class RuntimeAgent {
    constructor(private knowledgeBase: KnowledgeBaseService) { }

    async run(context: AgentContext, taskData?: any): Promise<void> {
        console.log('Running Runtime compatibility transformations...');
        const project = tsTools.createProject(`${context.projectRoot}/tsconfig.json`);

        const sourceFiles = project.getSourceFiles();
        let changeCount = 0;

        for (const file of sourceFiles) {
            // Skip node_modules
            if (file.getFilePath().includes('node_modules')) continue;

            // Fix 1: Remove deprecated moduleId from @Component
            changeCount += await this.removeModuleId(file);

            // Fix 2: Remove entryComponents (deprecated in Ivy)
            changeCount += await this.removeEntryComponents(file);

            // Fix 3: Update deprecated lifecycle hooks
            changeCount += await this.updateLifecycleHooks(file);

            if (changeCount > 0) {
                await file.save();
            }
        }

        console.log(`✅ Applied ${changeCount} runtime fixes`);
    }

    private async removeModuleId(file: any): Promise<number> {
        let count = 0;
        const decorators = file.getDescendantsOfKind(SyntaxKind.Decorator);

        for (const deco of decorators) {
            if (deco.getName() === 'Component') {
                const args = deco.getArguments();
                if (args.length > 0 && args[0].getKind() === SyntaxKind.ObjectLiteralExpression) {
                    const obj = args[0].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
                    const moduleIdProp = obj.getProperty('moduleId');
                    if (moduleIdProp) {
                        moduleIdProp.remove();
                        count++;
                    }
                }
            }
        }
        return count;
    }

    private async removeEntryComponents(file: any): Promise<number> {
        let count = 0;
        const decorators = file.getDescendantsOfKind(SyntaxKind.Decorator);

        for (const deco of decorators) {
            if (deco.getName() === 'NgModule') {
                const args = deco.getArguments();
                if (args.length > 0 && args[0].getKind() === SyntaxKind.ObjectLiteralExpression) {
                    const obj = args[0].asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
                    const entryComponentsProp = obj.getProperty('entryComponents');
                    if (entryComponentsProp) {
                        entryComponentsProp.remove();
                        count++;
                    }
                }
            }
        }
        return count;
    }

    private async updateLifecycleHooks(file: any): Promise<number> {
        // Placeholder for lifecycle hook updates
        // e.g., ngOnChanges, ngDoCheck patterns that changed
        return 0;
    }
}
