'use client';

import { useMemo, useState } from 'react';

type AgentStatus = 'idle' | 'running' | 'complete';

type WeatherSnapshot = {
  location: string;
  temperatureC: number;
  cloudCover: number; // 0–100
  uvIndex: number; // 0–11+
};

type SolarForecast = {
  efficiency: number;
  expectedKwh: number;
  confidence: number;
  monthlySavings: number;
};

const BASE_KWH_PER_DAY = 25; // baseline kWh/day for a typical 6–7kW residential system

function computeSolarForecast(
  weather: WeatherSnapshot,
  systemSizeKw: number,
  pricePerKwh: number,
): SolarForecast {
  const cloudFactor = 1 - weather.cloudCover / 100;
  const uvFactor = Math.min(weather.uvIndex / 10, 1);
  const efficiency = Math.max(Math.min(cloudFactor * uvFactor * 0.85, 1), 0);
  const scaledBase = BASE_KWH_PER_DAY * (systemSizeKw / 6); // simple scale against a 6kW reference
  const expectedKwh = scaledBase * efficiency;
  const confidence = Math.max(0, 0.85 - weather.cloudCover / 200);
  const monthlySavings = expectedKwh * 30 * pricePerKwh;

  return {
    efficiency,
    expectedKwh,
    confidence,
    monthlySavings,
  };
}

function badgeColor(value: number): string {
  if (value >= 0.7) return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60';
  if (value >= 0.4) return 'bg-amber-500/20 text-amber-200 border-amber-400/60';
  return 'bg-rose-500/20 text-rose-200 border-rose-400/60';
}

type BatteryTab = 'overview' | 'monitoring' | 'config' | 'faults' | 'troubleshooting';

function BatteryHostPcPanel() {
  const [activeTab, setActiveTab] = useState<BatteryTab>('overview');
  const [btStatus, setBtStatus] = useState<string>('Not connected');
  const [isConnecting, setIsConnecting] = useState(false);

  async function connectBluetooth() {
    setIsConnecting(true);
    setBtStatus('Connecting to battery…');
    try {
      const nav = (typeof navigator !== 'undefined' ? (navigator as any) : null) as any;
      if (!nav || !nav.bluetooth) {
        setBtStatus('Web Bluetooth not available in this browser. Use Chrome on Android or desktop.');
        return;
      }

      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      setBtStatus(`Paired with ${device?.name || 'battery'} (BLE session ready)`);
    } catch (error) {
      setBtStatus('Connection cancelled or failed. Check that the battery is powered and in pairing mode.');
    } finally {
      setIsConnecting(false);
    }
  }

  const tabButtonClass = (tab: BatteryTab) =>
    `whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs sm:text-sm border transition ${
      activeTab === tab
        ? 'bg-emerald-500/30 border-emerald-300 text-emerald-50'
        : 'bg-slate-900/40 border-slate-600/70 text-slate-100 hover:bg-slate-900/70'
    }`;

  return (
    <section className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-4 shadow-xl shadow-slate-950/60 backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
            Battery host-PC & tablet console
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-200/80 sm:text-sm">
            Tablet-friendly view of your lithium battery BMS — real-time monitoring, parameter
            tuning, fault logs, and troubleshooting, inspired by ECO-WORTHY&apos;s host-PC tools
            for server-rack batteries.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <button
            type="button"
            onClick={connectBluetooth}
            disabled={isConnecting}
            className="inline-flex items-center justify-center rounded-full border border-emerald-300/80 bg-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-50 shadow-md shadow-emerald-900/40 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:border-emerald-200/60 disabled:bg-emerald-500/10"
          >
            {isConnecting ? 'Connecting…' : 'Connect via Bluetooth'}
          </button>
          <p className="max-w-xs text-[11px] text-emerald-100/80">{btStatus}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 text-xs sm:text-sm">
        <button type="button" onClick={() => setActiveTab('overview')} className={tabButtonClass('overview')}>
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('monitoring')}
          className={tabButtonClass('monitoring')}
        >
          Real-time monitoring
        </button>
        <button type="button" onClick={() => setActiveTab('config')} className={tabButtonClass('config')}>
          Parameters
        </button>
        <button type="button" onClick={() => setActiveTab('faults')} className={tabButtonClass('faults')}>
          Faults & logs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('troubleshooting')}
          className={tabButtonClass('troubleshooting')}
        >
          Troubleshooting
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm shadow-inner shadow-black/70">
        {activeTab === 'overview' && (
          <div className="space-y-2">
            <p className="text-slate-100">
              Use this console when your tablet is near the battery rack. It mirrors what
              vendor host-PC software does:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-slate-200/90">
              <li>Live pack metrics: pack voltage, current, SoC and temperature bands.</li>
              <li>Per-cell visibility: min / max cell voltage, temperature, and balance status.</li>
              <li>Protection flags: over-voltage, under-voltage, over-current and thermal limits.</li>
              <li>Configuration snapshots: charge/discharge limits and chemistry settings for audits.</li>
            </ul>
            <p className="pt-1 text-xs text-slate-300/80">
              Bluetooth pairing replaces the USB/RS485 cable typically used for ECO-WORTHY&apos;s
              PC tools, but the data you see is conceptually the same
              ([reference](https://www.eco-worthy.com/blogs/lithium-battery/how-to-use-the-host-pc-software)).
            </p>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-100/80">
                Pack overview
              </div>
              <div className="text-lg font-semibold text-emerald-50">51.8 V · 73 % SoC</div>
              <p className="text-xs text-emerald-50/80">
                Live pack voltage, charge/discharge current and state-of-charge from the BMS.
              </p>
            </div>
            <div className="space-y-1 rounded-xl border border-sky-400/40 bg-sky-500/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-sky-100/80">
                Cell health
              </div>
              <div className="text-lg font-semibold text-sky-50">
                3.28–3.31 V <span className="text-xs font-normal align-middle">min–max</span>
              </div>
              <p className="text-xs text-sky-50/80">
                Individual cell voltage spread and temperature spots to spot early imbalance.
              </p>
            </div>
            <div className="space-y-1 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-amber-100/80">
                Protections
              </div>
              <div className="text-lg font-semibold text-amber-50">All clear</div>
              <p className="text-xs text-amber-50/80">
                Over-voltage, under-voltage, over-current and over-temperature flags at a glance.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-2">
            <p className="text-slate-100">
              Parameter configuration is password-protected, just like vendor host-PC software:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-slate-200/90">
              <li>Charge / discharge voltage and current thresholds per pack.</li>
              <li>Temperature protection limits for charge, discharge and storage.</li>
              <li>Battery chemistry and capacity so SoC and protections are accurate.</li>
            </ul>
            <p className="pt-1 text-xs text-amber-200/90">
              Caution: changing protection voltages or current limits incorrectly can prevent
              charging or trigger premature shutdowns — ECO-WORTHY&apos;s docs stress using
              vendor-approved values only.
            </p>
          </div>
        )}

        {activeTab === 'faults' && (
          <div className="space-y-2">
            <p className="text-slate-100">
              Faults &amp; logs mirror the PC tools described in the ECO-WORTHY guide:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-slate-200/90">
              <li>Historical fault codes with timestamps and duration.</li>
              <li>Protection triggers (e.g. over-current, over-temp) and automatic clears.</li>
              <li>CSV-style export so you can ship logs to support or your installer.</li>
              <li>Optional firmware upgrade lane if supported by the BMS.</li>
            </ul>
            <p className="pt-1 text-xs text-slate-300/80">
              On a tablet, exports can be saved to local storage or forwarded directly to your
              installer, instead of plugging in a laptop.
            </p>
          </div>
        )}

        {activeTab === 'troubleshooting' && (
          <div className="space-y-2 text-xs sm:text-sm">
            <p className="font-semibold text-slate-100">Quick troubleshooting checklist</p>
            <ul className="list-disc space-y-1 pl-5 text-slate-200/90">
              <li>
                <strong>Cannot connect / device not found:</strong> make sure Bluetooth is enabled on
                the tablet, the battery is powered, and the BMS is in pairing mode. For wired host-PC
                tools this would be checking the COM port and USB driver.
              </li>
              <li>
                <strong>Data looks wrong or doesn&apos;t update:</strong> stay within Bluetooth range
                and avoid metal enclosures; for serial tools this maps to checking baud rate and
                wiring, as ECO-WORTHY recommends.
              </li>
              <li>
                <strong>Can&apos;t change parameters:</strong> you&apos;ll need elevated credentials;
                vendor tools typically require an installer or admin password for those screens.
              </li>
            </ul>
            <p className="pt-1 text-slate-300/80">
              For deeper details, the original article on ECO-WORTHY&apos;s host-PC software covers
              connection methods, parameter safety notes, and log export best practices in depth
              ([source](https://www.eco-worthy.com/blogs/lithium-battery/how-to-use-the-host-pc-software)).
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Page() {
  const [location, setLocation] = useState('Tampa, FL');
  const [systemSizeKw, setSystemSizeKw] = useState(6);
  const [pricePerKwh, setPricePerKwh] = useState(0.18);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({
    business: 'idle',
    data: 'idle',
    risk: 'idle',
  });
  const [error, setError] = useState<string | null>(null);

  const forecast = useMemo(
    () => (weather ? computeSolarForecast(weather, systemSizeKw, pricePerKwh) : null),
    [weather, systemSizeKw, pricePerKwh],
  );

  async function runAgents() {
    setError(null);
    setAgentStatus({ business: 'running', data: 'idle', risk: 'idle' });

    try {
      // Business Analysis Agent – validate inputs
      await new Promise((r) => setTimeout(r, 600));
      if (!location.trim()) {
        throw new Error('Please enter a valid location.');
      }
      if (systemSizeKw <= 0 || systemSizeKw > 30) {
        throw new Error('System size should be between 1kW and 30kW.');
      }
      if (pricePerKwh <= 0 || pricePerKwh > 1) {
        throw new Error('Price per kWh should be between $0.01 and $1.00.');
      }
      setAgentStatus((prev) => ({ ...prev, business: 'complete', data: 'running' }));

      // Data Intelligence Agent – mock live weather data
      await new Promise((r) => setTimeout(r, 700));
      const now = new Date();
      const hour = now.getHours();
      const isDaylight = hour >= 7 && hour <= 18;

      const snapshot: WeatherSnapshot = {
        location,
        temperatureC: isDaylight ? 24 + Math.random() * 8 : 18 + Math.random() * 4,
        cloudCover: isDaylight ? Math.round(Math.random() * 70) : Math.round(Math.random() * 40),
        uvIndex: isDaylight ? 4 + Math.random() * 7 : 0.5 + Math.random() * 1.5,
      };
      setWeather(snapshot);
      setAgentStatus((prev) => ({ ...prev, data: 'complete', risk: 'running' }));

      // Risk Assessment Agent – evaluate stability
      await new Promise((r) => setTimeout(r, 800));
      setAgentStatus((prev) => ({ ...prev, risk: 'complete' }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unexpected error while running agents.';
      setError(message);
      setAgentStatus({ business: 'idle', data: 'idle', risk: 'idle' });
    }
  }

  const isRunning = Object.values(agentStatus).some((s) => s === 'running');

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 text-slate-100 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Solar Weather Intelligence
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-200/80 sm:text-base">
              Three cooperating AI agents turn live weather into practical solar forecasts —
              expected energy, confidence, and savings for your specific system.
            </p>
          </div>
          <button
            type="button"
            onClick={runAgents}
            disabled={isRunning}
            className="inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/20 px-5 py-2 text-sm font-medium text-emerald-50 shadow-lg shadow-emerald-900/40 backdrop-blur transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:border-emerald-300/40 disabled:bg-emerald-500/10 disabled:text-emerald-100/70"
          >
            {isRunning ? 'Running analysis…' : 'Run solar analysis'}
          </button>
        </header>

        <section className="grid gap-5 md:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-xl shadow-slate-900/40 backdrop-blur-xl">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100/80">
                Inputs
              </h2>
              <p className="mt-1 text-xs text-slate-200/80 sm:text-sm">
                Tune the scenario you want the agents to evaluate. You can quickly explore
                combinations of locations, system sizes, and utility prices.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-100/90">Location</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State or coordinates"
                    className="w-full rounded-xl border border-white/20 bg-slate-900/40 px-3 py-2 text-sm text-slate-50 outline-none ring-emerald-500/40 placeholder:text-slate-400 focus:ring-2"
                  />
                  <p className="text-[11px] text-slate-200/70">
                    Try coastal vs inland cities to compare solar stability.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs font-medium text-slate-100/90">
                    System size
                    <span className="text-[11px] font-normal text-slate-200/70">
                      {systemSizeKw.toFixed(1)} kW
                    </span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={18}
                    step={0.5}
                    value={systemSizeKw}
                    onChange={(e) => setSystemSizeKw(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                  <p className="text-[11px] text-slate-200/70">
                    2–8kW typical residential, 10kW+ for small commercial.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-xs font-medium text-slate-100/90">
                    Utility price
                    <span className="text-[11px] font-normal text-slate-200/70">
                      ${pricePerKwh.toFixed(2)}/kWh
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0.08}
                    max={0.5}
                    step={0.01}
                    value={pricePerKwh}
                    onChange={(e) => setPricePerKwh(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                  <p className="text-[11px] text-slate-200/70">
                    Lower in hydro-heavy regions, higher in dense cities.
                  </p>
                </div>
              </div>
              {error && (
                <p className="mt-3 rounded-xl border border-rose-400/60 bg-rose-500/15 px-3 py-2 text-xs text-rose-50">
                  {error}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-inner shadow-slate-900/70 backdrop-blur-xl">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100/80">
                Agents
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    id: 'business',
                    title: 'Business analysis',
                    description:
                      'Sanity-checks the scenario and translates it into potential savings.',
                  },
                  {
                    id: 'data',
                    title: 'Data intelligence',
                    description:
                      'Builds a weather snapshot: temp, clouds, and UV for the selected location.',
                  },
                  {
                    id: 'risk',
                    title: 'Risk assessment',
                    description:
                      'Evaluates volatility and confidence based on cloud cover and UV stability.',
                  },
                ].map((agent) => {
                  const status = agentStatus[agent.id as keyof typeof agentStatus];
                  const color =
                    status === 'running'
                      ? 'bg-amber-500/20 text-amber-100 border-amber-400/60'
                      : status === 'complete'
                      ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/60'
                      : 'bg-slate-800/70 text-slate-200 border-slate-600/60';
                  const label =
                    status === 'running'
                      ? 'Running'
                      : status === 'complete'
                      ? 'Complete'
                      : 'Idle';
                  return (
                    <article
                      key={agent.id}
                      className={`flex flex-col justify-between rounded-xl border px-3 py-2.5 text-xs ${color}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold">{agent.title}</h3>
                          <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                            {label}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-100/80">
                          {agent.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-xl shadow-slate-900/40 backdrop-blur-xl">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100/80">
                Snapshot
              </h2>
              {weather ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-200/70">
                      Location
                    </dt>
                    <dd className="mt-1 text-slate-50">{weather.location}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-200/70">
                      Temperature
                    </dt>
                    <dd className="mt-1 text-slate-50">
                      {weather.temperatureC.toFixed(1)}°C (
                      {(weather.temperatureC * (9 / 5) + 32).toFixed(1)}°F)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-200/70">
                      Cloud cover
                    </dt>
                    <dd className="mt-1 text-slate-50">{weather.cloudCover}%</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-200/70">
                      UV index
                    </dt>
                    <dd className="mt-1 text-slate-50">{weather.uvIndex.toFixed(1)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-slate-200/80">
                  Run the analysis to generate a fresh weather + solar snapshot for this scenario.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-slate-900/80 backdrop-blur-xl">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100/80">
                Solar outcome
              </h2>
              {forecast ? (
                <div className="mt-3 space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-200/70">
                        Expected yield (today)
                      </div>
                      <div className="text-lg font-semibold text-emerald-100">
                        {forecast.expectedKwh.toFixed(1)} kWh
                      </div>
                      <p className="text-[11px] text-slate-200/75">
                        Scaled for a {systemSizeKw.toFixed(1)}kW system under current conditions.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-200/70">
                        Estimated savings / month
                      </div>
                      <div className="text-lg font-semibold text-emerald-100">
                        ${forecast.monthlySavings.toFixed(0)}
                      </div>
                      <p className="text-[11px] text-slate-200/75">
                        Assuming similar conditions most days this month.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${badgeColor(
                        forecast.efficiency,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      <span>Efficiency {(forecast.efficiency * 100).toFixed(0)}%</span>
                    </div>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${badgeColor(
                        forecast.confidence,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      <span>Confidence {(forecast.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-200/80">
                    This is a simplified model intended for quick, directional decision making. For
                    project-grade estimates, you&apos;d layer in seasonal weather data, panel
                    orientation, shading, and your utility&apos;s exact tariff schedule.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-200/80">
                  Once the agents run, this panel turns weather into expected kWh, savings, and an
                  at-a-glance confidence badge.
                </p>
              )}
            </div>
          </div>
        </section>

        <BatteryHostPcPanel />

        <footer className="pt-2 text-[11px] text-slate-200/70">
          <span className="font-semibold text-slate-100/90">Auspicio Forge demo.</span> Agents and
          formulas are intentionally opinionated and lightweight: fast enough for interactive
          exploration, clear enough to hand off to a human analyst.
        </footer>
      </div>
    </main>
  );
}

