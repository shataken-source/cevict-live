// Server-only Brain bootstrap (no-op in browser)
import * as brain from "../src";

let started = false;
let inFlight = 0;

async function logBrain(level: "info" | "warn" | "error", event: string, details?: any) {
  const payload = { ts: new Date().toISOString(), component: "brain", level, event, ...details };
  console.log(JSON.stringify(payload));
  if (brain.brainConfig.logWebhookUrl && level !== "info") {
    try {
      await fetch(brain.brainConfig.logWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(brain.brainConfig.logWebhookToken ? { Authorization: `Bearer ${brain.brainConfig.logWebhookToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore webhook errors
    }
  }
}

async function dispatchAction(action: brain.BrainAction) {
  if (!brain.brainConfig.allowedTargets.includes(action.target)) {
    await logBrain("warn", "dispatch_skipped_disallowed_target", { target: action.target });
    return;
  }

  // Import metrics tracker
  const { getMetricsTracker } = await import("./metrics-tracker");
  const metrics = getMetricsTracker();
  metrics.recordEvent(action.command || "dispatch", action.priority || "medium");

  const startTime = Date.now();
  const doRequest = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), brain.brainConfig.dispatchTimeoutMs);
    try {
      const res = await fetch(brain.brainConfig.dispatchUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(brain.brainConfig.dispatchToken ? { Authorization: `Bearer ${brain.brainConfig.dispatchToken}` } : {}),
        },
        body: JSON.stringify({
          target: action.target,
          payload: {
            command: action.command,
            args: action.args,
            priority: action.priority,
          },
        }),
      });
      if (!res.ok) throw new Error(`Dispatch failed: ${res.status} ${res.statusText}`);
      const duration = Date.now() - startTime;
      metrics.recordDispatch(true, duration);
      await logBrain("info", "dispatch_completed", { target: action.target });
    } finally {
      clearTimeout(timeout);
    }
  };
  let attempt = 0;
  while (attempt <= brain.brainConfig.retries) {
    try {
      await doRequest();
      return;
    } catch (err: any) {
      await logBrain("warn", "dispatch_retry", { target: action.target, attempt, error: err?.message });
      if (attempt === brain.brainConfig.retries) {
        const duration = Date.now() - startTime;
        metrics.recordDispatch(false, duration);
        await logBrain("error", "dispatch_failed", { target: action.target, error: err?.message });
        return;
      }
      const delay = brain.brainConfig.retryDelaysMs[attempt] || 1000;
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}

async function runHealthChecks() {
  // Import metrics tracker
  const { getMetricsTracker } = await import("./metrics-tracker");
  const metrics = getMetricsTracker();

  const entries = Object.entries(brain.brainConfig.healthChecks);
  for (const [service, url] of entries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), brain.brainConfig.healthTimeoutMs);
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const res = await fetch(url, { signal: controller.signal });
      const responseTime = Date.now() - startTime;
      const ok = res.ok;
      let statusOk = false;
      try {
        const body = await res.json();
        statusOk = body?.status === "ok";
        // Surface issues reported by the endpoint (e.g., cron failures)
        if (body?.issues && Array.isArray(body.issues) && body.issues.length > 0) {
          brain.pushEvent({
            type: "health_check_failed",
            source: service,
            priority: "high",
            message: `Health check reported issues for ${service}`,
            payload: { service, url, issues: body.issues, http: res.status },
          });
          metrics.recordEvent("health_check_failed", "high");
        } else {
          success = true;
        }
      } catch {
        statusOk = false;
      }
      if (!(ok && statusOk)) {
        error = `HTTP ${res.status}`;
        brain.pushEvent({
          type: "health_check_failed",
          source: service,
          priority: "high",
          message: `Health check failed for ${service}`,
          payload: { service, url, http: res.status },
        });
        metrics.recordEvent("health_check_failed", "high");
        await logBrain("error", "health_check_failed", { service, url, http: res.status });
      } else if (success) {
        metrics.recordEvent("health_check_success", "low");
      }

      // Record metrics
      metrics.recordHealthCheck(service, success && ok && statusOk, responseTime, error);
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      error = err?.message || "unknown";
      brain.pushEvent({
        type: "health_check_failed",
        source: service,
        priority: "high",
        message: `Health check error for ${service}: ${error}`,
        payload: { service, url, error },
      });
      metrics.recordEvent("health_check_error", "high");
      metrics.recordHealthCheck(service, false, responseTime, error);
      await logBrain("error", "health_check_error", { service, url, error });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function ensureStarted() {
  if (typeof window !== "undefined") return; // server-only
  if (started) return;
  brain.registerRules(brain.basicRules);

  // Start key expiry monitoring
  try {
    const { startKeyMonitoring } = require("./key-expiry-monitor");
    startKeyMonitoring();
  } catch (err) {
    // Ignore if module not found
  }

  brain.startBrainLoop(async (action: brain.BrainAction) => {
    if (inFlight >= brain.brainConfig.maxConcurrent) {
      await logBrain("warn", "dispatch_skipped_max_concurrent", { target: action.target });
      return;
    }
    inFlight++;
    try {
      await dispatchAction(action);
      await runHealthChecks();
    } finally {
      inFlight--;
    }
  });
  started = true;
}

export function emitBrainEvent(event: Omit<brain.BrainEvent, "id" | "timestamp">) {
  if (typeof window !== "undefined") return; // skip client
  ensureStarted();
  brain.pushEvent(event);
}

export function stopBrain() {
  if (started) {
    brain.stopBrainLoop();
    started = false;
  }
}

