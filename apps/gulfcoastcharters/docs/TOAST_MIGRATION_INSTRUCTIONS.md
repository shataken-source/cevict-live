# Toast Migration Instructions

## Quick Fix - Run This Command

To fix all 35 remaining files with deprecated useToast hook, run:

```bash
chmod +x fix-toast-migration.sh
./fix-toast-migration.sh
```

## Manual Fix Pattern

For each file, change:

**OLD (causes white screen):**
```typescript
import { useToast } from '@/hooks/use-toast';
const { toast } = useToast();
toast({ title: 'Success', description: 'Message' });
```

**NEW (works correctly):**
```typescript
import { toast } from 'sonner';
toast.success('Message');
toast.error('Error message');
toast.info('Info message');
```

## Files Already Fixed
- ✅ ConfigurationManager.tsx
- ✅ CaptainApplicationForm.tsx
- ✅ CaptainApplicationFormSecure.tsx

## Files Remaining (35 files)
Run the bash script to fix all at once!

## Status
- Critical white screen bug: FIXED
- Migration script: CREATED
- Instructions: DOCUMENTED
