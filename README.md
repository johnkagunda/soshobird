# SoshoBird

A full-featured social app built with React Native (Expo) and powered by Supabase.
Includes authentication, post creation, commenting, profiles, follows, notifications, and more.

---

## Live Demo

[View Live Demo](#) *(Coming Soon)*

---

## Features

- **Authentication** – Sign up, log in, and stay signed in securely.
- **Home Feed** – See posts from all users in a clean, scrollable feed.
- **Post Details** – View a single post with comments and interactions.
- **Comment System** – Add, view, and reply to comments with thread tracing.
- **Profiles** – View user profiles, follow users, and edit your own profile.
- **Create Posts** – Post your own content with images.
- **Search** – Find people and posts by keyword.
- **Discover** – Browse top posts by engagement in a 2x2 grid.
- **Notifications** – Get notified when someone follows you or a followed user posts.
- **Share** – Share posts with other apps.

---

## Tech Stack

- **Frontend:** React Native (Expo)
- **Navigation:** Expo Router
- **Styling:** NativeWind (Tailwind CSS)
- **Icons:** Ionicons via @expo/vector-icons
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State:** TanStack Query

---

## Folder Structure

```
soshobird/
├── app/             # Screens (Expo Router file-based routing)
├── components/      # Reusable UI components
├── providers/       # Auth and notifications providers
├── services/        # Supabase data access functions
├── types/           # TypeScript database types
├── lib/             # Supabase client config
├── assets/          # Images and fonts
├── scripts/         # SQL migrations (run in Supabase SQL Editor)
└── constants/       # Colors and theme
```

---

## Installation & Setup

```bash
# Clone this repo
git clone https://github.com/johnkagunda/soshobird.git

# Go into the project folder
cd soshobird

# Install dependencies
npm install

# Copy the env template and fill in your Supabase project details
cp .env.example .env

# Run the app
npx expo start
```

---

## Database Setup

Run the SQL files in `scripts/` in this order inside the Supabase SQL Editor:

1. `migration.sql` — core schema (profiles, posts, likes, follows)
2. `storage_policies.sql` — storage RLS policies
3. `notifications_migration.sql` — notifications table and realtime triggers
4. `replies_count_migration.sql` — reply count column and triggers

Then create two public Storage buckets in the Supabase dashboard: `avatars` and `media`.

---

## Branches

| Branch | Contents |
|--------|----------|
| `main` | Full project |
| `frontend` | React Native app only |
| `backend` | DB migrations and Supabase config only |

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Open a pull request

---

## License

MIT License — free to use and modify.
