// FILE: packages/tools/ts/index.ts
import { Project, Diagnostic } from 'ts-morph';

export const tsTools = {
    createProject: (tsConfigPath: string): Project => {
        return new Project({
            tsConfigFilePath: tsConfigPath,
        });
    },
    getDiagnostics: (project: Project): Diagnostic[] => {
        return project.getPreEmitDiagnostics();
    },
    formatDiagnostics: (diagnostics: Diagnostic[]): string[] => {
        return diagnostics.map(d => d.getMessageText().toString());
    }
};
