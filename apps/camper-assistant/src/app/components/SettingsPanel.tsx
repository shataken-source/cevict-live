"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  MapPin,
  Zap,
  Bluetooth,
  Wifi,
  Battery,
  Mail,
  Smartphone,
  Check,
  LayoutDashboard,
  Sun,
  Cloud,
  ChefHat,
  MessageSquare,
  Calendar,
  Bell,
  Tv,
  Map,
  Wrench,
  Star,
  ShoppingCart,
  Tent,
  Bird,
  Signal,
  Wind,
  Flame,
  Network,
  Fish,
  Music,
  type LucideIcon
} from "lucide-react"

interface TabConfig {
  id: string
  label: string
  icon: LucideIcon
  defaultEnabled: boolean
}

export const ALL_TABS: TabConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, defaultEnabled: true },
  { id: "solar", label: "Solar", icon: Sun, defaultEnabled: true },
  { id: "weather", label: "Weather", icon: Cloud, defaultEnabled: true },
  { id: "battery", label: "Battery", icon: Battery, defaultEnabled: true },
  { id: "recipes", label: "Recipes", icon: ChefHat, defaultEnabled: false },
  { id: "assistant", label: "Assistant", icon: MessageSquare, defaultEnabled: false },
  { id: "planner", label: "Trip Planner", icon: Calendar, defaultEnabled: false },
  { id: "alarm", label: "Alarm", icon: Bell, defaultEnabled: false },
  { id: "tv", label: "TV Guide", icon: Tv, defaultEnabled: false },
  { id: "attractions", label: "Local Explorer", icon: Map, defaultEnabled: false },
  { id: "maintenance", label: "Maintenance", icon: Wrench, defaultEnabled: false },
  { id: "stars", label: "Night Sky", icon: Star, defaultEnabled: false },
  { id: "shopping", label: "AI Shopping", icon: ShoppingCart, defaultEnabled: false },
  { id: "campsites", label: "Federal Campsites", icon: Tent, defaultEnabled: false },
  { id: "wildlife", label: "Wildlife", icon: Bird, defaultEnabled: false },
  { id: "signal", label: "Cell Signal", icon: Signal, defaultEnabled: false },
  { id: "air", label: "Air Quality", icon: Wind, defaultEnabled: false },
  { id: "wildfire", label: "Wildfire", icon: Flame, defaultEnabled: false },
  { id: "mesh", label: "Mesh Network", icon: Network, defaultEnabled: false },
  { id: "fishing", label: "Fishing", icon: Fish, defaultEnabled: false },
  { id: "sound", label: "Sounds", icon: Music, defaultEnabled: false },
]

interface UserSettings {
  zipCode: string
  enabledTabs: string[]
  email: string
  smsEnabled: boolean
  name: string
}

const DEFAULT_SETTINGS: UserSettings = {
  zipCode: "82190",
  enabledTabs: ALL_TABS.filter(t => t.defaultEnabled).map(t => t.id),
  email: "",
  smsEnabled: false,
  name: ""
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("wildready-settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      } catch {
        setSettings(DEFAULT_SETTINGS)
      }
    }
    setIsLoaded(true)
  }, [])

  const saveSettings = (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem("wildready-settings", JSON.stringify(updated))
  }

  return { settings, saveSettings, isLoaded, ALL_TABS }
}

export default function SettingsPanel() {
  const { settings, saveSettings, isLoaded, ALL_TABS } = useSettings()
  const [zipInput, setZipInput] = useState(settings.zipCode)
  const [subscribed, setSubscribed] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [nameInput, setNameInput] = useState("")

  useEffect(() => {
    setZipInput(settings.zipCode)
    setEmailInput(settings.email)
    setNameInput(settings.name)
  }, [settings])

  const handleZipUpdate = () => {
    if (zipInput.match(/^\d{5}$/)) {
      saveSettings({ zipCode: zipInput })
    }
  }

  const toggleTab = (tabId: string) => {
    const newEnabled = settings.enabledTabs.includes(tabId)
      ? settings.enabledTabs.filter(id => id !== tabId)
      : [...settings.enabledTabs, tabId]
    saveSettings({ enabledTabs: newEnabled })
  }

  const handleSubscribe = async () => {
    if (!emailInput.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return

    saveSettings({
      email: emailInput,
      name: nameInput,
      smsEnabled: false
    })

    try {
      const response = await fetch("/api/subscribe/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, name: nameInput })
      })

      if (response.ok) {
        setSubscribed(true)
        setTimeout(() => setSubscribed(false), 3000)
      }
    } catch (error) {
      console.error("Subscribe failed:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleZipUpdate()
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Location Settings */}
      <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Location</h3>
            <p className="text-sm text-slate-400">Used across all tabs for local data</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleZipUpdate}
            placeholder="ZIP Code"
            className="w-32 bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            maxLength={5}
          />
          <button
            onClick={handleZipUpdate}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            Update
          </button>
          <span className="text-sm text-slate-400">
            All tabs use this ZIP code
          </span>
        </div>
      </section>

      {/* Accu-Solar Command */}
      <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Accu-Solar Command</h3>
            <p className="text-sm text-slate-400">24/7 monitoring • forecasting • operator-grade telemetry</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">MQTT</span>
            </div>
            <span className="text-sm font-medium text-emerald-400">Connected</span>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Bluetooth className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">BLE</span>
            </div>
            <span className="text-sm font-medium text-slate-400">Standby</span>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Battery className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Victron</span>
            </div>
            <span className="text-sm font-medium text-emerald-400">Active</span>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Battery className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Inverter</span>
            </div>
            <span className="text-sm font-medium text-amber-400">24.2°C</span>
          </div>
        </div>
      </section>

      {/* Tab Favorites */}
      <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Tab Favorites</h3>
            <p className="text-sm text-slate-400">Choose which tabs appear in your navigation</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {ALL_TABS.map((tab) => {
            const Icon = tab.icon
            const isEnabled = settings.enabledTabs.includes(tab.id)

            return (
              <button
                key={tab.id}
                onClick={() => toggleTab(tab.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${isEnabled
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-slate-700/50 border-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{tab.label}</span>
                {isEnabled && <Check className="w-4 h-4 ml-auto shrink-0" />}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Tip: Keep your most-used tabs enabled for quick access. Dashboard is always visible.
        </p>
      </section>

      {/* Stay in the Loop */}
      <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Mail className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Stay in the Loop</h3>
            <p className="text-sm text-slate-400">Get camping tips, weather alerts & gear recommendations</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Email</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg opacity-50">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">SMS (Soon)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
            />
            <input
              type="email"
              placeholder="Enter your email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={handleSubscribe}
            disabled={!emailInput.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
          >
            {subscribed ? "Subscribed!" : "Subscribe"}
          </button>

          <p className="text-xs text-slate-500">
            We respect your privacy. Unsubscribe anytime. SMS rates may apply.
          </p>
        </div>
      </section>
    </div>
  )
}
