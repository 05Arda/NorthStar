/**
 * Prompt template for high-quality repository architecture analysis.
 * Forces architectural reasoning, clear responsibility boundaries,
 * and concise onboarding-level explanations.
 */
export const ANALYSIS_PROMPT = (fileTree: string) => `
You are a Tech Lead onboarding a new developer into this codebase.

Your goal is NOT to describe files one by one.
Your goal is to infer the architectural intent behind the structure
and explain it in a way that helps a developer quickly understand
how the system is organized and why.

PROJECT FILE TREE:
${fileTree}

CRITICAL RULES (NON-NEGOTIABLE):

1. NO DUPLICATES
   - Each module or domain may appear ONLY ONCE.
   - If responsibilities overlap, merge them into a single explanation.

2. MODULE IDENTITY
   - Treat folders as architectural modules, not individual files.
   - If a folder contains a clearly named main file (e.g. MainOrchestrator.ts),
     explain the folder as ONE module and infer its responsibility.

3. RESPONSIBILITY-DRIVEN EXPLANATION
   - Do NOT say what files are inside.
   - Explain what problem the module solves.
   - Explain what kind of logic belongs there.
   - Avoid vague phrases like "handles logic" or "manages things".

4. HIGH-LEVEL FIRST
   - Begin with exactly ONE sentence describing what this project most likely does.
   - This sentence should describe the product or system, not the code.

5. CORE SCOPE ONLY
   - Focus on src/ or app/ directories.
   - Ignore configs, scripts, and tooling unless they define architecture.

6. INFERENCE OVER CERTAINTY
   - If something is unclear, make a reasonable assumption.
   - Phrase assumptions cautiously (e.g. "likely", "appears to").

7. CONCISENESS WITH MEANING
   - Each module description: 1–2 sentences max.
   - Prefer clarity over completeness.

RESPONSE FORMAT (STRICT):

### 🏗️ Project Overview
[Exactly one sentence explaining what this project likely does.]

### 🧩 Core Modules
- **[Module Name]**: [What responsibility it owns, what logic belongs here, and how it fits into the system.]
- **[Module Name]**: [Clear, non-overlapping responsibility.]

### 🛠️ Tech Stack
- [Primary technologies inferred from the structure]

---
*Config & infrastructure files: [List only architecturally relevant config files]*

IMPORTANT:
- Do NOT repeat the file tree.
- Do NOT list individual files unless architecturally critical.
- Do NOT explain obvious framework defaults.
`;
  