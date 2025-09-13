import { Streamdown } from "streamdown";

const mermaidExample = `
# Mermaid Chart Test

Here's a flowchart:

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
\`\`\`

And a sequence diagram:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Server
    User->>Browser: Enter URL
    Browser->>Server: HTTP Request
    Server-->>Browser: HTTP Response
    Browser-->>User: Render Page
\`\`\`

And a pie chart:

\`\`\`mermaid
pie title Pet Adoption
    "Dogs" : 386
    "Cats" : 85
    "Rabbits" : 15
\`\`\`
`;

export function MermaidTest() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Streamdown className="prose dark:prose-invert max-w-none">
        {mermaidExample}
      </Streamdown>
    </div>
  );
}
