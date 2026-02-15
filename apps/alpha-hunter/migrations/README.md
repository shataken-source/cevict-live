# Database Migrations & Fixes

This folder contains all SQL fixes and migrations for Alpha Hunter.

## Structure

```
migrations/
├── fixes/           # Individual bug fixes (moved from root)
│   ├── AGGRESSIVE_FIX.sql
│   ├── FIX_DUPLICATES_AND_VERIFY.sql
│   └── ...
└── README.md        # This file
```

## Usage

Apply fixes in order of prefix number (if present):

```bash
# Via psql
psql -h your-db-host -d your-db -f migrations/fixes/FIX_NOW.sql

# Via Supabase CLI
supabase db execute --file migrations/fixes/FIX_NOW.sql
```

## History

These files were originally scattered in the project root. They have been consolidated here for better organization.

**Note**: Many of these fixes address specific production issues. Review before applying to your database.
