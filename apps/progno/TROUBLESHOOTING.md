# Kaggle API Troubleshooting

## 404 Error Fix

If you're getting a 404 error when trying to access the Kaggle API:

### 1. Restart the Dev Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd apps/progno
pnpm dev
```

### 2. Check Route File Location
The route should be at:
```
apps/progno/app/api/kaggle/titanic/route.ts
```

### 3. Verify the Route is Exported
Make sure the file has:
```typescript
export async function GET(request: NextRequest) {
  // ...
}
```

### 4. Check File System Paths
The data files should be at:
```
apps/progno/data/kaggle/titanic/
├── metadata.json
└── train_and_test2.csv
```

### 5. Test the Route Directly
Try accessing: `http://localhost:3008/api/kaggle/titanic`

You should get JSON, not HTML.

### 6. Check Console Logs
Look for errors in:
- Browser console (F12)
- Terminal where `pnpm dev` is running

### 7. Clear Next.js Cache
```bash
cd apps/progno
rm -rf .next
pnpm dev
```

## Common Issues

### Issue: "Module not found"
**Fix**: Check import paths. From `app/api/kaggle/titanic/route.ts`, use:
```typescript
import { ... } from '../../../kaggle-integration';
```

### Issue: "Cannot read file"
**Fix**: Make sure data files exist and paths are correct. Use `process.cwd()` for absolute paths.

### Issue: "Runtime error"
**Fix**: Add `export const runtime = 'nodejs';` to ensure server-side execution.

## Still Not Working?

1. Check that the dev server is running on port 3008
2. Verify the URL: `http://localhost:3008/api/kaggle/titanic`
3. Check browser network tab for the actual request/response
4. Look at server logs for detailed error messages

