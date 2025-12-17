// FILE: packages/tools/fs/index.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { execTools } from '../exec/index.js';

export const fsTools = {
    readFile: async (filePath: string): Promise<string> => {
        return fs.readFile(filePath, 'utf-8');
    },
    writeFile: async (filePath: string, content: string): Promise<void> => {
        // Safety: Ensure we don't accidentally write outside project root if we had context
        // For now, standard write
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
    },
    exists: async (filePath: string): Promise<boolean> => {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    },
    readJson: async <T>(filePath: string): Promise<T> => {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    },
    writeJson: async (filePath: string, data: any): Promise<void> => {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    },
    searchFiles: async (cwd: string, pattern: string): Promise<string> => {
        // Robust grep
        try {
            return await execTools.run('grep', ['-r', pattern, '.'], cwd);
        } catch {
            return '';
        }
    }
};
