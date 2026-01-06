"use client";

import { useEffect, useState } from "react";

interface TickerItem {
  type: "alert" | "stock";
  text: string;
}

export default function ViceTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertsRes, stocksRes] = await Promise.all([
          fetch("/api/alerts/paul-revere?limit=10"),
          fetch("/api/stocks/vice", { cache: "no-store" }),
        ]);

        const alertsJson = await alertsRes.json().catch(() => ({}));
        const stocksJson = await stocksRes.json().catch(() => ({}));

        const alerts = (alertsJson?.alerts || []).map((a: any) => ({
          type: "alert",
          text: `${(a.type || "alert").toUpperCase()} ${a.state || ""}: ${a.headline}`,
        }));

        const stocks: TickerItem[] = (stocksJson?.quotes || []).map((q: any) => ({
          type: "stock",
          text: `$${q.symbol} ${q.price?.toFixed?.(2) ?? q.price} (${q.change_pct >= 0 ? "+" : ""}${q.change_pct?.toFixed?.(2) ?? q.change_pct}%)`,
        }));

        setItems([...alerts, ...stocks]);
      } catch (_e) {
        setItems([
          { type: "alert", text: "ALERT: Legislative watchlist updated" },
          { type: "stock", text: "$MO 44.12 (-0.3%)" },
          { type: "stock", text: "$PM 94.88 (+0.6%)" },
          { type: "stock", text: "$MSOS 10.42 (+1.8%)" },
        ]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full overflow-hidden bg-zinc-950 border-b border-zinc-800 py-2">
      <div className="whitespace-nowrap animate-[ticker_25s_linear_infinite]">
        {items.map((item, idx) => (
          <span
            key={`${item.type}-${idx}`}
            className={`inline-flex items-center px-4 text-xs font-bold ${
              item.type === "alert" ? "text-yellow-400" : "text-green-300"
            }`}
          >
            {item.text}
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

