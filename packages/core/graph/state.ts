// FILE: packages/core/graph/state.ts
import { BaseMessage } from '@langchain/core/messages';
import { AgentContext, UpgradeTask } from '../../schemas/agentSchemas.js';

/**
 * Valid phases of the upgrade process
 */
export type UpgradePhase = 'PLANNING' | 'EXECUTION' | 'VERIFICATION' | 'ROLLBACK' | 'COMPLETED' | 'FAILED';

/**
 * The central state object for the LangGraph execution
 */
export interface UpgradeState {
    /**
     * Conversation history / reasoning trace
     */
    messages: BaseMessage[];

    /**
     * The context of the agent (project root, target version, etc.)
     */
    context: AgentContext;

    /**
     * The list of tasks to execute
     */
    tasks: UpgradeTask[];

    /**
     * Current task being executed
     */
    currentTaskId: string | null;

    /**
     * Current high-level phase
     */
    phase: UpgradePhase;

    /**
     * Error information if failure occurred
     */
    error: {
        message: string;
        recoverable: boolean;
        attempt: number;
    } | null;
}

/**
 * Initial state factory
 */
export function createInitialState(context: AgentContext): UpgradeState {
    return {
        messages: [],
        context,
        tasks: [],
        currentTaskId: null,
        phase: 'PLANNING',
        error: null
    };
}
