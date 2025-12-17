// FILE: apps/cli/src/index.ts
import { Command } from 'commander';
import { upgradeCommand } from './commands/upgrade.js';

const program = new Command();

program
    .name('upgrade-agent')
    .description('Agentic Angular Upgrade Tool')
    .version('0.0.1');

program.addCommand(upgradeCommand);

program.parse(process.argv);
