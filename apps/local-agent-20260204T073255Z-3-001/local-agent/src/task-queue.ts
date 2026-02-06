/**
 * Task Queue
 * Manages a queue of tasks to be executed
 */

// uuidv4 defined at bottom of file

export interface Task {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private queue: string[] = [];

  add(description: string, priority: Task['priority'] = 'medium'): string {
    const id = uuidv4();
    const task: Task = {
      id,
      description,
      priority,
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(id, task);

    // Insert based on priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.queue.findIndex(
      (taskId) => {
        const t = this.tasks.get(taskId);
        return t && priorityOrder[t.priority] > priorityOrder[priority];
      }
    );

    if (insertIndex === -1) {
      this.queue.push(id);
    } else {
      this.queue.splice(insertIndex, 0, id);
    }

    console.log(`📝 Task added: ${description} [${priority}]`);
    return id;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  getPending(): Task[] {
    return this.queue
      .map((id) => this.tasks.get(id))
      .filter((t): t is Task => !!t && t.status === 'pending');
  }

  next(): Task | undefined {
    const id = this.queue.find(
      (taskId) => this.tasks.get(taskId)?.status === 'pending'
    );
    return id ? this.tasks.get(id) : undefined;
  }

  start(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'running';
      task.startedAt = new Date();
    }
  }

  complete(id: string, result?: any): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      this.removeFromQueue(id);
    }
  }

  fail(id: string, error: string): void {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'failed';
      task.error = error;
      task.completedAt = new Date();
      this.removeFromQueue(id);
    }
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (task && task.status === 'pending') {
      this.tasks.delete(id);
      this.removeFromQueue(id);
      return true;
    }
    return false;
  }

  clear(): void {
    this.tasks.clear();
    this.queue = [];
  }

  size(): number {
    return this.queue.length;
  }

  private removeFromQueue(id: string): void {
    const index = this.queue.indexOf(id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }
}

// Simple UUID generator if uuid package not available
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

