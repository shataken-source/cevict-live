/**
 * Documentation Bot
 * Specialist in technical documentation, API docs, and knowledge management
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Docu (Documentation)',
  specialty: 'Technical Writing, API Documentation, Knowledge Management',
  systemPrompt: `You are Docu, an expert documentation AI assistant specializing in:
- Technical Documentation
- API Documentation (OpenAPI/Swagger)
- README and Getting Started Guides
- Code Comments and JSDoc
- User Guides and Tutorials
- Architecture Documentation
- Changelog and Release Notes
- Knowledge Base Articles

You write clear, concise, and user-friendly documentation.
You follow documentation best practices and standards.
You help maintain consistent documentation across projects.`,
  learningTopics: [
    'Documentation best practices',
    'API documentation standards',
    'README templates and patterns',
    'Technical writing techniques',
    'Documentation tools and generators',
    'Markdown advanced features',
    'Diagram and visualization tools',
    'Versioned documentation strategies',
  ],
  dailyTasks: [
    'Review documentation for outdated content',
    'Generate missing API documentation',
    'Update changelog entries',
    'Check README completeness',
  ],
};

export class DocumentationBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review documentation for outdated content':
        return this.reviewDocs();
      case 'Generate missing API documentation':
        return this.generateAPIDocs();
      case 'Update changelog entries':
        return this.updateChangelog();
      case 'Check README completeness':
        return this.checkREADME();
      default:
        return this.ask(task);
    }
  }

  private async reviewDocs(): Promise<string> {
    return this.ask(`What are the best practices for reviewing technical documentation?
Include:
1. Accuracy checklist
2. Completeness verification
3. Readability assessment
4. Version consistency
5. Link validation
6. Code example testing`);
  }

  private async generateAPIDocs(): Promise<string> {
    return this.ask(`How to generate comprehensive API documentation for a Next.js API?
Include:
1. Endpoint documentation structure
2. Request/response examples
3. Error handling documentation
4. Authentication documentation
5. Rate limiting documentation
6. OpenAPI/Swagger integration`);
  }

  private async updateChangelog(): Promise<string> {
    return this.ask(`Best practices for maintaining a CHANGELOG.md:
1. Format standards (Keep a Changelog)
2. Version numbering (SemVer)
3. Entry categorization
4. Writing effective entries
5. Automation options`);
  }

  private async checkREADME(): Promise<string> {
    return this.ask(`What should a complete README.md include?
1. Project description
2. Installation instructions
3. Usage examples
4. Configuration options
5. Contributing guidelines
6. License information
7. Badges and shields`);
  }

  /**
   * Generate README
   */
  async generateREADME(projectInfo: string): Promise<string> {
    return this.ask(`Generate a comprehensive README.md for: ${projectInfo}
Include all standard sections with placeholder content.
Use markdown best practices.`);
  }

  /**
   * Document API endpoint
   */
  async documentEndpoint(endpoint: string, code: string): Promise<string> {
    return this.ask(`Document this API endpoint: ${endpoint}

Code:
\`\`\`typescript
${code}
\`\`\`

Generate:
1. Description
2. Request parameters
3. Request body schema
4. Response schema
5. Error responses
6. Example request/response
7. Authentication requirements`);
  }

  /**
   * Generate JSDoc comments
   */
  async generateJSDoc(code: string): Promise<string> {
    return this.ask(`Generate JSDoc comments for this code:

\`\`\`typescript
${code}
\`\`\`

Include @param, @returns, @throws, @example where appropriate.`);
  }

  /**
   * Create user guide
   */
  async createUserGuide(feature: string): Promise<string> {
    return this.ask(`Create a user guide for: ${feature}
Include:
1. Overview
2. Prerequisites
3. Step-by-step instructions
4. Screenshots placeholders
5. Troubleshooting
6. FAQs`);
  }

  /**
   * Generate architecture document
   */
  async generateArchDoc(system: string): Promise<string> {
    return this.ask(`Generate architecture documentation for: ${system}
Include:
1. System overview
2. Component diagram (as ASCII or Mermaid)
3. Data flow
4. Technology stack
5. Integration points
6. Scalability considerations`);
  }
}

