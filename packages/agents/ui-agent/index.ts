// FILE: packages/agents/ui-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { fsTools } from '../../tools/index.js';
import * as path from 'path';

interface UIIssue {
    file: string;
    line: number;
    type: 'style' | 'template' | 'dependency';
    message: string;
    severity: 'warning' | 'suggestion';
}

export class UIAgent {
    async run(context: AgentContext): Promise<void> {
        console.log('🎨 Running UI Analysis...');
        const issues: UIIssue[] = [];

        // Scan for styles
        await this.scanStyles(context.projectRoot, issues);

        // Scan for template issues
        await this.scanTemplates(context.projectRoot, context.targetVersion, issues);

        // Report findings
        if (issues.length > 0) {
            console.log(`\nFound ${issues.length} UI related suggestions/warnings:`);
            this.groupAndReport(issues);
        } else {
            console.log('✅ No specific UI issues found.');
        }
    }

    private async scanStyles(projectRoot: string, issues: UIIssue[]): Promise<void> {
        console.log('   Scanning styles for legacy selectors...');

        // Look for ::ng-deep and /deep/
        const deepMatches = await fsTools.searchFiles(
            path.join(projectRoot, 'src'),
            '::ng-deep|/deep/',
            ['*.scss', '*.css', '*.less']
        );

        for (const match of deepMatches) {
            issues.push({
                file: match.file,
                line: match.line,
                type: 'style',
                message: 'Avoid using ::ng-deep or /deep/ as it is deprecated and will be removed.',
                severity: 'warning'
            });
        }
    }

    private async scanTemplates(projectRoot: string, targetVersion: string, issues: UIIssue[]): Promise<void> {
        console.log('   Scanning templates...');

        const targetMajor = parseInt(targetVersion.split('.')[0]);

        // Check for Flex Layout
        const flexMatches = await fsTools.searchFiles(
            path.join(projectRoot, 'src'),
            'fxLayout|fxFlex',
            ['*.html']
        );

        if (flexMatches.length > 0) {
            // Group flex layout issues per file to reduce noise
            const files = new Set(flexMatches.map(m => m.file));
            for (const file of files) {
                issues.push({
                    file,
                    line: 1, // Generic
                    type: 'dependency',
                    message: 'Detected Angular Flex Layout usage. This library is deprecated. Consider migrating to CSS Flexbox or Tailwind.',
                    severity: 'warning'
                });
            }
        }

        // Check for Control Flow migration opportunity (Angular 17+)
        if (targetMajor >= 17) {
            const structuralDirectives = await fsTools.searchFiles(
                path.join(projectRoot, 'src'),
                '\\*ngIf|\\*ngFor|\\*ngSwitch',
                ['*.html']
            );

            if (structuralDirectives.length > 5) { // Threshold to avoid noise on small changes
                issues.push({
                    file: 'PROJECT_WIDE',
                    line: 0,
                    type: 'template',
                    message: `Target is v${targetMajor}, but detected old control flow (*ngIf/*ngFor). Run 'ng g @angular/core:control-flow' to migrate to @if/@for.`,
                    severity: 'suggestion'
                });
            }
        }
    }

    private groupAndReport(issues: UIIssue[]): void {
        const grouped = issues.reduce((acc, issue) => {
            const key = issue.type;
            if (!acc[key]) acc[key] = [];
            acc[key].push(issue);
            return acc;
        }, {} as Record<string, UIIssue[]>);

        if (grouped['style']) {
            console.log(`\n   🖌️  Styles (${grouped['style'].length}):`);
            grouped['style'].slice(0, 5).forEach(i => console.log(`      ${path.basename(i.file)}:${i.line} - ${i.message}`));
            if (grouped['style'].length > 5) console.log(`      ... and ${grouped['style'].length - 5} more`);
        }

        if (grouped['dependency']) {
            console.log(`\n   📦 Dependencies (${grouped['dependency'].length}):`);
            grouped['dependency'].slice(0, 3).forEach(i => console.log(`      ${path.basename(i.file)} - ${i.message}`));
        }

        if (grouped['template']) {
            console.log(`\n   📄 Templates (${grouped['template'].length}):`);
            grouped['template'].forEach(i => console.log(`      ${i.message}`));
        }
        console.log();
    }
}
