# openband

Open-source BandLab clone built with **Expo Router**, **TypeScript**, **NativeWind v4 (Tailwind CSS)**, and **Supabase**.

Runs on Web, Android, and iOS.

## Stack

- [Expo Router](https://expo.github.io/router/) — file-based routing
- [NativeWind v4](https://www.nativewind.dev/) — Tailwind CSS for React Native
- [Supabase](https://supabase.com/) — PostgreSQL database + Auth

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env` and fill in your project credentials:

```bash
cp .env.example .env
```

### 3. Run the database migrations

Execute the SQL in `supabase/schema.sql` in your Supabase project's SQL editor.

### 4. Start the app

```bash
npm start        # Expo Go / web
npm run android  # Android
npm run ios      # iOS (macOS only)
npm run web      # Browser
```

## Project Structure

```
app/
  _layout.tsx          # Root layout with auth guard
  (auth)/login.tsx     # Login screen
  (tabs)/
    index.tsx          # Global feed
    library.tsx        # My projects / library
  studio/[id].tsx      # DAW studio screen
src/
  lib/supabase.ts      # Supabase client
  context/AuthContext.tsx
```
