"use client"

import { useState, useEffect, useRef } from "react"
import {
  LayoutDashboard, Sun, Cloud, Battery, ChefHat, MessageSquare,
  Calendar, Bell, Tv, Map, Wrench, Star, ShoppingCart, Tent, Bird,
  Signal, Wind, Flame, Network, Fish, Music, Settings, Home, Clock,
  Zap, ChevronDown, AlertCircle, CheckCircle2, Power, TrendingUp
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
import SettingsPanel, { useSettings } from "./components/SettingsPanel"
import { useSolar } from "./context/SolarContext"
import { useWeather } from "./context/WeatherContext"

const TAB_COMPONENTS: Record<string, React.FC> = {
  solar: SolarPanel, weather: WeatherWidget, battery: BatteryMonitor,
  recipes: RecipeManager, assistant: CampingChat, planner: TripPlanner,
  alarm: AlarmClock, tv: TVGuide, attractions: LocalAttractions,
  maintenance: MaintenanceLog, stars: StarMap, shopping: SmartShoppingList,
  campsites: FederalCampsites, wildlife: WildlifeSpotter, signal: CellSignalMapper,
  air: AirQualityMonitor, wildfire: WildfireTracker, mesh: MeshNetwork,
  fishing: FishingIntelligence, sound: SoundGenerator, settings: SettingsPanel,
}

type NavItem = { id: string; label: string; icon: React.FC<{ className?: string }> }
interface NavGroup extends NavItem { children?: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "solar", label: "Solar", icon: Sun },
  { id: "weather", label: "Weather", icon: Cloud },
  { id: "battery", label: "Battery", icon: Battery },
  {
    id: "outdoors", label: "Outdoors", icon: Tent, children: [
      { id: "campsites", label: "Federal Campsites", icon: Tent },
      { id: "wildlife", label: "Wildlife", icon: Bird },
      { id: "fishing", label: "Fishing", icon: Fish },
      { id: "stars", label: "Night Sky", icon: Star },
      { id: "attractions", label: "Local Explorer", icon: Map },
      { id: "air", label: "Air Quality", icon: Wind },
      { id: "wildfire", label: "Wildfire", icon: Flame },
      { id: "signal", label: "Cell Signal", icon: Signal },
    ]
  },
  {
    id: "tools", label: "Tools", icon: Wrench, children: [
      { id: "assistant", label: "AI Assistant", icon: MessageSquare },
      { id: "planner", label: "Trip Planner", icon: Calendar },
      { id: "recipes", label: "Recipes", icon: ChefHat },
      { id: "shopping", label: "Shopping List", icon: ShoppingCart },
      { id: "maintenance", label: "Maintenance", icon: Wrench },
      { id: "alarm", label: "Alarm", icon: Bell },
      { id: "tv", label: "TV Guide", icon: Tv },
      { id: "mesh", label: "Mesh Network", icon: Network },
      { id: "sound", label: "Sounds", icon: Music },
    ]
  },
  { id: "settings", label: "Settings", icon: Settings },
]

function DashboardOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { solarData, isConnected } = useSolar()
  const { weather, forecast, loading: weatherLoading } = useWeather()

  const net = solarData.currentProduction - solarData.loadPower
  const batteryOk = solarData.batterySoc >= 30
  const solarOk = solarData.systemHealth === 'Normal'
  const tempOk = solarData.inverterTemp < 55
  const alerts: string[] = []
  if (solarData.batterySoc < 15) alerts.push('Battery critically low')
  if (solarData.batterySoc < 30 && solarData.batterySoc >= 15) alerts.push('Battery low — consider reducing load')
  if (solarData.inverterTemp > 55) alerts.push('Inverter temperature high')
  if (solarData.systemHealth === 'Critical') alerts.push('System health critical')

  const kpis = [
    {
      label: "Solar Production", value: solarData.currentProduction.toFixed(2),
      unit: "kW", color: "text-emerald-400", icon: Sun, tab: "solar",
      sub: isConnected ? `${solarData.todaySolar.toFixed(1)} kWh today` : 'Connecting...'
    },
    {
      label: "Battery", value: Math.round(solarData.batterySoc).toString(),
      unit: "%", color: solarData.batterySoc < 15 ? "text-rose-400" : solarData.batterySoc < 30 ? "text-amber-400" : "text-blue-400",
      icon: Battery, tab: "battery",
      sub: solarData.gridStatus === 'Importing' ? 'Charging from grid' : net > 0 ? 'Solar charging' : 'Discharging'
    },
    {
      label: "Load", value: solarData.loadPower.toFixed(2),
      unit: "kW", color: "text-amber-400", icon: Zap, tab: "solar",
      sub: `${solarData.todayConsumed.toFixed(1)} kWh consumed today`
    },
    {
      label: net >= 0 ? "Exporting" : "Importing",
      value: Math.abs(net).toFixed(2),
      unit: "kW", color: net >= 0 ? "text-emerald-300" : "text-rose-400",
      icon: TrendingUp, tab: "solar",
      sub: net >= 0 ? `${solarData.todayExported.toFixed(1)} kWh exported` : 'Drawing from grid'
    },
  ]

  const weatherIcon = weatherLoading ? '...' :
    weather.weatherCode === 0 ? '☀️' :
      weather.weatherCode <= 3 ? '⛅' :
        weather.weatherCode <= 48 ? '🌫️' :
          weather.weatherCode <= 67 ? '🌧️' :
            weather.weatherCode <= 77 ? '❄️' : '⛈️'

  return (
    <div className="space-y-4">
      {/* Live KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <button key={k.label} onClick={() => onNavigate(k.tab)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-emerald-500/50 transition-colors group">
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <span className="text-xs text-slate-400">{k.label}</span>
              {isConnected && <span className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
            </div>
            <div className={`text-2xl font-bold ${k.color}`}>
              {k.value}<span className="text-sm font-normal ml-1">{k.unit}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">{k.sub}</div>
          </button>
        ))}
      </div>

      {/* Weather + System Status row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weather tile */}
        <button onClick={() => onNavigate('weather')}
          className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-semibold text-white">Weather</span>
            {forecast[0] && <span className="ml-auto text-xs text-slate-500">{forecast[0].precipitation}% rain</span>}
          </div>
          {weatherLoading ? (
            <div className="text-slate-400 text-sm">Loading...</div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-3xl">{weatherIcon}</span>
              <div>
                <div className="text-2xl font-bold text-white">{weather.temp}°<span className="text-sm font-normal text-slate-400">F</span></div>
                <div className="text-xs text-slate-400">{weather.condition}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-slate-400">UV {weather.uvIndex}</div>
                <div className="text-xs text-slate-400">{weather.windSpeed} mph</div>
                <div className="text-xs text-slate-400">{weather.humidity}% hum</div>
              </div>
            </div>
          )}
        </button>

        {/* System Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">System Status</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Solar', ok: solarOk, tab: 'solar', detail: `${solarData.currentProduction.toFixed(1)} kW` },
              { label: 'Battery', ok: batteryOk, tab: 'battery', detail: `${Math.round(solarData.batterySoc)}%` },
              { label: 'Inverter', ok: tempOk, tab: 'solar', detail: `${solarData.inverterTemp.toFixed(1)}°C` },
              { label: 'Weather', ok: true, tab: 'weather', detail: weather.condition.split(' ')[0] },
            ].map(h => (
              <button key={h.label} onClick={() => onNavigate(h.tab)}
                className="w-full flex items-center gap-2 text-sm hover:text-white transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${h.ok ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span className="text-slate-300">{h.label}</span>
                <span className="ml-auto text-slate-500 text-xs">{h.detail}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className={`w-4 h-4 ${alerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <h3 className="text-sm font-semibold text-white">Alerts</h3>
            {alerts.length > 0 && (
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-400">All systems nominal.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {NAV_GROUPS.filter(g => g.id !== 'dashboard').map(group => (
          <button key={group.id}
            onClick={() => onNavigate(group.children ? group.children[0].id : group.id)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-emerald-500/50 transition-colors">
            <group.icon className="w-5 h-5 text-emerald-400 mb-2" />
            <div className="text-sm font-medium text-white">{group.label}</div>
            {group.children && (
              <div className="text-xs text-slate-500 mt-1">{group.children.length} tools</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function WildReadyApp() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [locationName, setLocationName] = useState("")
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { settings, isLoaded } = useSettings()

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function navigate(tab: string) {
    setActiveTab(tab)
    setOpenGroup(null)
  }

  function isGroupActive(group: NavGroup) {
    return group.id === activeTab || group.children?.some(c => c.id === activeTab)
  }

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
      <nav className="bg-slate-800/50 border-b border-slate-700" ref={dropdownRef}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-visible">
            {NAV_GROUPS.map((group) => {
              const active = isGroupActive(group)
              if (!group.children) {
                return (
                  <button key={group.id} onClick={() => navigate(group.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${active ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}>
                    <group.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{group.label}</span>
                  </button>
                )
              }
              return (
                <div key={group.id} className="relative shrink-0">
                  <button
                    onClick={() => setOpenGroup(openGroup === group.id ? null : group.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${active ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}>
                    <group.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{group.label}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${openGroup === group.id ? 'rotate-180' : ''}`} />
                  </button>
                  {openGroup === group.id && (
                    <div className={`absolute top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1 ${group.id === 'tools' ? 'right-0' : 'left-0'}`}>
                      {group.children.map(child => (
                        <button key={child.id} onClick={() => navigate(child.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${activeTab === child.id ? 'text-emerald-400 bg-slate-700/50' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}>
                          <child.icon className="w-4 h-4" />
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      {activeTab !== 'dashboard' && (() => {
        const parentGroup = NAV_GROUPS.find(g => g.children?.some(c => c.id === activeTab))
        const activeChild = parentGroup?.children?.find(c => c.id === activeTab)
        const activeTop = !parentGroup ? NAV_GROUPS.find(g => g.id === activeTab) : null
        return (
          <div className="bg-slate-900 border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <button onClick={() => navigate('dashboard')} className="hover:text-slate-300 transition-colors">Overview</button>
              {parentGroup && (
                <>
                  <span>/</span>
                  <span className="text-slate-400">{parentGroup.label}</span>
                  <span>/</span>
                  <span className="text-emerald-400">{activeChild?.label}</span>
                </>
              )}
              {activeTop && (
                <>
                  <span>/</span>
                  <span className="text-emerald-400">{activeTop.label}</span>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {activeTab === 'dashboard' && <DashboardOverview onNavigate={navigate} />}

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
