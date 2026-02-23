# Adding Knowledge to the Accu-Solar AI Assistant

The AI assistant in the **AI Setup tab** has two knowledge layers:

1. **Built-in local knowledge** — instant answers, no API key needed (`AITab.tsx`)
2. **OpenAI system prompt** — context injected into every GPT-4o-mini call

You can extend both without touching code by using the **knowledge file system**.

---

## Option 1 — Knowledge JSON File (Recommended)

Create or edit `public/ai-knowledge.json`. The AI tab loads this file on startup
and merges it into both the local answer engine and the OpenAI system prompt.

### File format

```json
{
  "topics": [
    {
      "keywords": ["inverter", "inverter size", "what size inverter"],
      "title": "Choosing an Inverter",
      "content": "For a 12V system with 8× 280Ah batteries (26.9 kWh), you need an inverter sized to your peak load...\n\n**Recommendations:**\n- 2000W continuous: Renogy 2000W Pure Sine (~$200)\n- 3000W continuous: Giandel 3000W (~$280)\n- 5000W continuous: Aims Power 5000W (~$450)\n\n**Rule:** Size inverter to 1.25× your largest simultaneous load."
    },
    {
      "keywords": ["generator", "backup power", "grid tie"],
      "title": "Generator / Backup Power",
      "content": "Your 26.9 kWh bank can run most homes for 1–2 days without sun. For extended backup:\n\n- **Generator:** 2000W+ propane/gas, connect via transfer switch\n- **Grid-tie:** Requires a grid-tie inverter (different from off-grid)\n- **Shore power:** RV-style 30A shore power input charges batteries directly"
    }
  ],
  "systemContext": "Additional notes: This system is located in the midwest US. The owner has 8 ECO-Worthy batteries wired in parallel for 12V. The AmpinVT controller is mounted in a ventilated outdoor enclosure."
}
```

### Fields

| Field | Required | Description |
|---|---|---|
| `topics[].keywords` | ✅ | Array of strings — if any appear in the user's question, this topic fires |
| `topics[].title` | ✅ | Heading shown in the response |
| `topics[].content` | ✅ | The answer — supports `**bold**`, `- lists`, `` `code` `` |
| `systemContext` | ❌ | Extra text appended to the OpenAI system prompt for every conversation |

### Keyword matching

Keywords are matched case-insensitively anywhere in the user's message:
- `"inverter"` matches "what size inverter do I need?" ✅
- `"inverter size"` matches "how do I pick inverter size?" ✅
- Multiple keywords = OR logic (any match triggers the topic)

---

## Option 2 — Edit AITab.tsx Directly

For permanent built-in knowledge, add a new `if` block to `getLocalAnswer()` in
`app/components/AITab.tsx`:

```typescript
if (q.includes('your keyword') || q.includes('another keyword')) {
  return `**Your Topic Title**

Your answer here. Supports **bold**, bullet lists, and \`code\`.

- Point 1
- Point 2

**Subsection:**
More detail here.`;
}
```

Add it before the final `return null;` line.

Also add a quick-question button so users can discover it:

```typescript
const quickQuestions = [
  // ... existing questions ...
  'Your new quick question here?',
];
```

---

## Option 3 — OpenAI System Prompt Only

If you only need GPT-4o-mini to know something (not the local engine), edit the
system prompt string in `AITab.tsx` around line 282:

```typescript
{ role: 'system', content: `You are a solar energy expert...

SYSTEM KNOWLEDGE:
- Batteries: 8× ECO-Worthy...
// Add your facts here:
- Your inverter is a Renogy 2000W Pure Sine installed in 2024.
- The system is in a garage with ambient temps 10–40°C year-round.
` }
```

This only affects responses when an OpenAI API key is configured.

---

## Current Built-in Topics

These work without any API key:

| Trigger Keywords | Topic |
|---|---|
| `tilt`, `angle`, `panel angle` | Optimal panel tilt by season |
| `wiring`, `series`, `parallel`, `4s2p` | 4S2P wiring explained |
| `battery`, `ecoworthy`, `280ah`, `lifepo4` | Battery bank care & specs |
| `production`, `how much`, `generate`, `kwh` | Expected daily production |
| `ampinvt`, `charge controller`, `mppt` | AmpinVT 150/80 specs |
| `shadow`, `shade`, `shading` | Shading & array impact |
| `bluetooth`, `ble`, `bms`, `live data`, `telemetry` | BLE → MQTT setup |
| `clipping`, `curtailment`, `wasted`, `second controller` | Solar clipping fix |
| `raspberry pi`, `pi zero`, `remote`, `garage`, `shed` | Pi Zero 2W bridge setup |
| `mqtt`, `mosquitto`, `broker` | MQTT architecture & topics |

---

## Tips

- **Test locally first** — run `npm run dev` in `apps/accu-solar` and ask the AI your question
- **Keep answers concise** — the chat panel is narrow; 150–300 words per topic is ideal
- **Use markdown** — `**bold**`, `- lists`, `` `code` `` all render correctly in the chat
- **Add quick questions** — users won't know what to ask unless you surface it as a button
- **JSON file wins** — use `public/ai-knowledge.json` for anything you want to add without a code deploy
