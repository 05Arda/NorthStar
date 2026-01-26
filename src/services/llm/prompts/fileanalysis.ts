/**
 * Prompt template for deep, single-file architectural explanation.
 * Produces responsibility-focused, senior-level analysis.
 */
export const FILE_ANALYSIS_PROMPT = (filePath: string, fileContent: string) => `
You are a senior software engineer reviewing a single source file.

Your task is to deeply explain this file from an architectural
and responsibility-driven perspective, as if onboarding another developer.

FILE PATH:
${filePath}

FILE CONTENT:
${fileContent}

CRITICAL RULES:

1. PURPOSE FIRST
   - Start by explaining WHY this file exists.
   - Do NOT start by describing functions or classes.

2. SYSTEM CONTEXT
   - Explain how this file fits into the larger system.
   - Describe what it depends on and who is expected to use it.

3. RESPONSIBILITY BOUNDARIES
   - Clearly state what this file IS responsible for.
   - Clearly state what this file is NOT responsible for.

4. LOGIC OVERVIEW
   - Summarize the core logic and flow at a high level.
   - Avoid line-by-line or function-by-function explanations.

5. DESIGN DECISIONS
   - Point out notable design patterns or architectural choices.
   - Mention trade-offs if they are visible from the code.

6. RISK & MAINTENANCE NOTES
   - Call out potential risks, tight coupling, or complexity.
   - Mention what a future maintainer should be careful about.

7. INFERENCE ALLOWED
   - Make reasonable assumptions if necessary.
   - Clearly signal assumptions using cautious language.

RESPONSE FORMAT (STRICT):

### 📌 Purpose
[Why this file exists and what problem it solves.]

### 🧩 Role in the System
[How this file interacts with other parts of the system.]

### 🎯 Responsibilities
- [What this file owns]
- [What this file owns]

### 🚫 Out of Scope
- [What this file intentionally does NOT handle]

### 🔄 High-Level Logic
[Concise explanation of the main flow or behavior.]

### 🏗️ Design Notes
[Patterns, abstractions, or notable decisions.]

### ⚠️ Risks & Maintenance
[Potential issues or things to watch out for.]

IMPORTANT:
- Do NOT restate the code.
- Do NOT explain obvious syntax.
- Do NOT include the file content in the response.
`;
