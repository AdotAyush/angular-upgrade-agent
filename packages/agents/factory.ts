// FILE: packages/agents/factory.ts
import { AgentContext, UpgradeTask } from '../schemas/agentSchemas.js';
import { LLMAdapter } from '../llm/index.js';
import { KnowledgeBaseService } from '../knowledge-base/service.js';
import { ToolExecutor } from '../tools/executor.js';
import { VersionPlannerAgent } from './version-planner/index.js';
import { EnvironmentAgent } from './environment-agent/index.js';
import { DependencyAgent } from './dependency-agent/index.js';
import { BuildAgent } from './build-agent/index.js';
import { RuntimeAgent } from './runtime-agent/index.js';
import { RouterAgent } from './router-agent/index.js';
import { UIAgent } from './ui-agent/index.js';
import { TestAgent } from './test-agent/index.js';
import { ReportAgent } from './report-agent/index.js';

export interface Agent {
    run(context: AgentContext, taskData?: any): Promise<any>;
}

export class AgentFactory {
    private agents: Map<string, Agent> = new Map();

    constructor(
        private llm: LLMAdapter,
        private knowledgeBase: KnowledgeBaseService,
        private toolExecutor: ToolExecutor
    ) {
        this.registerAgents();
    }

    private registerAgents() {
        this.agents.set('VersionPlannerAgent', new VersionPlannerAgent(this.llm, this.knowledgeBase));
        this.agents.set('EnvironmentAgent', new EnvironmentAgent());
        this.agents.set('DependencyAgent', new DependencyAgent(this.llm));
        this.agents.set('BuildAgent', new BuildAgent(this.llm, this.toolExecutor));
        this.agents.set('RuntimeAgent', new RuntimeAgent(this.knowledgeBase));
        this.agents.set('RouterAgent', new RouterAgent());
        this.agents.set('UIAgent', new UIAgent());
        this.agents.set('TestAgent', new TestAgent());
        this.agents.set('ReportAgent', new ReportAgent());
    }

    getAgent(name: string): Agent {
        const agent = this.agents.get(name);
        if (!agent) {
            throw new Error(`Agent not found: ${name}`);
        }
        return agent;
    }
}
