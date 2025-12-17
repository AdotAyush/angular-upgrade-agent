// FILE: packages/knowledge-base/service.ts
import { fsTools } from '../tools/fs/index.js';
import * as path from 'path';

export interface AngularVersion {
    version: string;
    releaseDate: string;
    ltsEndDate: string;
    nodeRange: string;
    typescriptRange: string;
    rxjsRange: string;
    breakingChanges?: string[];
}

export interface RxJSMigration {
    from: string;
    to: string;
    changes: Array<{
        type: string;
        name?: string;
        replacement?: string;
        note?: string;
        description?: string;
    }>;
}

export class KnowledgeBaseService {
    private angularVersions: AngularVersion[] = [];
    private rxjsMigrations: RxJSMigration[] = [];
    private baseDir: string;

    constructor(baseDir: string) {
        this.baseDir = baseDir;
    }

    async loadAll(): Promise<void> {
        try {
            const angularData = await fsTools.readJson<{ versions: AngularVersion[] }>(
                path.join(this.baseDir, 'angular/versions.json')
            );
            this.angularVersions = angularData.versions;

            const rxjsData = await fsTools.readJson<{ migrations: RxJSMigration[] }>(
                path.join(this.baseDir, 'rxjs/migrations.json')
            );
            this.rxjsMigrations = rxjsData.migrations;
        } catch (e) {
            console.warn('Failed to load knowledge base:', e);
        }
    }

    getAngularVersion(version: string): AngularVersion | undefined {
        return this.angularVersions.find(v => v.version.startsWith(version));
    }

    getVersionRange(from: string, to: string): AngularVersion[] {
        const fromMajor = parseInt(from.split('.')[0]);
        const toMajor = parseInt(to.split('.')[0]);

        return this.angularVersions.filter(v => {
            const major = parseInt(v.version.split('.')[0]);
            return major >= fromMajor && major <= toMajor;
        }).sort((a, b) =>
            parseInt(a.version.split('.')[0]) - parseInt(b.version.split('.')[0])
        );
    }

    getRxJSMigration(from: string, to: string): RxJSMigration | undefined {
        return this.rxjsMigrations.find(m => m.from === from && m.to === to);
    }

    getAllAngularVersions(): AngularVersion[] {
        return [...this.angularVersions];
    }
}
