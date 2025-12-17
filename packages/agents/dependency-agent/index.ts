// FILE: packages/agents/dependency-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { npmTools, fsTools } from '../../tools/index.js';
import { LLMAdapter } from '../../llm/index.js';
import { DependencyResolver, Conflict } from '../../tools/npm/resolver.js';
import { DependencyError } from '../../core/errors.js';
import * as path from 'path';

interface PrivatePackageConfig {
    privatePackages: Record<string, {
        registry: string;
        scope: string;
        authToken: string;
        versionStrategy: string;
    }>;
    registries: Record<string, {
        url: string;
        authRequired: boolean;
        envVar: string;
    }>;
    resolutionStrategy: {
        preferLatest: boolean;
        allowPrereleases: boolean;
        strictPeerDependencies: boolean;
        deduplication: boolean;
    };
}

export class DependencyAgent {
    private privatePackageConfig?: PrivatePackageConfig;

    constructor(private llm: LLMAdapter) { }

    async run(context: AgentContext, taskData: any): Promise<void> {
        const targetVersion = taskData?.targetVersion || context.targetVersion;
        console.log(`\n🔧 Resolving dependencies for Angular ${targetVersion}...\n`);

        // Load private package configuration
        await this.loadPrivatePackageConfig(context.projectRoot);

        const packageJsonPath = `${context.projectRoot}/package.json`;
        const packageCtx = await fsTools.readJson<any>(packageJsonPath);

        // Prepare Angular package updates
        const angularUpdates = await this.prepareAngularUpdates(packageCtx, targetVersion);

        // Create resolver
        const resolver = new DependencyResolver();

        // Build complete dependency tree including Angular updates
        const allDependencies = {
            ...packageCtx.dependencies,
            ...packageCtx.devDependencies,
            ...angularUpdates
        };

        console.log('Analyzing dependency tree recursively...');
        const { tree, conflicts } = await resolver.resolveTree(allDependencies);

        // Report findings
        console.log(`\n📊 Dependency Analysis:`);
        console.log(`   Total packages: ${tree.size}`);
        console.log(`   Conflicts found: ${conflicts.length}`);

        // Handle conflicts
        if (conflicts.length > 0) {
            this.reportConflicts(conflicts);

            const criticalConflicts = conflicts.filter(c => c.severity === 'error');
            if (criticalConflicts.length > 0 && this.privatePackageConfig?.resolutionStrategy.strictPeerDependencies) {
                throw new DependencyError(
                    `${criticalConflicts.length} critical dependency conflicts detected`,
                    false,
                    { conflicts: criticalConflicts }
                );
            }
        }

        // Apply updates
        console.log('\n📝 Applying dependency updates...');
        const resolutionMap = resolver.getResolutionMap();
        await this.applyUpdates(packageCtx, packageJsonPath, resolutionMap, angularUpdates);

        // Configure private registries if needed
        await this.configurePrivateRegistries(context.projectRoot);

        // Install with retry logic
        await this.installWithRetry(context.projectRoot, conflicts.length > 0);

        // Run security audit
        await this.runSecurityAudit(context.projectRoot);

        console.log('✅ Dependency resolution completed\n');
    }

    private async loadPrivatePackageConfig(projectRoot: string): Promise<void> {
        try {
            const configPath = path.join(__dirname, '../../knowledge-base/private-packages.json');
            this.privatePackageConfig = await fsTools.readJson<PrivatePackageConfig>(configPath);
            console.log('📦 Loaded private package configuration');
        } catch (e) {
            console.log('ℹ️  No private package configuration found (using public registry only)');
        }
    }

    private async prepareAngularUpdates(
        packageCtx: any,
        targetVersion: string
    ): Promise<Record<string, string>> {
        const updates: Record<string, string> = {};
        const allPackages = { ...packageCtx.dependencies, ...packageCtx.devDependencies };

        for (const pkg of Object.keys(allPackages)) {
            if (pkg.startsWith('@angular/')) {
                const majorVersion = targetVersion.split('.')[0];
                updates[pkg] = `^${majorVersion}.0.0`;
            }
        }

        return updates;
    }

    private reportConflicts(conflicts: Conflict[]): void {
        console.log('\n⚠️  Dependency Conflicts Detected:\n');

        const errors = conflicts.filter(c => c.severity === 'error');
        const warnings = conflicts.filter(c => c.severity === 'warning');

        if (errors.length > 0) {
            console.log('❌ ERRORS:');
            errors.forEach(conflict => {
                console.log(`   ${conflict.package}`);
                console.log(`      Requested by: ${conflict.requestedBy.join(', ')}`);
                console.log(`      Versions: ${conflict.versions.join(', ')}`);
                if (conflict.resolution) {
                    console.log(`      Resolution: ${conflict.resolution}`);
                }
            });
        }

        if (warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            warnings.forEach(conflict => {
                console.log(`   ${conflict.package}: ${conflict.resolution || 'Check manually'}`);
            });
        }
        console.log();
    }

    private async applyUpdates(
        packageCtx: any,
        packageJsonPath: string,
        resolutionMap: Map<string, string>,
        angularUpdates: Record<string, string>
    ): Promise<void> {
        // Apply Angular updates
        for (const [pkg, version] of Object.entries(angularUpdates)) {
            if (packageCtx.dependencies?.[pkg]) {
                packageCtx.dependencies[pkg] = version;
            }
            if (packageCtx.devDependencies?.[pkg]) {
                packageCtx.devDependencies[pkg] = version;
            }
        }

        // Apply conflict resolutions from resolver
        for (const [pkg, version] of resolutionMap.entries()) {
            if (packageCtx.dependencies?.[pkg]) {
                packageCtx.dependencies[pkg] = `^${version}`;
            }
            if (packageCtx.devDependencies?.[pkg]) {
                packageCtx.devDependencies[pkg] = `^${version}`;
            }
        }

        await fsTools.writeJson(packageJsonPath, packageCtx);
        console.log(`   Updated ${Object.keys(angularUpdates).length} Angular packages`);
    }

    private async configurePrivateRegistries(projectRoot: string): Promise<void> {
        if (!this.privatePackageConfig) return;

        // Create .npmrc for scoped packages
        const npmrcLines: string[] = [];

        for (const [scope, config] of Object.entries(this.privatePackageConfig.registries)) {
            npmrcLines.push(`${scope}:registry=${config.url}`);

            if (config.authRequired && config.envVar) {
                const token = process.env[config.envVar];
                if (token) {
                    // Remove https:// for the auth config
                    const registryHost = config.url.replace('https://', '').replace('http://', '');
                    npmrcLines.push(`//${registryHost}/:_authToken=${token}`);
                } else {
                    console.warn(`⚠️  ${config.envVar} not set for registry ${scope}`);
                }
            }
        }

        if (npmrcLines.length > 0) {
            const npmrcPath = path.join(projectRoot, '.npmrc');
            await fsTools.writeFile(npmrcPath, npmrcLines.join('\n'));
            console.log('✅ Configured private registries');
        }
    }

    private async installWithRetry(projectRoot: string, hasConflicts: boolean): Promise<void> {
        console.log('\n📥 Installing dependencies...');

        try {
            await npmTools.install(projectRoot, { legacyPeerDeps: hasConflicts });
            console.log('✅ Dependencies installed successfully');
        } catch (e: any) {
            console.warn('⚠️  Install failed, retrying with --force...');
            try {
                await npmTools.install(projectRoot, {
                    legacyPeerDeps: true,
                    force: true
                });
                console.log('✅ Dependencies installed with --force');
            } catch (retryError: any) {
                throw new DependencyError(
                    'Failed to install dependencies',
                    true,
                    { originalError: e.message, retryError: retryError.message }
                );
            }
        }
    }

    private async runSecurityAudit(projectRoot: string): Promise<void> {
        console.log('\n🔒 Running security audit...');
        try {
            const auditResult = await npmTools.audit(projectRoot, 'moderate');
            const vulnCount = Object.keys(auditResult.vulnerabilities || {}).length;

            if (vulnCount > 0) {
                console.warn(`⚠️  Found ${vulnCount} security vulnerabilities`);
                console.log('   Run `npm audit fix` to attempt automatic fixes');
            } else {
                console.log('✅ No security vulnerabilities found');
            }
        } catch (e) {
            console.log('ℹ️  Security audit skipped (non-blocking)');
        }
    }
}
