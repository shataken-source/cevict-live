/**
 * File Manager
 * Handles file operations for the local agent
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
}

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

export class FileManager {
  private workspace: string;

  constructor(workspace: string) {
    this.workspace = workspace;
  }

  async read(filePath: string): Promise<string> {
    const fullPath = this.resolvePath(filePath);
    console.log(`📖 Reading: ${fullPath}`);
    return fs.readFile(fullPath, 'utf-8');
  }

  async write(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    console.log(`✏️ Writing: ${fullPath}`);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async append(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    console.log(`➕ Appending to: ${fullPath}`);
    await fs.appendFile(fullPath, content, 'utf-8');
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    console.log(`🗑️ Deleting: ${fullPath}`);
    await fs.unlink(fullPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(dirPath: string = '.'): Promise<FileInfo[]> {
    const fullPath = this.resolvePath(dirPath);
    console.log(`📂 Listing: ${fullPath}`);

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files: FileInfo[] = [];

    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name);
      try {
        const stat = await fs.stat(entryPath);
        files.push({
          name: entry.name,
          path: path.relative(this.workspace, entryPath),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          modified: stat.mtime,
        });
      } catch {
        // Skip files we can't stat
      }
    }

    return files;
  }

  async search(pattern: string, searchPath: string = '.'): Promise<SearchResult[]> {
    const fullPath = this.resolvePath(searchPath);
    console.log(`🔍 Searching for "${pattern}" in ${fullPath}`);

    try {
      // Use ripgrep if available, otherwise use PowerShell
      const { stdout } = await execAsync(
        `rg --line-number --no-heading "${pattern}" || Select-String -Path "${fullPath}\\*" -Pattern "${pattern}" -SimpleMatch`,
        { cwd: fullPath, maxBuffer: 10 * 1024 * 1024 }
      );

      const results: SearchResult[] = [];
      const lines = stdout.split('\n').filter(Boolean);

      for (const line of lines.slice(0, 100)) {
        // Parse ripgrep output: file:line:content
        const match = line.match(/^([^:]+):(\d+):(.*)$/);
        if (match) {
          results.push({
            file: match[1],
            line: parseInt(match[2]),
            content: match[3].trim(),
          });
        }
      }

      return results;
    } catch (error) {
      console.log('Search returned no results');
      return [];
    }
  }

  async replace(
    filePath: string,
    oldString: string,
    newString: string
  ): Promise<boolean> {
    const content = await this.read(filePath);
    if (!content.includes(oldString)) {
      console.log(`⚠️ String not found in ${filePath}`);
      return false;
    }

    const newContent = content.replace(oldString, newString);
    await this.write(filePath, newContent);
    console.log(`✅ Replaced in ${filePath}`);
    return true;
  }

  async replaceAll(
    filePath: string,
    oldString: string,
    newString: string
  ): Promise<number> {
    const content = await this.read(filePath);
    const regex = new RegExp(oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    const count = matches?.length || 0;

    if (count > 0) {
      const newContent = content.replace(regex, newString);
      await this.write(filePath, newContent);
      console.log(`✅ Replaced ${count} occurrences in ${filePath}`);
    }

    return count;
  }

  async mkdir(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${fullPath}`);
  }

  async copy(src: string, dest: string): Promise<void> {
    const srcPath = this.resolvePath(src);
    const destPath = this.resolvePath(dest);
    await fs.copyFile(srcPath, destPath);
    console.log(`📋 Copied ${srcPath} to ${destPath}`);
  }

  async move(src: string, dest: string): Promise<void> {
    const srcPath = this.resolvePath(src);
    const destPath = this.resolvePath(dest);
    await fs.rename(srcPath, destPath);
    console.log(`📦 Moved ${srcPath} to ${destPath}`);
  }

  async getSize(filePath: string): Promise<number> {
    const fullPath = this.resolvePath(filePath);
    const stat = await fs.stat(fullPath);
    return stat.size;
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.workspace, filePath);
  }
}

