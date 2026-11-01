# SoshoBird — Frontend

React Native (Expo) social app — frontend branch.

## Stack

- **React Native** with Expo Router (file-based navigation)
- **NativeWind** (Tailwind CSS for React Native)
- **TanStack Query** for server state
- **Supabase** JS client (auth, realtime, storage)

## Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your Supabase project details
cp .env.example .env

# Start the dev server
npx expo start
```

## Folder structure

```
app/          # Screens (Expo Router file-based routing)
components/   # Reusable UI components
services/     # Supabase data access functions
providers/    # React context providers (Auth, Notifications)
types/        # TypeScript types (database schema)
assets/       # Images, fonts
scripts/      # DB migrations (run in Supabase SQL Editor)
```

## Environment variables

| Key | Description |
|-----|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Backend

See the `backend` branch for the database schema, migrations and Supabase configuration.
