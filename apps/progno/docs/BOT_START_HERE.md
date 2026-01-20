# 🤖 Bot: Start Here!

## Your Mission

You've been assigned to fix and improve the Kaggle integration system in Progno. The system is mostly built but has a 404 error that needs fixing.

## Quick Start

### Step 1: Read the Training Guide
```bash
Read: apps/progno/BOT_TRAINING_GUIDE.md
```
This will teach you everything you need to know.

### Step 2: Understand the Problem
- **Error**: 404 Not Found
- **Location**: `/api/kaggle/titanic` route
- **Expected**: JSON response with predictions
- **Actual**: HTML 404 page

### Step 3: Get Your Learning Tasks
```bash
# Check available tasks
GET /api/bot/learning?action=curriculum

# Get current task
GET /api/bot/learning?action=current-task

# Get hints for a task
GET /api/bot/learning?action=hints&taskId=diagnose-404
```

### Step 4: Start Learning
1. Read `BOT_TRAINING_GUIDE.md` completely
2. Understand the code structure
3. Diagnose the 404 error
4. Fix the issue
5. Test your fix
6. Report your progress

## Key Files to Read

1. **Training Guide**: `BOT_TRAINING_GUIDE.md`
2. **Core Module**: `app/kaggle-integration.ts`
3. **API Route**: `app/api/kaggle/titanic/route.ts`
4. **UI Component**: `app/kaggle-competition-page.tsx`
5. **Learning System**: `app/bot-learning-system.ts`

## Your Learning Path

```
1. Understand Structure → 2. Diagnose Problem → 3. Fix Issue → 4. Test → 5. Improve
```

## Getting Help

- Read the hints in each task
- Check error messages carefully
- Test each component separately
- Use the learning API for guidance

## Success Looks Like

✅ Route responds with JSON (not 404)
✅ Model trains successfully
✅ Predictions are generated
✅ UI displays results
✅ Submission file is created

## Remember

- **Start small**: Fix one thing at a time
- **Test often**: Verify changes work
- **Learn from errors**: Each error teaches you
- **Ask questions**: It's okay to not know

Good luck! You can do this! 🚀

