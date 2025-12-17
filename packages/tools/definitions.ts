// FILE: packages/tools/definitions.ts
export const toolDefinitions = [
    {
        type: "function",
        function: {
            name: "readFile",
            description: "Read the contents of a file",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Absolute path to the file" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeFile",
            description: "Write content to a file",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Absolute path to the file" },
                    content: { type: "string", description: "Content to write" }
                },
                required: ["path", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "runCommand",
            description: "Execute a shell command",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string", description: "Command to run" },
                    cwd: { type: "string", description: "Working directory" }
                },
                required: ["command"]
            }
        }
    }
];
