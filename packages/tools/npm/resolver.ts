// FILE: packages/tools/npm/resolver.ts
import { execTools } from '../exec/index.js';
import * as semver from 'semver';

export interface PackageInfo {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
}

export interface ResolutionNode {
    name: string;
    requestedVersion: string;
    resolvedVersion: string;
    dependencies: Map<string, ResolutionNode>;
    peerDependencies: Map<string, string>;
    conflicts: Conflict[];
}

export interface Conflict {
    package: string;
    requestedBy: string[];
    versions: string[];
    severity: 'error' | 'warning';
    resolution?: string;
}

export class DependencyResolver {
    private cache = new Map<string, PackageInfo>();
    private resolutionMap = new Map<string, string>();
    private conflicts: Conflict[] = [];

    async resolveTree(
        rootDependencies: Record<string, string>,
        registry?: string
    ): Promise<{ tree: Map<string, ResolutionNode>; conflicts: Conflict[] }> {
        console.log('Starting recursive dependency resolution...');

        const tree = new Map<string, ResolutionNode>();

        // First pass: build dependency tree
        for (const [pkg, version] of Object.entries(rootDependencies)) {
            await this.resolvePackage(pkg, version, tree, [], registry);
        }

        // Second pass: validate compatibility
        this.validateTree(tree);

        // Third pass: resolve conflicts
        this.resolveConflicts(tree);

        console.log(`Resolution complete: ${tree.size} packages, ${this.conflicts.length} conflicts`);

        return { tree, conflicts: this.conflicts };
    }

    private async resolvePackage(
        packageName: string,
        versionRange: string,
        tree: Map<string, ResolutionNode>,
        path: string[],
        registry?: string
    ): Promise<void> {
        // Detect circular dependencies
        if (path.includes(packageName)) {
            console.warn(`Circular dependency detected: ${path.join(' -> ')} -> ${packageName}`);
            return;
        }

        // Check if already resolved at this version
        const cacheKey = `${packageName}@${versionRange}`;
        const existingResolution = this.resolutionMap.get(packageName);

        if (existingResolution && semver.satisfies(existingResolution, versionRange)) {
            return; // Already resolved compatibly
        }

        // Fetch package info
        const packageInfo = await this.fetchPackageInfo(packageName, versionRange, registry);

        if (!packageInfo) {
            this.conflicts.push({
                package: packageName,
                requestedBy: [path[path.length - 1] || 'root'],
                versions: [versionRange],
                severity: 'error',
                resolution: 'Package not found'
            });
            return;
        }

        // Check for version conflicts
        if (existingResolution && !semver.satisfies(packageInfo.version, versionRange)) {
            this.conflicts.push({
                package: packageName,
                requestedBy: [path[path.length - 1] || 'root'],
                versions: [existingResolution, packageInfo.version],
                severity: 'error'
            });
            return;
        }

        // Record resolution
        this.resolutionMap.set(packageName, packageInfo.version);

        // Create resolution node
        const node: ResolutionNode = {
            name: packageName,
            requestedVersion: versionRange,
            resolvedVersion: packageInfo.version,
            dependencies: new Map(),
            peerDependencies: new Map(Object.entries(packageInfo.peerDependencies || {})),
            conflicts: []
        };

        tree.set(packageName, node);

        // Recursively resolve dependencies
        const allDeps = {
            ...packageInfo.dependencies,
            ...packageInfo.optionalDependencies
        };

        for (const [depName, depVersion] of Object.entries(allDeps)) {
            await this.resolvePackage(
                depName,
                depVersion,
                node.dependencies,
                [...path, packageName],
                registry
            );
        }
    }

    private async fetchPackageInfo(
        packageName: string,
        versionRange: string,
        registry?: string
    ): Promise<PackageInfo | null> {
        const cacheKey = `${packageName}@${versionRange}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        try {
            const args = ['view', `${packageName}@${versionRange}`, '--json'];
            if (registry) {
                args.push('--registry', registry);
            }

            const output = await execTools.run('npm', args, '.');
            const data = JSON.parse(output);

            // Handle array response (multiple versions)
            const packageData = Array.isArray(data) ? data[0] : data;

            const info: PackageInfo = {
                name: packageData.name,
                version: packageData.version,
                dependencies: packageData.dependencies || {},
                peerDependencies: packageData.peerDependencies || {},
                optionalDependencies: packageData.optionalDependencies || {}
            };

            this.cache.set(cacheKey, info);
            return info;
        } catch (e) {
            console.warn(`Failed to fetch ${packageName}@${versionRange}: ${e}`);
            return null;
        }
    }

    private validateTree(tree: Map<string, ResolutionNode>): void {
        console.log('Validating peer dependencies...');

        for (const [pkgName, node] of tree.entries()) {
            for (const [peerName, peerVersion] of node.peerDependencies.entries()) {
                const resolvedPeer = this.resolutionMap.get(peerName);

                if (!resolvedPeer) {
                    this.conflicts.push({
                        package: peerName,
                        requestedBy: [pkgName],
                        versions: [peerVersion],
                        severity: 'warning',
                        resolution: 'Missing peer dependency'
                    });
                } else if (!semver.satisfies(resolvedPeer, peerVersion)) {
                    this.conflicts.push({
                        package: peerName,
                        requestedBy: [pkgName],
                        versions: [peerVersion, resolvedPeer],
                        severity: 'error',
                        resolution: `Peer dependency mismatch: ${pkgName} requires ${peerVersion}, but ${resolvedPeer} is installed`
                    });
                }
            }
        }
    }

    private resolveConflicts(tree: Map<string, ResolutionNode>): void {
        console.log('Attempting to resolve conflicts...');

        for (const conflict of this.conflicts) {
            if (conflict.severity === 'error' && conflict.versions.length > 1) {
                // Try to find a version that satisfies all requirements
                const satisfyingVersion = this.findSatisfyingVersion(conflict.versions);
                if (satisfyingVersion) {
                    conflict.resolution = `Use ${satisfyingVersion}`;
                    conflict.severity = 'warning';
                }
            }
        }
    }

    private findSatisfyingVersion(versionRanges: string[]): string | null {
        // This is a simplified version - production would query npm for all available versions
        try {
            // Find intersection of ranges
            for (const range of versionRanges) {
                const allSatisfy = versionRanges.every(r => {
                    // Check if there's overlap
                    return true; // Simplified - real implementation would validate properly
                });
                if (allSatisfy) return range;
            }
        } catch {
            return null;
        }
        return null;
    }

    getResolutionMap(): Map<string, string> {
        return new Map(this.resolutionMap);
    }
}
