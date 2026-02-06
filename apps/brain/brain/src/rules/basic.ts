import { BrainRule } from "../types";

// Example: escalate failed provider fetches
export const providerFailureRule: BrainRule = {
  id: "provider-failure",
  description: "Escalate provider failures to agent",
  match: (event) =>
    event.type === "provider.failure" ||
    event.type === "provider.key_missing" ||
    event.type === "provider.auth_error",
  buildAction: (event) => ({
    target: "agent:ops",
    command: "handle-provider-issue",
    args: { source: event.source, message: event.message, payload: event.payload },
    priority: event.priority,
  }),
};

// Example: key expiry warnings
export const keyExpiryRule: BrainRule = {
  id: "key-expiry",
  description: "Notify on impending key expiry",
  match: (event) => event.type === "secret.expiring",
  buildAction: (event) => ({
    target: "agent:ops",
    command: "rotate-key",
    args: { provider: event.payload?.provider, expiresAt: event.payload?.expiresAt },
    priority: event.priority,
  }),
};

// Example: job failure
export const jobFailureRule: BrainRule = {
  id: "job-failure",
  description: "Dispatch on failed scheduled job",
  match: (event) => event.type === "job.failed",
  buildAction: (event) => ({
    target: "agent:ops",
    command: "investigate-job",
    args: { job: event.payload?.job, error: event.payload?.error },
    priority: event.priority,
  }),
};

// Odds fetch failure rule
export const oddsFetchFailureRule: BrainRule = {
  id: "odds-fetch-failure",
  description: "Handle odds fetch failures",
  match: (event) => event.type === "odds-fetch-failed",
  buildAction: (event) => ({
    target: "agent:progno",
    command: "investigate-odds-fetch-failure",
    args: { source: event.source, message: event.message, payload: event.payload },
    priority: event.priority,
  }),
};

// Bubble isolation warning rule
export const bubbleIsolationRule: BrainRule = {
  id: "bubble-isolation",
  description: "Handle bubble isolation breaches",
  match: (event) => event.type === "bubble-isolation-warning",
  buildAction: (event) => ({
    target: "agent:forge",
    command: "investigate-bubble-isolation",
    args: { bubbleId: event.payload?.bubbleId, details: event.payload },
    priority: "high",
  }),
};

// Self-healing: health check failure rule
export const healthCheckFailureRule: BrainRule = {
  id: "health-check-failure",
  description: "Auto-restart service on health check failure",
  match: (event) => event.type === "health_check_failed" && event.priority === "high",
  buildAction: (event) => ({
    target: "agent:ops",
    command: "restart_service",
    args: { service: event.payload?.service || event.source, reason: event.message },
    priority: "high",
  }),
};

// Cron job failure rule
export const cronFailureRule: BrainRule = {
  id: "cron-failure",
  description: "Handle cron job failures",
  match: (event) => event.type === "cron.failed" || event.type === "job-timeout",
  buildAction: (event) => ({
    target: "agent:devops",
    command: "investigate-cron-failure",
    args: { job: event.payload?.job || event.source, error: event.message, payload: event.payload },
    priority: event.priority,
  }),
};

export const basicRules = [
  providerFailureRule,
  keyExpiryRule,
  jobFailureRule,
  oddsFetchFailureRule,
  bubbleIsolationRule,
  healthCheckFailureRule,
  cronFailureRule,
];

