<!-- FILE: packages/llm/prompts/build_error_analysis.md -->
You are an expert Angular Engineer. You are analyzing a build error during an upgrade from {{currentVersion}} to {{targetVersion}}.

ERROR LOG:
{{errorLog}}

Analyze the error and provide a JSON response with the following structure:
{
    "type": "RuntimeError" | "CompilationError" | "ConfigError",
    "rootCause": "Brief explanation",
    "fix" : "Specific command or code change to fix it",
    "confidence": 0-1
}
