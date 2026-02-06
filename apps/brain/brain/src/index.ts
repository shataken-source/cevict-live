import type { BrainAction, BrainEvent, BrainPriority, BrainRule, BrainHandler } from "./types";
import { loadEnv, getEnvNumber } from "../../../packages/core-logic/src/config";

// Simple in-memory queue for MVP (can be swapped to Redis/Supabase later)
const eventQueue: BrainEvent[] = [];

// Registry of rules (extensible)
let rules: BrainRule[] = [];

// Default timeouts/polling (env-driven)
const env = loadEnv();
const MAX_EVENTS = getEnvNumber("BRAIN_MAX_EVENTS" as any, 500);
const POLL_INTERVAL_MS = getEnvNumber("BRAIN_POLL_INTERVAL_MS" as any, 5000);

export function registerRule(rule: BrainRule) {
  rules.push(rule);
}

export function registerRules(newRules: BrainRule[]) {
  rules.push(...newRules);
}

export function clearRules() {
  rules = [];
}

export function pushEvent(event: Omit<BrainEvent, "id" | "timestamp"> & { id?: string; timestamp?: number }) {
  const enriched: BrainEvent = {
    id: event.id || `brain-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: event.timestamp || Date.now(),
    ...event,
  };
  eventQueue.push(enriched);
  // Trim to max size
  if (eventQueue.length > MAX_EVENTS) {
    eventQueue.splice(0, eventQueue.length - MAX_EVENTS);
  }
}

export async function processNext(): Promise<BrainAction[]> {
  const actions: BrainAction[] = [];
  const evt = eventQueue.shift();
  if (!evt) return actions;
  for (const rule of rules) {
    try {
      if (rule.match(evt)) {
        const action = rule.buildAction(evt);
        if (action) actions.push(action);
      }
    } catch (err) {
      // Swallow rule errors to keep loop alive
      console.warn(`[Brain] Rule ${rule.id} threw`, err);
    }
  }
  return actions;
}

export async function processAll(): Promise<BrainAction[]> {
  const all: BrainAction[] = [];
  while (eventQueue.length > 0) {
    const actions = await processNext();
    all.push(...actions);
  }
  return all;
}

// Basic polling loop starter (non-blocking)
let interval: NodeJS.Timeout | null = null;
export function startBrainLoop(handler: (action: BrainAction) => Promise<void> | void) {
  if (interval) return;
  interval = setInterval(async () => {
    const actions = await processNext();
    for (const act of actions) {
      try {
        await handler(act);
      } catch (err) {
        console.warn("[Brain] Handler error", err);
      }
    }
  }, POLL_INTERVAL_MS);
}

export function stopBrainLoop() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

export type { BrainEvent, BrainAction, BrainRule, BrainPriority, BrainHandler };
export { basicRules } from "./rules/basic";
export { brainConfig } from "./config";

