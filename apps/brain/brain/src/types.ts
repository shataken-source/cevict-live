export type BrainPriority = "info" | "low" | "medium" | "high" | "critical";

export interface BrainEvent {
  id: string;
  source: string;
  type: string;
  message?: string;
  payload?: any;
  priority: BrainPriority;
  timestamp: number;
}

export interface BrainAction {
  target: string; // agent or service name
  command: string; // description or verb
  args?: any;
  priority: BrainPriority;
}

export interface BrainRule {
  id: string;
  description: string;
  match: (event: BrainEvent) => boolean;
  buildAction: (event: BrainEvent) => BrainAction | null;
}

export type BrainHandler = (action: BrainAction) => Promise<void> | void;

