// FILE: packages/core/dag.ts
import { UpgradeTask } from '../schemas/agentSchemas.js';

export class TaskDAG {
    private tasks: Map<string, UpgradeTask> = new Map();

    addTask(task: UpgradeTask): void {
        this.tasks.set(task.id, task);
    }

    getRunnableTasks(): UpgradeTask[] {
        // Simplistic DAG logic: returns tasks that are PENDING and have all dependencies COMPLETED
        const completedIds = new Set(
            Array.from(this.tasks.values())
                .filter(t => t.status === 'COMPLETED')
                .map(t => t.id)
        );

        return Array.from(this.tasks.values()).filter(t => {
            if (t.status !== 'PENDING') return false;
            return t.dependencies.every(depId => completedIds.has(depId));
        });
    }

    getTask(id: string): UpgradeTask | undefined {
        return this.tasks.get(id);
    }

    getAllTasks(): UpgradeTask[] {
        return Array.from(this.tasks.values());
    }
}
