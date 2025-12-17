// FILE: packages/agents/router-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { tsTools } from '../../tools/index.js';
import { SyntaxKind, StringLiteral } from 'ts-morph';

export class RouterAgent {
    async run(context: AgentContext): Promise<void> {
        console.log('Running Router migrations...');
        const project = tsTools.createProject(`${context.projectRoot}/tsconfig.json`);

        const sourceFiles = project.getSourceFiles();
        let madeChanges = false;

        for (const file of sourceFiles) {
            // Find loadChildren: '...'
            // This is simplified. Doing this robustly requires finding Route objects.
            // We look for PropertyAssignment with name 'loadChildren' and initializer StringLiteral

            const assignments = file.getDescendantsOfKind(SyntaxKind.PropertyAssignment);

            for (const assignment of assignments) {
                if (assignment.getName() === 'loadChildren') {
                    const initializer = assignment.getInitializer();
                    if (initializer && initializer.getKind() === SyntaxKind.StringLiteral) {
                        const oldPath = (initializer as StringLiteral).getLiteralValue();
                        // oldPath: './module/foo.module#FooModule'
                        const [pathPart, moduleName] = oldPath.split('#');

                        const newCode = `() => import('${pathPart}').then(m => m.${moduleName})`;
                        assignment.setInitializer(newCode);
                        console.log(`Migrated loadChildren in ${file.getFilePath()}`);
                        madeChanges = true;
                    }
                }
            }

            if (madeChanges) {
                await file.save();
            }
        }

        if (madeChanges) {
            console.log('Router migration completed successfully.');
        } else {
            console.log('No deprecated router configurations found.');
        }
    }
}
