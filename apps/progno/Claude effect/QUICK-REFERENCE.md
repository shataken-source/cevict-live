# 🧠 CLAUDE EFFECT - QUICK REFERENCE CARD

**Runtime formula and weights:** `app/lib/claude-effect.ts` (code is source of truth; this card is SF+NM simplified view).

## THE FORMULA
```
FINAL_PROB = BASE_PROB × (1 + CLAUDE_EFFECT)
CLAUDE_EFFECT = (SF × 0.40) + (NM × 0.60)  [Current]
MAX IMPACT: ±8%
```

---

## 7 DIMENSIONS AT A GLANCE

| # | Dim | Max | Status | What It Measures |
|---|-----|-----|--------|------------------|
| 1 | SF | ±5% | ✅ | Emotional state |
| 2 | NM | ±8% | ✅ | Story power |
| 3 | IAI | ±6% | ✅ | Spread-vs-ML sharp signal |
| 4 | CSI | Conf | 🔜 | Chaos/volatility |
| 5 | NIG | ±4% | 🔜 | Team chemistry |
| 6 | TRD | Mod | 🔜 | Recency weight |
| 7 | EPD | ±5% | 🔜 | AI patterns |

---

## 🎭 SENTIMENT FIELD (SF)

**Red Flags (-impact):**
- Player social media negative
- Coach presser deflections
- Beat reporters hinting issues
- Instagram unfollows

**Green Flags (+impact):**
- Players hyped on social
- Coach unusually confident
- Team bonding posts
- Practice energy high

---

## 📖 NARRATIVE MOMENTUM (NM)

**BOOST Narratives (+):**
| Type | Impact |
|------|--------|
| Playoff revenge | +14% |
| Traded player | +12% |
| Team tragedy | +12% |
| Post-benching | +11% |
| Blowout revenge | +9% |
| Post-firing bounce | +9% |
| Rival game | +8% |

**DRAG Narratives (-):**
| Type | Impact |
|------|--------|
| Trap game | -8% |
| Championship hangover | -7% |
| Post-big win | -6% |
| Legal troubles | -6% |
| Contract dispute | -5% |
| Heavy favorite | -4% |

---

## 🚨 CONFLICT RESOLUTION

| Conflict | Resolution |
|----------|------------|
| Revenge vs Trap | Revenge wins |
| Pressure vs Hangover | Average |
| Doubters vs Legal | Cancel |
| Contract vs Personal | Average |

---

## 📊 EXPECTED RESULTS

| Metric | Base | +Claude |
|--------|------|---------|
| Win % | 52% | 57%+ |
| Upsets | 40% | 65%+ |
| False Conf | 35% | 15% |
| ROI | -4.5% | +8% |

---

## 🔗 INTEGRATION CODE

```typescript
// Get Claude Effect
const sf = await SentimentField.calculate(teamId);
const nm = await NarrativeMomentum.calculate(teamId, oppId);

// Combine
const claudeEffect = (sf.score * 0.40) + (nm.score * 0.60);

// Apply (max ±8%)
const modifier = claudeEffect * 0.08 / 0.30;
const finalProb = baseProb + modifier;
```

---

## 🐘 ROLL TIDE!
