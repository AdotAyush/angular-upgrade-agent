// FILE: packages/schemas/agentSchemas.ts
import { z } from 'zod';

export const ErrorClassificationSchema = z.enum([
    'Environment',
    'DependencyResolution',
    'AngularVersionSkew',
    'TypeScriptIncompatibility',
    'RxJSDeprecation',
    'IvyCompiler',
    'AOTCompilation',
    'StandaloneVsNgModule',
    'DependencyInjection',
    'RouterConfig',
    'UITheming',
    'SSRHydration',
    'TestFailure',
    'SilentRuntimeChange'
]);

export type ErrorClassification = z.infer<typeof ErrorClassificationSchema>;

export const TaskStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const AgentContextSchema = z.object({
    projectRoot: z.string(),
    currentVersion: z.string().optional(),
    targetVersion: z.string().optional(),
    dryRun: z.boolean().default(false),
    interactive: z.boolean().default(true),
    workspaceConfig: z.any().optional(), // angular.json content
});

export type AgentContext = z.infer<typeof AgentContextSchema>;

export const ValidationResultSchema = z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    warnings: z.array(z.string())
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const UpgradeTaskSchema = z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    dependencies: z.array(z.string()),
    status: TaskStatusSchema,
    agent: z.string(), // Name of the agent responsible
    data: z.record(z.any()).optional()
});

export type UpgradeTask = z.infer<typeof UpgradeTaskSchema>;
