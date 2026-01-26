export const SELECTION_ANALYSIS_PROMPT = (
  filePath: string,
  fileContent: string,
  selection: string,
) => `
You are explaining a SMALL selected code snippet to a developer.

CONTEXT (for understanding only, DO NOT explain entirely):
- File path: ${filePath}
- Full file content is provided for context.

FULL FILE CONTENT:
${fileContent}

SELECTED CODE SNIPPET (FOCUS ON THIS ONLY):
${selection}

CRITICAL RULES (NON-NEGOTIABLE):
- Explain ONLY what is explicitly visible in the selected snippet.
- Use the full file content ONLY to understand naming and placement.
- Do NOT describe the entire file.
- Do NOT repeat the code.
- Do NOT explain obvious syntax.
- Do NOT infer external systems, APIs, or higher-level behavior.
- Do NOT assign importance or responsibility that is not visible.
- If the snippet is a simple wrapper, delegator, or pass-through,
  you MUST explicitly say so and keep the explanation minimal.
- Maximum 4 bullet points TOTAL.

RESPONSE FORMAT (STRICT):

• **Purpose:** One short sentence describing the direct role of this snippet.
• **Behavior:** 1 short bullet describing what it actually does.
• **Inputs / Outputs:** One short bullet, only if non-trivial.
• **Context Note:** OPTIONAL — one short bullet ONLY if it adds concrete value.

IMPORTANT:
- If a section would repeat or speculate, OMIT it.
- Simple code must receive a simple explanation.
`;
