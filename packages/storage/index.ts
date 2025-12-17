// FILE: packages/storage/index.ts
import { UpgradeTask } from '../schemas/agentSchemas.js';

export interface StorageAdapter {
    saveTask(task: UpgradeTask): Promise<void>;
    getTask(id: string): Promise<UpgradeTask | null>;
    getAllTasks(): Promise<UpgradeTask[]>;
    updateTaskStatus(id: string, status: UpgradeTask['status']): Promise<void>;
    saveSnapshot(id: string, path: string): Promise<void>;
    getSnapshot(id: string): Promise<string | null>;
}

// FILE: packages/storage/memory/index.ts
import { StorageAdapter } from '../index.js';
import { UpgradeTask } from '../../schemas/agentSchemas.js';

export class InMemoryStorage implements StorageAdapter {
    private tasks = new Map<string, UpgradeTask>();
    private snapshots = new Map<string, string>();

    async saveTask(task: UpgradeTask): Promise<void> {
        this.tasks.set(task.id, task);
    }

    async getTask(id: string): Promise<UpgradeTask | null> {
        return this.tasks.get(id) || null;
    }

    async getAllTasks(): Promise<UpgradeTask[]> {
        return Array.from(this.tasks.values());
    }

    async updateTaskStatus(id: string, status: UpgradeTask['status']): Promise<void> {
        const task = this.tasks.get(id);
        if (task) {
            task.status = status;
            this.tasks.set(id, task);
        }
    }

    async saveSnapshot(id: string, path: string): Promise<void> {
        this.snapshots.set(id, path);
    }

    async getSnapshot(id: string): Promise<string | null> {
        return this.snapshots.get(id) || null;
    }
}
