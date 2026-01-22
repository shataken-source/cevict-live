# Feature Testing Checklist - PopThePopcorn

## ✅ Priority 1: Core Features

### Age Gate (2026 Compliance)
- [ ] Age gate appears on first visit
- [ ] Platform age verification badge shows (if using Age Signal API)
- [ ] Parental consent warning appears for users under 18
- [ ] Age verification persists after page refresh
- [ ] Privacy settings are applied based on age category

**How to Test:**
1. Clear browser cache/cookies
2. Visit `https://www.popthepopcorn.com`
3. Verify age gate appears
4. Enter date of birth
5. Check for compliance badges

---

### Headlines Display
- [ ] Headlines load after scraper runs
- [ ] Primary headline displays prominently
- [ ] Feed headlines show in vertical layout
- [ ] Drama scores are visible
- [ ] Breaking news badges appear
- [ ] Categories are displayed correctly

**How to Test:**
1. Wait for scraper to run (or trigger manually)
2. Refresh homepage
3. Verify headlines appear
4. Check layout matches Gen Z vertical feed design

---

### Reactions (Gen Z Style)
- [ ] Reaction buttons appear on headlines (🔥, 😂, 😱, 💀, 🧢)
- [ ] Clicking reactions updates count
- [ ] Reactions persist after page refresh
- [ ] Reaction counts display correctly

**How to Test:**
1. Click different reaction buttons
2. Verify counts update
3. Refresh page
4. Verify reactions persist

---

### Voting System
- [ ] Upvote/downvote buttons work
- [ ] Vote counts update in real-time
- [ ] Votes persist after refresh
- [ ] Drama score updates based on votes

**How to Test:**
1. Click upvote/downvote
2. Verify counts update
3. Refresh page
4. Verify votes persist

---

### Drama Score & Probability
- [ ] Drama scores display (0-10 scale)
- [ ] Probability calculator shows on headlines
- [ ] AI prediction labels appear (⚠️ AI Prediction)
- [ ] Drama meter visualizations work

**How to Test:**
1. Check drama scores on headlines
2. Look for probability percentages
3. Verify AI transparency labels
4. Check drama meter animations

---

## ✅ Priority 2: New Features (2026 Compliance)

### AI Transparency Labels
- [ ] "🤖 AI-Generated Summary" label appears
- [ ] "⚠️ AI Prediction (Probability Calculator)" label appears
- [ ] Confidence percentages display
- [ ] Labels are clearly visible

**How to Test:**
1. View headlines with AI-generated content
2. Verify labels appear
3. Check label styling/visibility

---

### Source Trace (Receipts)
- [ ] Source trace timeline displays
- [ ] Platform names show correctly
- [ ] Timestamps are accurate
- [ ] Trace shows origin → current platform flow

**How to Test:**
1. Find headlines with source_trace data
2. Verify timeline displays
3. Check platform names and timestamps

---

### Keyboard Shortcuts
- [ ] Press 'B' toggles Binge Mode
- [ ] Press '?' shows shortcuts help
- [ ] Shortcuts work across the app
- [ ] Help modal displays correctly

**How to Test:**
1. Press 'B' key
2. Verify Binge Mode activates
3. Press '?' key
4. Verify shortcuts help appears

---

### Binge Mode
- [ ] Binge Mode activates with 'B' key
- [ ] Headlines auto-scroll
- [ ] Full-screen experience
- [ ] Can exit Binge Mode

**How to Test:**
1. Press 'B' or click Binge Mode button
2. Verify auto-scroll starts
3. Check full-screen layout
4. Exit and verify return to normal view

---

## ✅ Priority 3: Monetization Features

### Kernel Shop
- [ ] Kernel Shop accessible
- [ ] Kernel pack options display
- [ ] Prices are shown correctly
- [ ] Purchase buttons work (when Stripe integrated)

**How to Test:**
1. Navigate to Kernel Shop
2. Verify pack options
3. Check pricing display
4. Test purchase flow (when ready)

---

### Boost Buttons
- [ ] "Salt the Story" buttons appear
- [ ] Boost costs display (Kernels required)
- [ ] Boost functionality works
- [ ] Boosted stories show boost indicator

**How to Test:**
1. Find boost buttons on headlines
2. Verify cost display
3. Test boost action (when currency available)

---

### Season Pass
- [ ] Season Pass option displays
- [ ] Benefits are listed
- [ ] Subscription button works (when Stripe integrated)
- [ ] Active pass shows badge

**How to Test:**
1. Navigate to Season Pass page
2. Verify benefits list
3. Test subscription flow (when ready)

---

## ✅ Priority 4: Advanced Features

### Story Arcs
- [ ] Story arcs display
- [ ] Related headlines are grouped
- [ ] Arc timeline shows progression
- [ ] Can navigate between related stories

**How to Test:**
1. Look for story arc cards
2. Verify related headlines
3. Check timeline display
4. Test navigation

---

### ChatBot (The Kernel)
- [ ] ChatBot button appears on headlines
- [ ] Chat interface opens
- [ ] Can ask questions about headlines
- [ ] AI responses are relevant

**How to Test:**
1. Click ChatBot button
2. Ask a question about a headline
3. Verify response quality
4. Test multiple questions

---

### Trending Topics
- [ ] Trending topics sidebar displays
- [ ] Topics update regularly
- [ ] Can click topics to filter
- [ ] Topic sources are shown

**How to Test:**
1. Check trending topics sidebar
2. Verify topics update
3. Click a topic
4. Verify filtering works

---

## ✅ Priority 5: Performance & UX

### Loading States
- [ ] "Loading headlines..." shows while fetching
- [ ] Loading states are smooth
- [ ] No flickering/jank
- [ ] Error states display correctly

**How to Test:**
1. Slow network (DevTools → Network → Throttle)
2. Verify loading states
3. Check error handling

---

### Responsive Design
- [ ] Mobile layout works
- [ ] Tablet layout works
- [ ] Desktop layout works
- [ ] Touch interactions work

**How to Test:**
1. Test on mobile device
2. Test on tablet
3. Test on desktop
4. Verify touch/swipe gestures

---

### PWA Features
- [ ] App is installable
- [ ] Manifest works
- [ ] Offline handling (if implemented)
- [ ] App icon displays

**How to Test:**
1. Check "Install App" prompt
2. Install app
3. Verify icon and name
4. Test offline behavior

---

## 📊 Test Results Template

```
Date: __________
Tester: __________
Environment: Production / Preview / Local

Core Features: ___/5
New Features: ___/4
Monetization: ___/3
Advanced: ___/3
Performance: ___/3

Total: ___/18

Issues Found:
1. 
2. 
3. 

Notes:
```

---

**Last Updated:** After deployment
**Status:** Ready for testing
