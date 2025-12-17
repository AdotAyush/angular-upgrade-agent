// FILE: packages/core/graph/nodes.ts
import { RunnableConfig } from "@langchain/core/runnables";
import { UpgradeState } from "./state.js";
import { AgentFactory } from "../../agents/factory.js";
import { UpgradeTask } from "../../schemas/agentSchemas.js";
import { isRecoverableError } from "../errors.js";
import { KnowledgeBaseService } from "../../knowledge-base/service.js";
import { LLMAdapter } from "../../llm/index.js";
import { ToolExecutor } from "../../tools/executor.js";

export class UpgradeGraphNodes {
    private agentFactory: AgentFactory;

    constructor(
        llm: LLMAdapter,
        knowledgeBase: KnowledgeBaseService,
        toolExecutor: ToolExecutor
    ) {
        this.agentFactory = new AgentFactory(llm, knowledgeBase, toolExecutor);
    }

    async plannerNode(state: UpgradeState, config?: RunnableConfig): Promise<Partial<UpgradeState>> {
        console.log("📊 Graph Node: Planning");

        // Instantiate VersionPlannerAgent
        const agent = this.agentFactory.getAgent("VersionPlannerAgent");

        // Execute planning
        const tasks = await agent.run(state.context);

        // If tasks were generated, flatten them out (VersionPlanner returns task[])
        const taskList = Array.isArray(tasks) ? tasks : [];

        return {
            tasks: taskList,
            phase: "EXECUTION"
        };
    }

    async executorNode(state: UpgradeState, config?: RunnableConfig): Promise<Partial<UpgradeState>> {
        const nextTask = state.tasks.find(t => t.status === "PENDING" || t.status === "IN_PROGRESS");

        if (!nextTask) {
            console.log("✅ All tasks completed");
            return { phase: "COMPLETED", currentTaskId: null };
        }

        console.log(`🚀 Graph Node: Executing ${nextTask.id} (${nextTask.agent})`);

        try {
            const agent = this.agentFactory.getAgent(nextTask.agent);

            // Execute Agent
            await agent.run(state.context, nextTask.data);

            // Mark as completed
            const updatedTasks = state.tasks.map(t =>
                t.id === nextTask.id ? { ...t, status: "COMPLETED" as const } : t
            );

            return {
                tasks: updatedTasks,
                currentTaskId: nextTask.id,
                // Stay in execution phase until no tasks left
                phase: "EXECUTION"
            };

        } catch (error: any) {
            console.error(`❌ Graph Node Error in ${nextTask.id}: ${error.message}`);

            const updatedTasks = state.tasks.map(t =>
                t.id === nextTask.id ? { ...t, status: "FAILED" as const } : t
            );

            return {
                tasks: updatedTasks,
                currentTaskId: nextTask.id,
                error: {
                    message: error.message,
                    recoverable: isRecoverableError(error),
                    attempt: (state.error?.attempt || 0) + 1
                },
                phase: isRecoverableError(error) ? "EXECUTION" : "FAILED"
            };
        }
    }

    async failedNode(state: UpgradeState): Promise<Partial<UpgradeState>> {
        console.log("🛑 Graph Node: Failure Handler");
        // Could trigger rollback here via orchestrator-like logic
        return { phase: "FAILED" };
    }
}
