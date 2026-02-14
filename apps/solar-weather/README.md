# ☀️ Solar Weather Intelligence App (Standalone)

This is the standalone version of the **Solar Weather Intelligence** demo, recreated from the original monorepo docs in `docs/from-monorepo`.

It showcases three cooperating AI agents that turn a simple weather snapshot into:

- Expected daily solar generation (kWh) for a given system size
- A quick confidence score based on cloud cover and UV index
- A rough monthly savings estimate based on your utility price

The UI is a single-page Next.js 14 app with a glassmorphism-inspired layout and slider-based controls for fast scenario exploration.

It also includes a **battery host-PC tablet console** inspired by ECO-WORTHY&apos;s server-rack tools, with tabs for:

- Overview of the battery/BMS console
- Real-time monitoring (pack, cells, protections)
- Parameter configuration notes
- Faults & log export
- Troubleshooting tips based on the official guide

## 🚀 What it is

- A **solar + battery planning helper**: quickly explore how weather, system size, and utility price interact.
- A **demo of cooperating AI “agents”** that each own part of the reasoning (business, data, risk).
- A **tablet-friendly console** for reading battery/BMS data the way host-PC software would, but over Bluetooth.

## ⚙️ What it does

- Lets you:
  - Set a location, system size (kW), and price ($/kWh)
  - See expected daily kWh, rough monthly savings, and confidence
  - Read a dashboard-style battery view (pack, cells, protections, faults)
- Uses fast heuristics instead of live APIs so it’s always responsive.

## 🚀 Quick Start (development)

From the repo root:

```bash
pnpm install        # or npm install

cd apps/solar-weather
pnpm dev            # or npm run dev
```

Then open `http://localhost:3010`.

## 📱 Using it on a tablet

1. Open `http://localhost:3010` in **Chrome** (Android tablet) or another modern browser.
2. Use the browser menu to **“Add to Home Screen”** – the app ships a `manifest.webmanifest` so it installs as a standalone web app.
3. Launch it from your home screen like a native app; the layout is tuned for tablets (large tap targets, readable cards).
4. In the **Battery host-PC console**:
   - Tap **“Connect via Bluetooth”** and select your battery/BMS device (on supported browsers).
   - Use the tabs to flip between **Overview**, **Real-time monitoring**, **Parameters**, **Faults & logs**, and **Troubleshooting**.
   - The copy in each tab mirrors the structure of ECO-WORTHY’s host-PC software guide so it is easy to map PC workflows to the tablet console.

## 🧠 Agent Roles

- **Business Analysis Agent** – validates the scenario (location + system size + price) and frames it in business terms.
- **Data Intelligence Agent** – builds a synthetic weather snapshot (temperature, cloud cover, UV index).
- **Risk Assessment Agent** – translates that snapshot into efficiency + confidence, flagging volatility.

In this standalone version, the agents are represented as fast, deterministic heuristics designed for interactive exploration rather than backtest-grade accuracy.

## 🔢 Solar Calculation Heuristic

We use a simplified version of the original formula:

```ts
efficiency = (cloudFactor * uvFactor * 0.85);
expectedKwh = baseKwh * (systemSizeKw / 6) * efficiency;
confidence = 0.85 - (cloudCover / 200);
```

Where:

- `cloudFactor` comes from cloud cover (0–100%)
- `uvFactor` comes from UV index (0–11+)
- `baseKwh` is a typical daily yield for a 6 kW system

The goal is to give **directionally correct** intuition, not a bankable quote.

## 🎨 UX Enhancements vs. Original Spec

Compared to the original monorepo description, this version adds:

- **Interactive sliders** for system size (kW) and utility price ($/kWh)
- **Inline explainer text** for each input, tuned for non-technical users
- **Instant feedback badges** for efficiency and confidence with color coding
- A more compact **agent status strip** that fits comfortably on laptops and tablets

## 🧪 AI Agent Smoke Tests

There is a small helper in `lib/ai-agent-test.ts` with **agent smoke tests** you can import into automated checks or a CLI tool. It’s not wired into CI here, but it demonstrates how you might keep agent heuristics honest over time.

## 🏁 Production Build

```bash
cd apps/solar-weather
pnpm build      # or npm run build
pnpm start      # or npm start
```

This will start the app on port **3010** in production mode.

