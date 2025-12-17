// FILE: packages/llm/prompts/index.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export class PromptManager {
    private prompts: Map<string, string> = new Map();

    constructor(private promptsDir: string) { }

    async loadAll(): Promise<void> {
        try {
            const files = await fs.readdir(this.promptsDir);
            for (const file of files) {
                if (file.endsWith('.md') || file.endsWith('.txt')) {
                    const content = await fs.readFile(path.join(this.promptsDir, file), 'utf-8');
                    const name = path.basename(file, path.extname(file));
                    this.prompts.set(name, content);
                }
            }
        } catch (e) {
            // Directory might not exist yet, that's fine
        }
    }

    get(name: string, variables: Record<string, string> = {}): string {
        let prompt = this.prompts.get(name);
        if (!prompt) {
            throw new Error(`Prompt '${name}' not found.`);
        }

        for (const [key, value] of Object.entries(variables)) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return prompt;
    }
}
