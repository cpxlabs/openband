-- Run this script in the Supabase SQL editor to create the database schema.

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
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'Sem título' not null,
  bpm integer default 120 not null,
  time_signature text default '4/4' not null,
  is_public boolean default false not null,
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
