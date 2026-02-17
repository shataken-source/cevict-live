interface StatCardProps {
  title: string
  value: string
  positive?: boolean
  trend?: string
}

export function StatCard({ title, value, positive, trend }: StatCardProps) {
  return (
    <div className="bg-panel border border-border rounded-xl p-6">
      <div className="text-sm text-text-muted">{title}</div>
      <div className={`text-3xl font-semibold mt-2 ${positive ? "text-success" : "text-text-primary"}`}>
        {value}
      </div>
      {trend && (
        <div className="text-xs text-text-muted mt-1">
          {trend}
        </div>
      )}
    </div>
  )
}
