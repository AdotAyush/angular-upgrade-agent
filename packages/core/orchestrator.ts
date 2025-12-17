// FILE: packages/core/orchestrator.ts
import { TaskDAG } from './dag.js';
import { SessionContext } from './context.js';
import { StorageAdapter } from '../storage/index.js';
import { LLMAdapter } from '../llm/index.js';
import { AgentContext, UpgradeTask } from '../schemas/agentSchemas.js';
import { AgentFactory } from '../agents/factory.js';
import { KnowledgeBaseService } from '../knowledge-base/service.js';
import { ToolExecutor } from '../tools/executor.js';
import { snapshotTools } from '../tools/index.js';
import { isRecoverableError } from './errors.js';
import { UpgradeWorkflow } from './graph/workflow.js';
import { createInitialState } from './graph/state.js';

export class Orchestrator {
  private dag: TaskDAG;
  private context: SessionContext;
  private storage: StorageAdapter;
  private llm: LLMAdapter;
  private agentFactory: AgentFactory;
  private snapshotId: string | null = null;
  private knowledgeBase: KnowledgeBaseService;

  constructor(
    dag: TaskDAG,
    context: SessionContext,
    storage: StorageAdapter,
    llm: LLMAdapter,
    knowledgeBase: KnowledgeBaseService
  ) {
    this.dag = dag;
    this.context = context;
    this.storage = storage;
    this.llm = llm;
    this.knowledgeBase = knowledgeBase;

    const toolExecutor = new ToolExecutor();
    this.agentFactory = new AgentFactory(llm, knowledgeBase, toolExecutor);
  }

  async init(projectPath: string, targetVersion: string): Promise<void> {
    const initialContext: AgentContext = {
      projectRoot: projectPath,
      targetVersion: targetVersion,
      dryRun: false,
      interactive: true
    };
    this.context = new SessionContext(initialContext);

    // Create snapshot for rollback
    if (!initialContext.dryRun) {
      console.log('📸 Creating pre-upgrade snapshot...');
      try {
        this.snapshotId = await snapshotTools.create(projectPath, 'pre-upgrade');
        console.log(`Snapshot: ${this.snapshotId}`);
        await this.storage.saveSnapshot('initial', this.snapshotId);
      } catch (e: any) {
        console.warn(`⚠️  Snapshot failed: ${e.message}. Proceeding without rollback capability.`);
      }
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Starting Upgrade Workflow (LangGraph)...');

    const workflow = new UpgradeWorkflow(
      this.llm,
      this.knowledgeBase,
      new ToolExecutor()
    );

    const app = workflow.createGraph();
    const initialState = createInitialState(this.context.get());

    try {
      const result = await app.invoke(initialState);

      if (result.phase === 'FAILED') {
        const errorMsg = result.error?.message || 'Unknown error';
        console.error(`💥 Workflow failed: ${errorMsg}`);
        await this.rollback();
        throw new Error(`Upgrade failed: ${errorMsg}`);
      }

      console.log('✅ Upgrade orchestration completed successfully');

    } catch (error: any) {
      console.error(`❌ Graph execution error: ${error.message}`);
      await this.rollback();
      throw error;
    }
  }

  async rollback(): Promise<void> {
    if (!this.snapshotId) {
      console.warn('No snapshot available for rollback');
      return;
    }

    console.log(`🔄 Rolling back to snapshot: ${this.snapshotId}`);
    try {
      await snapshotTools.restore(this.context.get().projectRoot, this.snapshotId);
      console.log('✅ Rollback completed');
    } catch (e: any) {
      console.error(`❌ Rollback failed: ${e.message}`);
    }
  }
}
