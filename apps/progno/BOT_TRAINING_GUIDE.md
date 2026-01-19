# 🤖 Bot Training Guide: Kaggle Integration

## Mission: Fix and Improve Kaggle Competition System

You are a learning bot assigned to work on the Progno Kaggle integration. This guide will help you understand the system and learn how to improve it.

## Current Status

### ✅ What's Working
- Kaggle integration module created (`kaggle-integration.ts`)
- Titanic competition API route exists (`app/api/kaggle/titanic/route.ts`)
- UI component created (`kaggle-competition-page.tsx`)
- Model class implemented (`SimpleTitanicClassifier`)

### ❌ Current Problem
- **404 Error**: API route not being found by Next.js
- Route exists at: `app/api/kaggle/titanic/route.ts`
- URL being called: `/api/kaggle/titanic`
- Server returns HTML 404 page instead of JSON

## Your Learning Objectives

### Phase 1: Understand the System (Start Here!)

1. **Read the Code Structure**
   ```
   apps/progno/
   ├── app/
   │   ├── kaggle-integration.ts          # Core module
   │   ├── api/kaggle/titanic/route.ts    # API endpoint
   │   └── kaggle-competition-page.tsx     # UI
   └── data/kaggle/titanic/                # Dataset files
   ```

2. **Understand Next.js App Router**
   - Routes are defined by file structure
   - `app/api/kaggle/titanic/route.ts` → `/api/kaggle/titanic`
   - Must export `GET` or `POST` functions
   - Need `export const runtime = 'nodejs'` for file system access

3. **Understand the Data Flow**
   ```
   User clicks button
   → Frontend calls /api/kaggle/titanic
   → API route loads data from filesystem
   → Model trains on data
   → Model generates predictions
   → API returns JSON response
   → Frontend displays results
   ```

### Phase 2: Diagnose the Problem

**Task 1: Verify Route File**
- [ ] Check if `app/api/kaggle/titanic/route.ts` exists
- [ ] Verify it exports `GET` function
- [ ] Check for syntax errors
- [ ] Verify imports are correct

**Task 2: Check Next.js Configuration**
- [ ] Is dev server running?
- [ ] Is route being registered?
- [ ] Check `.next` cache (might need clearing)
- [ ] Verify port (should be 3008)

**Task 3: Test the Route**
- [ ] Try accessing `http://localhost:3008/api/kaggle/titanic` directly
- [ ] Check browser network tab
- [ ] Check server console logs
- [ ] Look for error messages

### Phase 3: Fix the Issue

**Common Solutions:**

1. **Restart Dev Server**
   ```bash
   # Stop server (Ctrl+C)
   cd apps/progno
   pnpm dev
   ```

2. **Clear Next.js Cache**
   ```bash
   cd apps/progno
   rm -rf .next
   pnpm dev
   ```

3. **Check Route Export**
   - Ensure `export async function GET()` exists
   - Ensure `export const runtime = 'nodejs'` is present
   - Check import paths are correct

4. **Verify File System Access**
   - Check data files exist: `data/kaggle/titanic/metadata.json`
   - Verify paths use `process.cwd()`
   - Check file permissions

### Phase 4: Improve the System

**Learning Tasks:**

1. **Add Better Error Handling**
   - Catch file system errors
   - Return helpful error messages
   - Log errors for debugging

2. **Add Validation**
   - Validate dataset exists before loading
   - Check data format
   - Verify required columns

3. **Add Logging**
   - Log when model starts training
   - Log prediction counts
   - Log file operations

4. **Improve Model**
   - Add more features (family size, title extraction)
   - Use better algorithms (Random Forest)
   - Add cross-validation

## Step-by-Step Learning Process

### Step 1: Read the Code
```bash
# Read these files in order:
1. apps/progno/app/kaggle-integration.ts
2. apps/progno/app/api/kaggle/titanic/route.ts
3. apps/progno/app/kaggle-competition-page.tsx
```

### Step 2: Understand the Error
- Error: 404 Not Found
- Meaning: Next.js can't find the route
- Possible causes:
  - Route file not in correct location
  - Route not exported correctly
  - Dev server needs restart
  - Cache issue

### Step 3: Test Your Understanding
Try to answer:
1. What URL should the route respond to?
2. What should the route return?
3. Where is the data stored?
4. How does the model work?

### Step 4: Make a Fix
1. Identify the problem
2. Make a small change
3. Test it
4. If it works, great!
5. If not, try another approach

### Step 5: Learn from Mistakes
- Document what didn't work
- Understand why it didn't work
- Try a different approach
- Ask for help if stuck

## Key Concepts to Learn

### Next.js App Router
- File-based routing
- Route handlers (GET, POST, etc.)
- Server components vs client components
- API routes

### File System in Node.js
- `fs/promises` for async operations
- `process.cwd()` for current directory
- Path joining with `path.join()`
- Error handling (ENOENT = file not found)

### Machine Learning Basics
- Training data vs test data
- Features (inputs) vs labels (outputs)
- Binary classification (0 or 1)
- Model training process

### TypeScript
- Type definitions
- Async/await
- Error handling
- Import/export

## Practice Exercises

### Exercise 1: Add Logging
Add console.log statements to track:
- When route is called
- When data is loaded
- When model trains
- When predictions are made

### Exercise 2: Add Error Messages
Improve error messages to be more helpful:
- "Dataset not found at: [path]"
- "Training data has [X] rows"
- "Model trained on [X] samples"

### Exercise 3: Add Validation
Check that:
- Dataset file exists
- Data has required columns
- Data is not empty
- Model can make predictions

### Exercise 4: Test the Route
Create a simple test:
```typescript
// Test if route responds
fetch('/api/kaggle/titanic')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(err => console.error(err))
```

## Resources for Learning

1. **Next.js Docs**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
2. **Node.js File System**: https://nodejs.org/api/fs.html
3. **TypeScript**: https://www.typescriptlang.org/docs/
4. **Machine Learning Basics**: https://www.kaggle.com/learn/intro-to-machine-learning

## Success Criteria

You'll know you've succeeded when:
- ✅ Route responds with JSON (not 404)
- ✅ Model trains successfully
- ✅ Predictions are generated
- ✅ Submission file is created
- ✅ UI displays results correctly

## Getting Help

If you're stuck:
1. Read the error message carefully
2. Check the console logs
3. Verify file paths
4. Test each component separately
5. Ask for clarification

## Remember

- **Start small**: Fix one thing at a time
- **Test often**: Check if changes work
- **Learn from errors**: Each error teaches you something
- **Be patient**: Learning takes time
- **Ask questions**: It's okay to not know everything

Good luck! You've got this! 🚀

