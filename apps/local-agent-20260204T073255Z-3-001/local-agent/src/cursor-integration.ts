/**
 * Cursor IDE Integration
 * Allows Local Agent to be a genius at using Cursor IDE
 * Reads, edits, creates files, understands context
 */

import { guiGenius } from './gui-genius.js';
import { guiController } from './gui-controller.js';
import * as fs from 'fs';
import * as path from 'path';

interface CursorContext {
  workspacePath: string;
  openFiles: string[];
  currentFile: string | null;
  cursorPosition: { line: number; column: number } | null;
}

export class CursorIntegration {
  private workspacePath: string;
  private cursorConfigPath: string;

  constructor() {
    this.workspacePath = process.env.WORKSPACE_PATH || 'C:\\gcc\\cevict-app\\cevict-monorepo';
    this.cursorConfigPath = path.join(this.workspacePath, '.cursor');
  }

  /**
   * Read file content (simulates Cursor reading)
   */
  async readFile(filePath: string): Promise<{
    success: boolean;
    content: string;
    error?: string;
  }> {
    try {
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.workspacePath, filePath);
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      return {
        success: true,
        content,
      };
    } catch (error: any) {
      return {
        success: false,
        content: '',
        error: error.message,
      };
    }
  }

  /**
   * Write/edit file (simulates Cursor editing)
   */
  async writeFile(filePath: string, content: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.workspacePath, filePath);
      
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Edit file (find and replace)
   */
  async editFile(
    filePath: string,
    oldString: string,
    newString: string
  ): Promise<{
    success: boolean;
    error?: string;
    changes?: number;
  }> {
    try {
      const result = await this.readFile(filePath);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const content = result.content;
      const newContent = content.replace(oldString, newString);
      
      if (content === newContent) {
        return { success: false, error: 'No changes made - string not found' };
      }

      const writeResult = await this.writeFile(filePath, newContent);
      if (!writeResult.success) {
        return writeResult;
      }

      return {
        success: true,
        changes: 1,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search codebase (like Cursor search)
   */
  async searchCodebase(
    query: string,
    filePattern?: string
  ): Promise<{
    success: boolean;
    results: Array<{
      file: string;
      line: number;
      content: string;
    }>;
    error?: string;
  }> {
    try {
      const results: Array<{ file: string; line: number; content: string }> = [];
      
      const searchDir = (dir: string) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip node_modules, .git, etc.
            if (['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
              continue;
            }
            searchDir(fullPath);
          } else if (stat.isFile()) {
            // Check file pattern
            if (filePattern && !file.match(filePattern)) {
              continue;
            }
            
            // Search in file
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              
              lines.forEach((line, index) => {
                if (line.toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                    file: fullPath.replace(this.workspacePath, '').replace(/^[\\\/]/, ''),
                    line: index + 1,
                    content: line.trim(),
                  });
                }
              });
            } catch {
              // Skip binary files
            }
          }
        }
      };

      searchDir(this.workspacePath);
      
      return {
        success: true,
        results: results.slice(0, 100), // Limit to 100 results
      };
    } catch (error: any) {
      return {
        success: false,
        results: [],
        error: error.message,
      };
    }
  }

  /**
   * Understand code context (like Cursor AI)
   */
  async understandContext(filePath: string): Promise<{
    success: boolean;
    context: {
      imports: string[];
      exports: string[];
      functions: string[];
      classes: string[];
      dependencies: string[];
    };
    error?: string;
  }> {
    try {
      const result = await this.readFile(filePath);
      if (!result.success) {
        return { success: false, context: this.emptyContext(), error: result.error };
      }

      const content = result.content;
      const context = {
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        functions: this.extractFunctions(content),
        classes: this.extractClasses(content),
        dependencies: this.extractDependencies(content),
      };

      return { success: true, context };
    } catch (error: any) {
      return {
        success: false,
        context: this.emptyContext(),
        error: error.message,
      };
    }
  }

  /**
   * Create file with AI understanding
   */
  async createFileWithContext(
    filePath: string,
    instruction: string
  ): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      // Use GUI Genius to understand what to create
      const result = await guiGenius.executeWithIntelligence(
        `Create file ${filePath} with: ${instruction}`
      );

      if (result.success) {
        // Generate file content based on instruction
        const content = await this.generateFileContent(filePath, instruction);
        const writeResult = await this.writeFile(filePath, content);
        
        return {
          success: writeResult.success,
          content: writeResult.success ? content : undefined,
          error: writeResult.error,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to understand instruction',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate file content based on instruction
   */
  private async generateFileContent(filePath: string, instruction: string): Promise<string> {
    const ext = path.extname(filePath);
    
    // Basic template generation
    if (ext === '.ts' || ext === '.tsx') {
      return this.generateTypeScriptFile(instruction);
    } else if (ext === '.js' || ext === '.jsx') {
      return this.generateJavaScriptFile(instruction);
    } else if (ext === '.md') {
      return this.generateMarkdownFile(instruction);
    } else if (ext === '.json') {
      return this.generateJSONFile(instruction);
    }
    
    return `// ${instruction}\n`;
  }

  private generateTypeScriptFile(instruction: string): string {
    return `/**
 * ${instruction}
 */

export class ${this.extractClassName(instruction)} {
  constructor() {
    // TODO: Implement
  }
}
`;
  }

  private generateJavaScriptFile(instruction: string): string {
    return `/**
 * ${instruction}
 */

module.exports = {
  // TODO: Implement
};
`;
  }

  private generateMarkdownFile(instruction: string): string {
    return `# ${instruction}

## Overview

${instruction}

## Details

TODO: Add details
`;
  }

  private generateJSONFile(instruction: string): string {
    return JSON.stringify({
      description: instruction,
      // TODO: Add structure
    }, null, 2);
  }

  private extractClassName(instruction: string): string {
    const match = instruction.match(/(?:class|create|make)\s+(\w+)/i);
    return match ? match[1] : 'GeneratedClass';
  }

  /**
   * Extract imports from code
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  /**
   * Extract exports from code
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  /**
   * Extract functions from code
   */
  private extractFunctions(content: string): string[] {
    const functions: string[] = [];
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
    return functions;
  }

  /**
   * Extract classes from code
   */
  private extractClasses(content: string): string[] {
    const classes: string[] = [];
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
    return classes;
  }

  /**
   * Extract dependencies from code
   */
  private extractDependencies(content: string): string[] {
    // Check package.json if available
    try {
      const packageJsonPath = path.join(this.workspacePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return Object.keys(packageJson.dependencies || {});
      }
    } catch {
      // Ignore
    }
    return [];
  }

  private emptyContext() {
    return {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      dependencies: [],
    };
  }

  /**
   * Smart code operation - understands natural language
   */
  async smartCodeOperation(instruction: string): Promise<{
    success: boolean;
    result: any;
    error?: string;
  }> {
    const lower = instruction.toLowerCase();

    // Detect operation type
    if (lower.includes('read') || lower.includes('view') || lower.includes('show')) {
      const fileMatch = instruction.match(/(?:read|view|show)\s+(.+?)(?:\s|$)/i);
      if (fileMatch) {
        const filePath = fileMatch[1].trim();
        return await this.readFile(filePath);
      }
    }

    if (lower.includes('edit') || lower.includes('change') || lower.includes('update')) {
      // Use GUI Genius to understand edit
      return await guiGenius.executeWithIntelligence(instruction);
    }

    if (lower.includes('create') || lower.includes('make') || lower.includes('new file')) {
      const fileMatch = instruction.match(/(?:create|make|new)\s+(?:file\s+)?(.+?)(?:\s+with|\s+that|$)/i);
      if (fileMatch) {
        const filePath = fileMatch[1].trim();
        return await this.createFileWithContext(filePath, instruction);
      }
    }

    if (lower.includes('search') || lower.includes('find')) {
      const queryMatch = instruction.match(/(?:search|find)\s+(.+?)(?:\s+in|\s|$)/i);
      if (queryMatch) {
        const query = queryMatch[1].trim();
        return await this.searchCodebase(query);
      }
    }

    // Default: use GUI Genius
    return await guiGenius.executeWithIntelligence(instruction);
  }
}

export const cursorIntegration = new CursorIntegration();

