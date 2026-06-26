-- Run this script in the Supabase SQL editor to create the database schema.

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Perfis de utilizadores (Músicos)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Projetos (Músicas em desenvolvimento no Estúdio)
create type public.mood_type as enum ('day', 'night', 'sun', 'rain', 'snow');

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'Sem título' not null,
  bpm integer default 120 not null,
  time_signature text default '4/4' not null,
  is_public boolean default false not null,
  mood public.mood_type,
  cover_url text,
  chords jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Trilhas de Áudio dentro do projeto (ex: Voz, Guitarra)
create table public.tracks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text default 'Nova Trilha' not null,
  volume float default 1.0 not null,
  muted boolean default false not null,
  solo boolean default false not null,
  pan float default 0.0 not null,
  order_index integer not null
);

-- 4. Segmentos/Ficheiros de áudio na Linha do Tempo (Timeline)
create table public.stems (
  id uuid default gen_random_uuid() primary key,
  track_id uuid references public.tracks(id) on delete cascade not null,
  file_url text not null,
  start_time float default 0.0 not null,
  duration float not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Posts no Feed Global (Projetos Publicados)
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  master_audio_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================
-- AUTH COLUMNS (email/password + Google OAuth)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'FREE';

-- ============================================================
-- USER SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REMIX GRAPH
-- ============================================================

alter table public.projects add column if not exists parent_project_id uuid references public.projects(id) on delete set null;
alter table public.projects add column if not exists is_published boolean default false;
alter table public.projects add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

create table if not exists public.remixes (
  id uuid default gen_random_uuid() primary key,
  original_project_id uuid not null references public.projects(id) on delete cascade,
  remixed_project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(original_project_id, remixed_project_id)
);

create table if not exists public.project_reactions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id, reaction)
);

-- ============================================================
-- PROJECT ACTIVITY LOG (AUDIT TRAIL)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tracks enable row level security;
alter table public.stems enable row level security;
alter table public.posts enable row level security;
alter table public.remixes enable row level security;
alter table public.project_reactions enable row level security;
alter table public.project_activity enable row level security;

-- Profiles
create policy "Profiles are publicly viewable"
  on public.profiles for select using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Projects
create policy "Public projects are viewable by everyone"
  on public.projects for select
  using (is_public = true);

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- Tracks
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

create policy "Users can update tracks in own projects"
  on public.tracks for update
  using (
    exists (
      select 1 from public.projects
      where projects.id = tracks.project_id
      and projects.owner_id = auth.uid()
    )
  );

create policy "Users can delete tracks in own projects"
  on public.tracks for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = tracks.project_id
      and projects.owner_id = auth.uid()
    )
  );

-- Stems
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

create policy "Users can update stems in own projects"
  on public.stems for update
  using (
    exists (
      select 1 from public.tracks
      join public.projects on projects.id = tracks.project_id
      where tracks.id = stems.track_id
      and projects.owner_id = auth.uid()
    )
  );

create policy "Users can delete stems in own projects"
  on public.stems for delete
  using (
    exists (
      select 1 from public.tracks
      join public.projects on projects.id = tracks.project_id
      where tracks.id = stems.track_id
      and projects.owner_id = auth.uid()
    )
  );

-- Posts
create policy "Posts are publicly viewable"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.posts for update using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- Remixes
create policy "Remixes are publicly viewable"
  on public.remixes for select using (true);

create policy "Authenticated users can create remixes"
  on public.remixes for insert
  with check (auth.uid() = created_by);

-- Project Reactions
create policy "Reactions are publicly viewable"
  on public.project_reactions for select using (true);

create policy "Authenticated users can create reactions"
  on public.project_reactions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reactions"
  on public.project_reactions for delete
  using (auth.uid() = user_id);

-- Project Activity
create policy "Activity visible to project viewers"
  on public.project_activity for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_activity.project_id
      and (projects.is_public = true or projects.owner_id = auth.uid())
    )
  );

create policy "Authenticated users can log activity"
  on public.project_activity for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILES ON SIGNUP
-- ============================================================

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SOFT-DELETE (TRASH BIN)
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- CREATIVE DNA
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creative_tags TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT '';

-- ============================================================
-- SHARED BAND ACCOUNTS (RBAC)
-- ============================================================

CREATE TABLE IF NOT EXISTS bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS band_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id UUID NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(band_id, user_id)
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS band_id UUID REFERENCES bands(id) ON DELETE SET NULL;

-- ============================================================
-- USER MIXING TEMPLATES
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mixing_preferences JSONB DEFAULT '{}';

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload audio to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'audio'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can read audio"
  on storage.objects for select
  using (bucket_id = 'audio');

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );
