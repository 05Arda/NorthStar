export const testMessage = () => `
\`\`\`mermaid
flowchart LR
    id1(Box with round corner)
    id2([Stadium])
    id3[(Database)]
    id1-- 1st line ---id2
    id1--> |2nd line| id3
    style id1 fill:green,stroke:black
\`\`\`
`;
