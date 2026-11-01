# SoshoBird — Backend

This branch contains only the database schema, migrations, and backend logic for SoshoBird.

## What's here

```
scripts/
├── migration.sql              # Full schema: profiles, posts, likes, follows
├── follows_migration.sql      # Follows table + triggers
├── notifications_migration.sql # Notifications table + realtime triggers
├── replies_count_migration.sql # replies_count column + triggers
├── reply_to_migration.sql      # reply_to_id column
├── storage_policies.sql       # Supabase Storage RLS policies
└── apply_storage_policies.mjs # Script to apply storage policies via API

lib/
└── supabase.ts                # Supabase client config

types/
└── database.types.ts          # Auto-generated Supabase TypeScript types
```

## Setup

1. Create a [Supabase](https://supabase.com) project
2. Copy `.env.example` → `.env` and fill in your project URL + keys
3. Run each SQL file in the Supabase SQL Editor in this order:
   - `migration.sql`
   - `storage_policies.sql`
   - `notifications_migration.sql`
   - `replies_count_migration.sql`
4. Create two Storage buckets in the Supabase dashboard:
   - `avatars` (public)
   - `media` (public)

## Database schema

- **profiles** — user profiles, auto-created on signup via trigger
- **posts** — posts and replies (`parent_id` for threading, `reply_to_id` for specific reply targeting)
- **likes** — junction table; triggers keep `likes_count` in sync
- **follows** — junction table; triggers keep `followers_count`/`following_count` in sync
- **notifications** — follow + post notifications; Supabase Realtime enabled

## Frontend

See the `frontend` branch for the React Native (Expo) app.
