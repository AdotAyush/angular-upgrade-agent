// FILE: packages/core/graph/workflow.ts
import { StateGraph } from "@langchain/langgraph";
import { UpgradeState, createInitialState } from "./state.js";
import { UpgradeGraphNodes } from "./nodes.js";
import { LLMAdapter } from "../../llm/index.js";
import { KnowledgeBaseService } from "../../knowledge-base/service.js";
import { ToolExecutor } from "../../tools/executor.js";

// Define the upgrade graph
export class UpgradeWorkflow {
    private nodes: UpgradeGraphNodes;

    constructor(
        llm: LLMAdapter,
        knowledgeBase: KnowledgeBaseService,
        toolExecutor: ToolExecutor
    ) {
        this.nodes = new UpgradeGraphNodes(llm, knowledgeBase, toolExecutor);
    }

    createGraph() {
        // 1. Initialize State Graph
        const workflow = new StateGraph<UpgradeState>({
            channels: {
                messages: {
                    value: (x, y) => x.concat(y),
                    default: () => []
                },
                context: {
                    value: (x, y) => y,
                    default: () => ({} as any)
                },
                tasks: {
                    value: (x, y) => y, // Replace tasks list entirely
                    default: () => []
                },
                currentTaskId: {
                    value: (x, y) => y,
                    default: () => null
                },
                phase: {
                    value: (x, y) => y,
                    default: () => "PLANNING"
                },
                error: {
                    value: (x, y) => y,
                    default: () => null
                }
            }
        });

        // 2. Add Nodes
        workflow.addNode("planner", (state) => this.nodes.plannerNode(state));
        workflow.addNode("executor", (state) => this.nodes.executorNode(state));
        workflow.addNode("fail_handler", (state) => this.nodes.failedNode(state));

        // 3. Define Edges (Transitions)

        // Start -> Planner
        workflow.setEntryPoint("planner");

        // Planner -> Executor
        workflow.addEdge("planner", "executor");

        // Executor Conditional Logic
        workflow.addConditionalEdges(
            "executor",
            (state) => {
                if (state.phase === "COMPLETED") return "end";
                if (state.phase === "FAILED") return "fail_handler";
                // If still in EXECUTION, loop back to executor to pick up next task
                return "executor";
            },
            {
                end: "__end__",
                fail_handler: "fail_handler",
                executor: "executor"
            }
        );

        // Fail Handler -> End
        workflow.addEdge("fail_handler", "__end__");

        return workflow.compile();
    }
}
