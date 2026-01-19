#!/bin/bash
# Diagnostic script to check why PROGNO isn't generating picks

echo "🔍 PROGNO Picks Diagnostic"
echo "========================="
echo ""

# Check what day it is
DAY=$(date +%u)  # 1=Monday, 7=Sunday
DAY_NAME=$(date +%A)
echo "📅 Today is: $DAY_NAME (Day $DAY)"
echo ""

# Check cron schedule
echo "⏰ Cron Schedule:"
echo "  Monday: 2 PM (14:00) - /api/admin/monday"
echo "  Tuesday: 2 PM (14:00) - /api/admin/tuesday"
echo "  Thursday: 2 PM (14:00) - /api/admin/thursday"
echo "  Friday: 2 PM (14:00) - /api/admin/friday"
echo "  Wednesday/Saturday/Sunday: NO CRON JOB"
echo ""

if [ "$DAY" -eq 3 ] || [ "$DAY" -eq 6 ] || [ "$DAY" -eq 7 ]; then
  echo "⚠️  WARNING: No cron job scheduled for $DAY_NAME!"
  echo "   Picks are only generated Mon/Tue/Thu/Fri at 2 PM"
  echo "   Use /api/admin/all-leagues to generate picks manually"
  echo ""
fi

# Check if picks file exists
echo "📁 Checking picks file..."
if [ -f ".progno/picks-all-leagues-latest.json" ]; then
  FILE_SIZE=$(stat -f%z ".progno/picks-all-leagues-latest.json" 2>/dev/null || stat -c%s ".progno/picks-all-leagues-latest.json" 2>/dev/null || echo "0")
  if [ "$FILE_SIZE" -gt 10 ]; then
    PICK_COUNT=$(cat ".progno/picks-all-leagues-latest.json" | grep -o '"gameId"' | wc -l | tr -d ' ')
    echo "  ✅ File exists: .progno/picks-all-leagues-latest.json"
    echo "  📊 Size: $FILE_SIZE bytes"
    echo "  📈 Picks found: $PICK_COUNT"

    # Check file age
    if command -v stat >/dev/null 2>&1; then
      FILE_AGE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" ".progno/picks-all-leagues-latest.json" 2>/dev/null || stat -c "%y" ".progno/picks-all-leagues-latest.json" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
      echo "  🕐 Last modified: $FILE_AGE"
    fi
  else
    echo "  ⚠️  File exists but is empty or too small ($FILE_SIZE bytes)"
  fi
else
  echo "  ❌ File NOT FOUND: .progno/picks-all-leagues-latest.json"
  echo "     This means no picks have been generated yet"
fi
echo ""

# Check API key
echo "🔑 Checking API key..."
if [ -n "$ODDS_API_KEY" ]; then
  echo "  ✅ ODDS_API_KEY is set"
elif [ -n "$NEXT_PUBLIC_ODDS_API_KEY" ]; then
  echo "  ✅ NEXT_PUBLIC_ODDS_API_KEY is set"
else
  echo "  ❌ No API key found in environment"
  echo "     Set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY"
fi
echo ""

# Check if we can call the daily-card endpoint
echo "🌐 Testing daily-card endpoint..."
if command -v curl >/dev/null 2>&1; then
  RESPONSE=$(curl -s "http://localhost:3000/api/progno/daily-card" 2>/dev/null || echo "ERROR")
  if [ "$RESPONSE" != "ERROR" ]; then
    PICK_COUNT=$(echo "$RESPONSE" | grep -o '"picks"' | wc -l | tr -d ' ')
    echo "  ✅ Endpoint responded"
    echo "  📊 Response preview: ${RESPONSE:0:200}..."
  else
    echo "  ⚠️  Could not reach endpoint (is server running?)"
  fi
else
  echo "  ⚠️  curl not available (install to test endpoint)"
fi
echo ""

echo "💡 SOLUTIONS:"
echo ""
if [ "$DAY" -eq 3 ] || [ "$DAY" -eq 6 ] || [ "$DAY" -eq 7 ]; then
  echo "1. Generate picks manually:"
  echo "   POST to /api/admin/all-leagues"
  echo ""
fi

echo "2. Check Vercel cron job logs:"
echo "   - Go to Vercel dashboard"
echo "   - Check PROGNO project → Deployments → Cron Jobs"
echo "   - Look for errors in Monday/Tuesday/Thursday/Friday jobs"
echo ""

echo "3. Manually trigger picks generation:"
echo "   curl -X POST https://your-progno-url.vercel.app/api/admin/all-leagues"
echo ""

echo "4. Check if API key is set in Vercel:"
echo "   - Settings → Environment Variables"
echo "   - Ensure ODDS_API_KEY is set for Production"
echo ""

