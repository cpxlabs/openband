# Supabase Setup Guide

This guide covers setting up Supabase for the OpenBand project — from project creation to full database schema, Row Level Security, and Storage buckets.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Fill in:
   - **Name:** `openband` (or any name)
   - **Database Password:** Strong password (save it securely)
   - **Region:** Choose the closest to your users
4. Click **Create new project** (takes ~1-2 minutes)

---

## 2. Get API Credentials

Once the project is ready:

1. Go to **Project Settings → API**
2. Copy these two values into `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> The **anon key** is safe for client-side use because Row Level Security (RLS) prevents unauthorized access. Never expose the `service_role` key.

---

## 3. Enable Email Auth

By default, Supabase enables email/password auth. Verify it's on:

1. Go to **Authentication → Providers**
2. Confirm **Email** is enabled
3. (Optional) Disable **Confirm email** for development — users can sign in immediately
4. (Optional) Disable **Secure email change** for development

---

## 4. Run the Database Schema

The schema is at `supabase/schema.sql`. It creates 5 tables:

### Tables

**`profiles`** — User profiles (extends `auth.users`)
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | References `auth.users` |
| `username` | `text` (unique) | Display handle |
| `display_name` | `text` | Full name |
| `avatar_url` | `text` | Profile picture |
| `bio` | `text` | Short bio |
| `created_at` | `timestamptz` | Auto-generated |

**`projects`** — Music projects (one per song)
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Auto-generated |
| `owner_id` | `uuid` (FK → `profiles`) | Project creator |
| `title` | `text` | Song title (default "Sem título") |
| `bpm` | `integer` | Beats per minute (default 120) |
| `time_signature` | `text` | Time signature (default "4/4") |
| `is_public` | `boolean` | Published to feed? |
| `created_at` | `timestamptz` | Auto-generated |
| `updated_at` | `timestamptz` | Auto-updated |

**`tracks`** — Audio tracks within a project (e.g., vocals, guitar)
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Auto-generated |
| `project_id` | `uuid` (FK → `projects`) | Parent project |
| `name` | `text` | Track name (default "Nova Trilha") |
| `volume` | `float` | 0.0–1.0 (default 1.0) |
| `muted` | `boolean` | Mute toggle |
| `solo` | `boolean` | Solo toggle |
| `pan` | `float` | -1.0 to 1.0 |
| `order_index` | `integer` | Display order |

**`stems`** — Audio segments/clips on the timeline
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Auto-generated |
| `track_id` | `uuid` (FK → `tracks`) | Parent track |
| `file_url` | `text` | Audio file URL |
| `start_time` | `float` | Offset in seconds |
| `duration` | `float` | Length in seconds |
| `created_at` | `timestamptz` | Auto-generated |

**`posts`** — Published projects on the global feed
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Auto-generated |
| `user_id` | `uuid` (FK → `profiles`) | Author |
| `project_id` | `uuid` (FK → `projects`) | Source project |
| `title` | `text` | Post title |
| `description` | `text` | Optional description |
| `master_audio_url` | `text` | Final mixed audio |
| `created_at` | `timestamptz` | Auto-generated |

### Apply via SQL Editor

1. Go to **SQL Editor** in the Supabase dashboard
2. Paste the contents of `supabase/schema.sql`
3. Click **Run**

Alternatively, use the Supabase CLI:

```bash
supabase db push
```

---

## 5. Enable Row Level Security (RLS)

RLS protects your data. Every table needs policies. Below are recommended policies.

### Profiles

```sql
-- Anyone can view profiles
create policy "Profiles are publicly viewable"
  on public.profiles for select using (true);

-- Users can insert their own profile
create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

### Projects

```sql
-- Public projects are viewable by everyone
create policy "Public projects are viewable by everyone"
  on public.projects for select
  using (is_public = true);

-- Users can view their own private projects
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

-- Users can create projects
create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

-- Users can update own projects
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

-- Users can delete own projects
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);
```

### Tracks

```sql
-- Access tracks through project ownership
create policy "Tracks accessible via project ownership"
  on public.tracks for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = tracks.project_id
      and (projects.is_public = true or projects.owner_id = auth.uid())
    )
  );

create policy "Users can manage tracks in own projects"
  on public.tracks for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = tracks.project_id
      and projects.owner_id = auth.uid()
    )
  );
```

### Stems

```sql
-- Access stems through track → project ownership
create policy "Stems accessible via track ownership"
  on public.stems for select
  using (
    exists (
      select 1 from public.tracks
      join public.projects on projects.id = tracks.project_id
      where tracks.id = stems.track_id
      and (projects.is_public = true or projects.owner_id = auth.uid())
    )
  );

create policy "Users can manage stems in own projects"
  on public.stems for insert
  with check (
    exists (
      select 1 from public.tracks
      join public.projects on projects.id = tracks.project_id
      where tracks.id = stems.track_id
      and projects.owner_id = auth.uid()
    )
  );
```

### Posts

```sql
-- Posts are publicly viewable
create policy "Posts are publicly viewable"
  on public.posts for select using (true);

-- Authenticated users can create posts
create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

-- Users can update/delete own posts
create policy "Users can manage own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);
```

---

## 6. Set Up Storage Buckets

Create storage buckets for audio files.

### Bucket: `audio`

For project stems, tracks, and masters.

```sql
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true);

-- Allow authenticated users to upload
create policy "Authenticated users can upload audio"
  on storage.objects for insert
  with check (
    bucket_id = 'audio'
    and auth.role() = 'authenticated'
  );

-- Allow public read access
create policy "Anyone can read audio"
  on storage.objects for select
  using (bucket_id = 'audio');
```

### Bucket: `avatars`

For profile pictures.

```sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );
```

---

## 7. Auto-Create Profiles on Signup

Trigger to automatically create a profile row when a user signs up:

```sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  );
  return new;
end;
$$;

-- Trigger the function on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 8. Development Without Supabase

When `.env` is missing or empty, the app automatically falls back to a **mock client** (`src/lib/supabase.ts`):

- `signInWithPassword` accepts **any email + any password** and returns a mock session
- `signOut` clears the session
- `getSession` returns the current mock session
- No database, no network required

No `.env` file is needed for UI development. This also means you can run the app immediately after `npm install`.

---

## 9. Verification Checklist

After setup, verify everything works:

- [ ] `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Email/password auth is enabled in Supabase dashboard
- [ ] `supabase/schema.sql` ran successfully (5 tables created)
- [ ] RLS policies are applied to all tables
- [ ] Storage buckets (`audio`, `avatars`) exist
- [ ] Signup trigger `on_auth_user_created` is active
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds

---

## 10. Troubleshooting

| Problem                                     | Solution                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `AuthApiError: invalid API key`             | Check `.env` — `EXPO_PUBLIC_SUPABASE_ANON_KEY` must be the anon key, not `service_role` key |
| `relation "public.profiles" does not exist` | Run `supabase/schema.sql` in SQL Editor                                                     |
| `new row violates row-level security`       | RLS policies are missing — apply the policies from section 5                                |
| Mock auth works but real auth doesn't       | Set up `.env` with valid credentials                                                        |
| File upload fails                           | Check `storage.buckets` exist and RLS upload policies are set                               |
| `expo-secure-store` error on web            | Web uses `localStorage` — handled automatically in `src/lib/supabase.ts`                    |
