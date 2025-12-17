// FILE: packages/core/errors.ts
import { ErrorClassification } from '../schemas/agentSchemas.js';

export class UpgradeError extends Error {
    constructor(
        message: string,
        public readonly classification: ErrorClassification,
        public readonly recoverable: boolean = true,
        public readonly context?: any
    ) {
        super(message);
        this.name = 'UpgradeError';
    }
}

export class EnvironmentError extends UpgradeError {
    constructor(message: string, context?: any) {
        super(message, 'Environment', false, context);
        this.name = 'EnvironmentError';
    }
}

export class DependencyError extends UpgradeError {
    constructor(message: string, recoverable = true, context?: any) {
        super(message, 'DependencyResolution', recoverable, context);
        this.name = 'DependencyError';
    }
}

export class BuildError extends UpgradeError {
    constructor(message: string, context?: any) {
        super(message, 'AOTCompilation', true, context);
        this.name = 'BuildError';
    }
}

export class TestError extends UpgradeError {
    constructor(message: string, context?: any) {
        super(message, 'TestFailure', true, context);
        this.name = 'TestError';
    }
}

export function isRecoverableError(error: Error): boolean {
    return error instanceof UpgradeError && error.recoverable;
}

export function classifyError(error: Error): ErrorClassification {
    if (error instanceof UpgradeError) {
        return error.classification;
    }
    return 'SilentRuntimeChange'; // Default
}
