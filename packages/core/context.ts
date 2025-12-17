// FILE: packages/core/context.ts
import { AgentContext } from '../schemas/agentSchemas.js';

export class SessionContext {
    private data: AgentContext;

    constructor(initialContext: AgentContext) {
        this.data = initialContext;
    }

    get(): AgentContext {
        return this.data;
    }

    update(partial: Partial<AgentContext>): void {
        this.data = { ...this.data, ...partial };
    }
}
