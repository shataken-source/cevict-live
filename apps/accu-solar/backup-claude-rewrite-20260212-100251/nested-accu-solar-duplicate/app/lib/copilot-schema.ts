export type CopilotMode =
  | "quick_check"
  | "deep_optimization"
  | "upgrade_planner"
  | "installer_ready_summary";

export type CopilotSeverity = "info" | "warning" | "critical";

export type CopilotJsonV1 = {
  schema: "cevict.solar_copilot.v1";
  mode: CopilotMode;
  title: string;
  assumptions: string[];
  missing_inputs: Array<{
    key: string;
    question: string;
    priority: "high" | "medium" | "low";
  }>;
  red_flags: Array<{
    severity: CopilotSeverity;
    title: string;
    detail: string;
    why_it_matters: string;
    needed_to_confirm?: string[];
  }>;
  computed: {
    estimated_daily_kwh?: { summer?: number; winter?: number; shoulder?: number };
    system_voltage_hint?: "12V" | "24V" | "48V" | "unknown";
    pv_string_check?: {
      notes: string[];
      risks: string[];
    };
  };
  recommendations: Array<{
    category:
      | "wiring"
      | "sizing"
      | "safety"
      | "tilt_azimuth"
      | "shading"
      | "operations"
      | "monitoring";
    title: string;
    steps: string[];
    expected_impact: "low" | "medium" | "high";
    confidence: "low" | "medium" | "high";
    cost_hint?: "low" | "medium" | "high";
  }>;
  upgrade_path: Array<{
    phase: number;
    title: string;
    description: string;
    roi_rank: number; // 1 = best ROI
    prerequisites: string[];
  }>;
  installer_ready_summary: {
    bill_of_materials: string[];
    notes: string[];
    open_questions: string[];
  };
};
