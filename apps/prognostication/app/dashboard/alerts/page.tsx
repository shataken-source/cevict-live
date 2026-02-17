"use client"

import { useState } from "react"
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, TrendingUp, Zap } from "lucide-react"

interface Alert {
  id: string
  name: string
  type: "ev_threshold" | "new_signal" | "confidence" | "divergence"
  condition: string
  value: string
  active: boolean
  notifications: string[]
}

const sampleAlerts: Alert[] = [
  {
    id: "alt_001",
    name: "High EV Alert",
    type: "ev_threshold",
    condition: "Edge >",
    value: "5%",
    active: true,
    notifications: ["email", "in_app"]
  },
  {
    id: "alt_002",
    name: "New NFL Signal",
    type: "new_signal",
    condition: "Category =",
    value: "Sports",
    active: true,
    notifications: ["email"]
  },
  {
    id: "alt_003",
    name: "High Confidence Only",
    type: "confidence",
    condition: "Confidence =",
    value: "HIGH",
    active: false,
    notifications: ["in_app"]
  }
]

const alertTypes = [
  { id: "ev_threshold", label: "EV Threshold", icon: TrendingUp, desc: "Trigger when edge exceeds value" },
  { id: "new_signal", label: "New Signal", icon: Bell, desc: "Trigger on new signals in category" },
  { id: "confidence", label: "Confidence Level", icon: Zap, desc: "Trigger on confidence threshold" },
  { id: "divergence", label: "Market Divergence", icon: AlertTriangle, desc: "Trigger on cross-platform spread" }
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(sampleAlerts)
  const [showCreate, setShowCreate] = useState(false)

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, active: !a.active } : a
    ))
  }

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Alerts</h1>
          <p className="text-text-secondary mt-1">
            Get notified when high-value opportunities appear
          </p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
        >
          <Plus size={18} />
          Create Alert
        </button>
      </div>

      {/* Active Alerts */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={`bg-panel border rounded-xl p-6 transition ${
              alert.active ? "border-border" : "border-border/50 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  alert.active ? "bg-primary/10" : "bg-surface"
                }`}>
                  <Bell size={20} className={alert.active ? "text-primary" : "text-text-muted"} />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{alert.name}</h3>
                  <p className="text-sm text-text-muted">
                    {alert.condition} {alert.value} • {alert.notifications.join(" + ").replace("_", " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => toggleAlert(alert.id)}
                  className="text-text-muted hover:text-text-primary transition"
                >
                  {alert.active ? (
                    <ToggleRight size={28} className="text-success" />
                  ) : (
                    <ToggleLeft size={28} />
                  )}
                </button>
                <button 
                  onClick={() => deleteAlert(alert.id)}
                  className="text-text-muted hover:text-danger transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Alert Modal (simplified inline) */}
      {showCreate && (
        <div className="bg-panel border border-border rounded-xl p-6">
          <h3 className="font-semibold text-text-primary mb-4">Create New Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {alertTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  className="flex items-start gap-3 p-4 bg-surface border border-border rounded-lg hover:border-primary transition text-left"
                >
                  <Icon size={20} className="text-primary mt-1" />
                  <div>
                    <div className="font-medium text-text-primary">{type.label}</div>
                    <div className="text-xs text-text-muted">{type.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition">
              Continue Setup
            </button>
          </div>
        </div>
      )}

      {/* Delivery Methods */}
      <div className="bg-panel border border-border rounded-xl p-6">
        <h3 className="font-semibold text-text-primary mb-4">Notification Delivery</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
            <div>
              <div className="font-medium text-text-primary">In-App</div>
              <div className="text-xs text-text-muted">Dashboard notifications</div>
            </div>
            <ToggleRight size={28} className="text-success" />
          </div>
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
            <div>
              <div className="font-medium text-text-primary">Email</div>
              <div className="text-xs text-text-muted">user@example.com</div>
            </div>
            <ToggleRight size={28} className="text-success" />
          </div>
          <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
            <div>
              <div className="font-medium text-text-primary">Webhook</div>
              <div className="text-xs text-text-muted">Enterprise only</div>
            </div>
            <ToggleLeft size={28} className="text-text-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
