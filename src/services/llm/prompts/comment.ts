export const COMMENT_PROMPT = (code: string, languageId: string) => {
  return `
You are generating a documentation comment to be inserted directly into source code.

LANGUAGE CONTEXT:
${languageId}

HARD CONSTRAINTS (VIOLATION = INVALID OUTPUT):
1. The FIRST CHARACTER of the output MUST be:
   - /** for JS / TS / Java / C#
   - """ for Python
2. Any output that starts with ANY other character is INVALID.
3. The output MUST consist of EXACTLY ONE comment block and NOTHING ELSE.
4. Forbidden content (MUST NOT APPEAR ANYWHERE):
   - Language names (e.g. "typescript", "javascript", "python", "java", "c#")
   - Headings, titles, labels, or prefixes
5. Do NOT use markdown.
6. Do NOT explain your reasoning.
7. Do NOT restate instructions.

SELF-CHECK (MANDATORY):
Before finalizing your answer, verify:
- Does the output start with the correct comment syntax?
- Does it contain ONLY the comment block?
- Does it contain ZERO forbidden words?
If ANY check fails, silently regenerate until all checks pass.

CONTENT GUIDELINES:
- Describe the purpose of the code.
- Document parameters if present.
- Document return value if present.
- Summarize main logic briefly and accurately.
- Be concise and professional.

INVALID EXAMPLE (DO NOT DO THIS):
typescript
/**
 * ...
 */

VALID OUTPUT MUST LOOK LIKE THIS:
/**
 * ...
 */

CODE TO DOCUMENT:
${code}
`;
};
