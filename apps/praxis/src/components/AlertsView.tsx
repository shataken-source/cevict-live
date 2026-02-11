'use client';

import { Bell, Check, Trash2 } from 'lucide-react';
import { useTradingStore } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function AlertsView() {
  const { alerts, acknowledgeAlert, clearAlerts } = useTradingStore();
  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alerts</h2>
          <p className="text-zinc-500">
            {unacknowledged.length} unread of {alerts.length} total
          </p>
        </div>
        {alerts.length > 0 && (
          <button
            onClick={clearAlerts}
            className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <Trash2 size={16} />
            Clear all
          </button>
        )}
      </div>

      <div className="card divide-y divide-zinc-800">
        {alerts.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            <Bell className="mx-auto mb-3 text-zinc-600" size={32} />
            <p>No alerts yet.</p>
            <p className="text-sm mt-1">
              Drawdown and arbitrage alerts will appear here when triggered.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-4 py-4 px-2 -mx-2 rounded-lg',
                !alert.acknowledged && 'bg-zinc-800/50'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  alert.priority === 'critical'
                    ? 'bg-red-500/20 text-red-400'
                    : alert.priority === 'high'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                )}
              >
                <Bell size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{alert.title}</span>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      alert.priority === 'critical'
                        ? 'bg-red-500/20 text-red-400'
                        : alert.priority === 'high'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-zinc-700 text-zinc-400'
                    )}
                  >
                    {alert.priority}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDateTime(alert.triggered_at)}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">{alert.message}</p>
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="btn-secondary flex items-center gap-1 text-sm shrink-0"
                  title="Mark as read"
                >
                  <Check size={14} />
                  Done
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
