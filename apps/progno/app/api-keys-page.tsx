"use client";

import { useEffect, useMemo, useState } from "react";

type League = "NFL" | "NBA" | "MLB" | "NHL" | "NCAAF" | "NCAAB";
type Provider = "SportsRadar" | "DSG";
type SocialProvider = "Twitter" | "Reddit";

interface KeyField {
  provider: Provider | SocialProvider;
  label: string;
  storageKeys: string[];
  placeholder?: string;
}

const leagues: League[] = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"];

const sportsRadarFields: KeyField[] = [
  { provider: "SportsRadar", label: "Generic", storageKeys: ["sportsradar_api_key"] },
  ...leagues.map((lg) => ({
    provider: "SportsRadar" as Provider,
    label: lg,
    storageKeys: [`sportsradar_api_key_${lg.toLowerCase()}`],
  })),
];

const dsgFields: KeyField[] = [
  { provider: "DSG", label: "Generic API Key", storageKeys: ["dsg_api_key"] },
  ...leagues.map((lg) => ({
    provider: "DSG" as Provider,
    label: `${lg} API Key`,
    storageKeys: [`dsg_api_key_${lg.toLowerCase()}`],
  })),
  { provider: "DSG", label: "Generic Base URL", storageKeys: ["dsg_base_url"], placeholder: "https://api.example.com" },
  ...leagues.map((lg) => ({
    provider: "DSG" as Provider,
    label: `${lg} Base URL`,
    storageKeys: [`dsg_base_url_${lg.toLowerCase()}`],
    placeholder: "https://api.example.com",
  })),
];

const socialFields: KeyField[] = [
  { provider: "Twitter", label: "Twitter/X Bearer Token", storageKeys: ["twitter_bearer_token"], placeholder: "Bearer token" },
  { provider: "Reddit", label: "Reddit Client ID", storageKeys: ["reddit_client_id"], placeholder: "script app client id" },
  { provider: "Reddit", label: "Reddit Client Secret", storageKeys: ["reddit_client_secret"], placeholder: "script app client secret" },
];

const allFields: KeyField[] = [...sportsRadarFields, ...dsgFields, ...socialFields];

type CustomKey = { name: string; value: string };

export default function ApiKeysPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [customKeys, setCustomKeys] = useState<CustomKey[]>([]);
  const [newKey, setNewKey] = useState<{ name: string; value: string }>({ name: "", value: "" });

  useEffect(() => {
    const loaded: Record<string, string> = {};
    allFields.forEach((field) => {
      field.storageKeys.forEach((k) => {
        if (typeof window !== "undefined") {
          const v = localStorage.getItem(k);
          if (v) loaded[k] = v;
        }
      });
    });
    // load custom keys
    const storedCustom = typeof window !== "undefined" ? localStorage.getItem("custom_keys") : null;
    if (storedCustom) {
      try {
        const parsed: CustomKey[] = JSON.parse(storedCustom);
        setCustomKeys(parsed);
        parsed.forEach((ck) => {
          loaded[ck.name] = ck.value;
        });
      } catch {
        // ignore parse errors
      }
    }

    setValues(loaded);
  }, []);

  const handleSave = () => {
    if (typeof window === "undefined") return;
    allFields.forEach((field) => {
      field.storageKeys.forEach((k) => {
        const v = values[k];
        if (v && v.trim()) {
          localStorage.setItem(k, v.trim());
        } else {
          localStorage.removeItem(k);
        }
      });
    });

    // persist custom keys
    const filteredCustom = customKeys
      .map((ck) => ({ name: ck.name.trim(), value: ck.value.trim() }))
      .filter((ck) => ck.name);
    localStorage.setItem("custom_keys", JSON.stringify(filteredCustom));
    filteredCustom.forEach((ck) => {
      if (ck.value) {
        localStorage.setItem(ck.name, ck.value);
      } else {
        localStorage.removeItem(ck.name);
      }
    });

    setStatus("Saved locally. Server-side calls still use env keys.");
    setTimeout(() => setStatus(""), 4000);
  };

  const handleClear = () => {
    if (typeof window === "undefined") return;
    allFields.forEach((field) => {
      field.storageKeys.forEach((k) => localStorage.removeItem(k));
    });
    // clear custom
    localStorage.removeItem("custom_keys");
    customKeys.forEach((ck) => localStorage.removeItem(ck.name));
    setValues({});
    setCustomKeys([]);
    setStatus("Cleared local overrides.");
    setTimeout(() => setStatus(""), 4000);
  };

  const grouped = useMemo(() => {
    return {
      SportsRadar: sportsRadarFields,
      DSG: dsgFields,
      Twitter: socialFields,
    };
  }, []);

  return (
    <div style={{ color: "white", background: "#0a0a0a", padding: "32px", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "12px" }}>API Keys & Providers</h1>
        <p style={{ color: "#aaa", marginBottom: "24px" }}>
          Manage local API key overrides. These values are stored in your browser only. Server-side calls still rely on environment variables.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <button
            onClick={handleSave}
            style={{ padding: "12px 20px", background: "#00ffaa", color: "#000", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            Save
          </button>
          <button
            onClick={handleClear}
            style={{ padding: "12px 20px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            Clear Local Keys
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ccc" }}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Show values
          </label>
        </div>

        {status && (
          <div style={{ marginBottom: "16px", padding: "12px", background: "#112", border: "1px solid #224", borderRadius: "8px", color: "#8ff" }}>
            {status}
          </div>
        )}

        {Object.entries(grouped).map(([provider, fields]) => (
          <div key={provider} style={{ marginBottom: "28px", padding: "20px", background: "#111", border: "1px solid #222", borderRadius: "10px" }}>
            <h2 style={{ marginBottom: "12px", color: "#00ffaa" }}>{provider}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
              {fields.map((field) => {
                const key = field.storageKeys[0];
                return (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ color: "#aaa", fontSize: "14px" }}>{field.label}</label>
                    <input
                      type={show ? "text" : "password"}
                      value={values[key] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={field.placeholder || `${provider} ${field.label} key`}
                      style={{
                        padding: "12px",
                        background: "#1a1a1a",
                        color: "#fff",
                        border: "1px solid #333",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                      }}
                    />
                    <small style={{ color: "#666" }}>{key}</small>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "12px", color: "#888", fontSize: "13px" }}>
          Tip: To use keys server-side, also place them in environment files (e.g., NEXT_PUBLIC_SPORTSRADAR_API_KEY_NFL, DSG_API_KEY_NFL).
        </div>

        {/* Custom Keys Section */}
        <div style={{ marginTop: "32px", padding: "20px", background: "#111", border: "1px solid #222", borderRadius: "10px" }}>
          <h2 style={{ marginBottom: "12px", color: "#ffaa00" }}>Custom Keys (local only)</h2>
          <p style={{ color: "#aaa", marginBottom: "12px" }}>
            Add arbitrary key/value pairs. Stored in your browser; does not write to server env. Names are used as localStorage keys.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "12px" }}>
            <input
              type="text"
              value={newKey.name}
              onChange={(e) => setNewKey((p) => ({ ...p, name: e.target.value }))}
              placeholder="Key name"
              style={{ padding: "10px", background: "#1a1a1a", color: "#fff", border: "1px solid #333", borderRadius: "6px" }}
            />
            <input
              type={show ? "text" : "password"}
              value={newKey.value}
              onChange={(e) => setNewKey((p) => ({ ...p, value: e.target.value }))}
              placeholder="Key value"
              style={{ padding: "10px", background: "#1a1a1a", color: "#fff", border: "1px solid #333", borderRadius: "6px" }}
            />
            <button
              onClick={() => {
                if (!newKey.name.trim()) return;
                const updated = [...customKeys.filter((c) => c.name !== newKey.name.trim()), { name: newKey.name.trim(), value: newKey.value }];
                setCustomKeys(updated);
                setValues((prev) => ({ ...prev, [newKey.name.trim()]: newKey.value }));
                setNewKey({ name: "", value: "" });
              }}
              style={{ padding: "10px", background: "#00ffaa", color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
            >
              Add / Update
            </button>
          </div>
          {customKeys.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
              {customKeys.map((ck) => (
                <div key={ck.name} style={{ padding: "12px", background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px" }}>
                  <div style={{ color: "#0f0", fontWeight: "bold", marginBottom: "4px" }}>{ck.name}</div>
                  <div style={{ color: "#aaa", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {show ? ck.value : "•".repeat(Math.min(ck.value.length, 12) || 6)}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      onClick={() => {
                        setValues((prev) => ({ ...prev, [ck.name]: ck.value }));
                      }}
                      style={{ padding: "6px 10px", background: "#222", color: "#0f0", border: "1px solid #0f0", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        const updated = customKeys.filter((c) => c.name !== ck.name);
                        setCustomKeys(updated);
                        setValues((prev) => {
                          const copy = { ...prev };
                          delete copy[ck.name];
                          return copy;
                        });
                      }}
                      style={{ padding: "6px 10px", background: "#222", color: "#f66", border: "1px solid #f66", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

