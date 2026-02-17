"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard, Sun, Cloud, Battery, ChefHat, MessageSquare,
  Calendar, Bell, Tv, Map, Wrench, Star, ShoppingCart, Tent, Bird,
  Signal, Wind, Flame, Network, Fish, Music, Settings, Home, Clock, Zap
} from "lucide-react"

import SolarPanel from "./components/SolarPanel"
import WeatherWidget from "./components/WeatherWidget"
import BatteryMonitor from "./components/BatteryMonitor"
import RecipeManager from "./components/RecipeManager"
import CampingChat from "./components/CampingChat"
import TripPlanner from "./components/TripPlanner"
import AlarmClock from "./components/AlarmClock"
import TVGuide from "./components/TVGuide"
import LocalAttractions from "./components/LocalAttractions"
import MaintenanceLog from "./components/MaintenanceLog"
import StarMap from "./components/StarMap"
import SmartShoppingList from "./components/SmartShoppingList"
import FederalCampsites from "./components/FederalCampsites"
import WildlifeSpotter from "./components/WildlifeSpotter"
import CellSignalMapper from "./components/CellSignalMapper"
import AirQualityMonitor from "./components/AirQualityMonitor"
import WildfireTracker from "./components/WildfireTracker"
import MeshNetwork from "./components/MeshNetwork"
import FishingIntelligence from "./components/FishingIntelligence"
import SoundGenerator from "./components/SoundGenerator"
import SettingsPanel, { useSettings, ALL_TABS as TAB_CONFIG } from "./components/SettingsPanel"

const TAB_COMPONENTS: Record<string, React.FC<{compact?: boolean}>> = {
  dashboard: () => null,
  solar: SolarPanel,
  weather: WeatherWidget,
  battery: BatteryMonitor,
  recipes: RecipeManager,
  assistant: CampingChat,
  planner: TripPlanner,
  alarm: AlarmClock,
  tv: TVGuide,
  attractions: LocalAttractions,
  maintenance: MaintenanceLog,
  stars: StarMap,
  shopping: SmartShoppingList,
  campsites: FederalCampsites,
  wildlife: WildlifeSpotter,
  signal: CellSignalMapper,
  air: AirQualityMonitor,
  wildfire: WildfireTracker,
  mesh: MeshNetwork,
  fishing: FishingIntelligence,
  sound: SoundGenerator,
  settings: SettingsPanel
}

export default function WildReadyApp() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [locationName, setLocationName] = useState("")
  const { settings, isLoaded, ALL_TABS } = useSettings()

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!settings.zipCode) return
    fetch(`https://api.zippopotam.us/us/${settings.zipCode}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.places?.[0]) {
          const place = data.places[0]
          setLocationName(`${place["place name"]}, ${place["state abbreviation"]}`)
        }
      })
      .catch(() => setLocationName(""))
  }, [settings.zipCode])

  const visibleTabs = ALL_TABS.filter(tab => 
    tab.id === "dashboard" || 
    tab.id === "settings" || 
    settings.enabledTabs.includes(tab.id)
  )

  const TabIcon = TAB_CONFIG.find(t => t.id === activeTab)?.icon || LayoutDashboard

  if (!isLoaded || !currentTime) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">WildReady</h1>
                <p className="text-xs text-slate-400">Your Off-Grid Command Center</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Home className="w-4 h-4 text-emerald-400" />
                <span>{locationName || `ZIP: ${settings.zipCode}`}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="w-4 h-4" />
                <span suppressHydrationWarning>
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* System Overview Hero */}
            <section className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TabIcon className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white">System Overview</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm text-emerald-400">All Systems Normal</span>
                </div>
              </div>

              {/* Main Metrics - 2x2 grid for tablet */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Current Production</div>
                  <div className="text-2xl font-bold text-emerald-400">2.67<span className="text-sm">kW</span></div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Load</div>
                  <div className="text-2xl font-bold text-amber-400">2.0<span className="text-sm">kW</span></div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Grid</div>
                  <div className="text-2xl font-bold text-rose-400">Importing</div>
                  <div className="text-sm text-slate-400">1.0 kW</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Battery</div>
                  <div className="text-2xl font-bold text-blue-400">84<span className="text-sm">%</span></div>
                  <div className="text-sm text-slate-400">Discharging</div>
                </div>
              </div>

              {/* Energy Today & System Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Energy Today</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400">5.9</div>
                      <div className="text-xs text-slate-400">Solar kWh</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-400">6.7</div>
                      <div className="text-xs text-slate-400">Consumed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">1.3</div>
                      <div className="text-xs text-slate-400">Exported</div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">System Health</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-slate-300">Inverter 24.2°C</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-slate-300">Battery Healthy</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-slate-300">MQTT Connected</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full" /><span className="text-slate-300">Telemetry Live</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Access Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SolarPanel />
              <WeatherWidget />
              <BatteryMonitor />
            </div>
          </div>
        )}

        {activeTab === 'settings' && <SettingsPanel />}
        
        {activeTab !== 'dashboard' && activeTab !== 'settings' && (
          <div className="animate-in fade-in duration-200">
            {(() => {
              const Component = TAB_COMPONENTS[activeTab]
              return Component ? <Component /> : null
            })()}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-400">© 2026 WildReady — Made for the off-grid community</div>
          <a href="https://ko-fi.com/cevict" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
            Support $10
          </a>
        </div>
      </footer>
    </div>
  )
}
