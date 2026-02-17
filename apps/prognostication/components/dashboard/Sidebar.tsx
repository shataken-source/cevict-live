"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Zap,
  LineChart,
  Settings,
  Bell,
  Lock,
  LogOut,
  Database,
  Code,
  Trophy
} from "lucide-react"

const navLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/signals", label: "Signals", icon: TrendingUp, badge: "NEW" },
  { href: "/dashboard/markets", label: "Markets", icon: BarChart3 },
  { href: "/dashboard/sportsbook", label: "Sportsbook", icon: Trophy },
  { href: "/dashboard/backtests", label: "Backtests", icon: Database, locked: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/api", label: "API", icon: Code },
  { href: "/dashboard/fund", label: "Fund Performance", icon: Zap, locked: true, tier: "elite" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-surface border-r border-border h-screen sticky top-0 flex flex-col overflow-y-auto no-scrollbar">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-glow-sm">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <div className="font-semibold text-text-primary">Prognostication</div>
            <div className="text-xs text-text-muted">Institutional</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')

          return (
            <Link
              key={link.href}
              href={link.locked ? "#" : link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${isActive
                ? "bg-panel border border-border text-text-primary"
                : link.locked
                  ? "text-text-muted cursor-not-allowed"
                  : "text-text-secondary hover:bg-panel hover:text-text-primary"
                }`}
            >
              <Icon size={18} />
              <span className="flex-1">{link.label}</span>
              {link.badge && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                  {link.badge}
                </span>
              )}
              {link.locked && (
                <Lock size={14} className="text-text-muted" />
              )}
              {link.tier && !link.locked && (
                <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full uppercase">
                  {link.tier}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Tier Card */}
      <div className="p-4 border-t border-border">
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="text-xs text-text-muted mb-1">Current Plan</div>
          <div className="font-medium text-accent">Pro</div>
          <div className="text-xs text-text-muted mt-2">
            23/50 signals today
          </div>
          <div className="w-full bg-border h-1 rounded mt-2">
            <div className="bg-primary h-1 rounded w-[46%]" />
          </div>
          <Link
            href="/pricing"
            className="text-xs text-primary hover:underline mt-3 block"
          >
            Upgrade to Elite
          </Link>
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button className="flex items-center gap-3 px-4 py-2 text-sm text-text-muted hover:text-text-primary transition w-full">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
