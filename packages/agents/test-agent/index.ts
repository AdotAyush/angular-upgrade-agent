// FILE: packages/agents/test-agent/index.ts
import { AgentContext } from '../../schemas/agentSchemas.js';
import { angularTools } from '../../tools/index.js';
import { TestError } from '../../core/errors.js';

export class TestAgent {
    async run(context: AgentContext): Promise<void> {
        console.log('Running test suite...');

        try {
            const output = await angularTools.ngTest(context.projectRoot);
            console.log('✅ All tests passed');
        } catch (error: any) {
            const output = error.stdout || error.stderr || error.message;

            // Parse test results
            const failedTests = this.parseFailedTests(output);

            if (failedTests.length > 0) {
                console.log(`❌ ${failedTests.length} test(s) failed:`);
                failedTests.forEach(test => console.log(`   - ${test}`));

                throw new TestError(
                    `${failedTests.length} tests failed`,
                    { failedTests, output: output.substring(0, 1000) }
                );
            } else {
                // Tests might have failed for other reasons
                throw new TestError('Test suite failed', { output });
            }
        }
    }

    private parseFailedTests(output: string): string[] {
        const failed: string[] = [];

        // Try to parse Jasmine/Karma output
        const failedPattern = /FAILED:\s+(.+)/g;
        let match;
        while ((match = failedPattern.exec(output)) !== null) {
            failed.push(match[1].trim());
        }

        // Try Jest format
        const jestPattern = /●\s+(.+)/g;
        while ((match = jestPattern.exec(output)) !== null) {
            failed.push(match[1].trim());
        }

        return failed;
    }
}
