"use client"

import { useState } from "react"
import { User, Bell, Shield, Key, CreditCard, ChevronRight, Check } from "lucide-react"
import Link from "next/link"

const settingsSections = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Manage your account information"
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Email and alert preferences"
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Password and 2FA settings"
  },
  {
    id: "api",
    label: "API Keys",
    icon: Key,
    description: "Manage API access tokens"
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    description: "Subscription and payment methods"
  }
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 shrink-0 space-y-2">
          {settingsSections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                  activeSection === section.id
                    ? "bg-panel border border-border text-text-primary"
                    : "text-text-secondary hover:bg-panel hover:text-text-primary"
                }`}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-panel border border-border rounded-xl p-6">
          {activeSection === "profile" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">Profile Information</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-2">Full Name</label>
                  <input
                    type="text"
                    defaultValue="John Doe"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="john@example.com"
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-2">Trading Experience</label>
                  <select className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary">
                    <option>Beginner (&lt; 1 year)</option>
                    <option>Intermediate (1-3 years)</option>
                    <option>Advanced (3-5 years)</option>
                    <option>Professional (5+ years)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { label: "New Signal Alerts", desc: "Get notified when high-EV signals are released", checked: true },
                  { label: "Daily Digest", desc: "Summary of today's signals and performance", checked: true },
                  { label: "Market Updates", desc: "Important changes in tracked markets", checked: false },
                  { label: "Product Updates", desc: "New features and improvements", checked: false }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                    <div>
                      <div className="font-medium text-text-primary">{item.label}</div>
                      <div className="text-sm text-text-muted">{item.desc}</div>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative cursor-pointer ${item.checked ? "bg-success" : "bg-border"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${item.checked ? "left-7" : "left-1"}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">Security Settings</h2>
              <div className="space-y-4">
                <div className="p-4 bg-surface rounded-lg">
                  <div className="font-medium text-text-primary mb-2">Change Password</div>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current password"
                      className="w-full bg-panel border border-border rounded-lg px-4 py-2 text-text-primary placeholder:text-text-muted"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      className="w-full bg-panel border border-border rounded-lg px-4 py-2 text-text-primary placeholder:text-text-muted"
                    />
                  </div>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-text-primary">Two-Factor Authentication</div>
                      <div className="text-sm text-text-muted">Add an extra layer of security</div>
                    </div>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "api" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">API Keys</h2>
              <div className="space-y-4">
                <div className="p-4 bg-surface rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-text-primary">Production Key</div>
                    <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">Active</span>
                  </div>
                  <div className="font-mono text-sm text-text-muted">pk_live_••••••••••••••••</div>
                  <div className="flex items-center gap-2 mt-3">
                    <button className="text-sm text-primary hover:underline">Reveal</button>
                    <span className="text-text-muted">•</span>
                    <button className="text-sm text-primary hover:underline">Rotate</button>
                  </div>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <div className="font-medium text-text-primary mb-2">Rate Limits</div>
                  <div className="text-sm text-text-muted">
                    100 requests/minute • 10,000 requests/day
                  </div>
                  <Link href="/dashboard/api" className="text-sm text-primary hover:underline mt-2 inline-block">
                    View API Documentation →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeSection === "billing" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">Billing & Subscription</h2>
              <div className="space-y-4">
                <div className="p-4 bg-surface rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-text-primary">Current Plan</div>
                      <div className="text-2xl font-semibold text-text-primary mt-1">Pro</div>
                    </div>
                    <Link 
                      href="/pricing"
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition"
                    >
                      Upgrade
                    </Link>
                  </div>
                  <div className="text-sm text-text-muted">
                    $19/month • Renews Feb 15, 2025
                  </div>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <div className="font-medium text-text-primary mb-2">Payment Method</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-border rounded flex items-center justify-center text-xs">VISA</div>
                    <span className="text-sm text-text-secondary">•••• 4242</span>
                    <span className="text-xs text-text-muted">Expires 12/26</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-4">
            {saved && (
              <span className="text-sm text-success flex items-center gap-1">
                <Check size={16} />
                Saved successfully
              </span>
            )}
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
