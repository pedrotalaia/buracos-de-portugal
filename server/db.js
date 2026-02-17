import { Pool } from 'pg';

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Define NEON_DATABASE_URL ou DATABASE_URL no ambiente.');
}

export const pool = new Pool({ connectionString });

export async function initSchema() {
  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists public.profiles (
      id text primary key,
      display_name text,
      avatar_url text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists public.potholes (
      id uuid primary key default gen_random_uuid(),
      user_id text,
      lat double precision not null,
      lng double precision not null,
      address text,
      normalized_address text,
      parish text,
      municipality text,
      district text,
      postal_code text,
      geocode_status text not null default 'pending' check (geocode_status in ('pending','resolved','failed','manual')),
      geocoded_at timestamptz,
      description text,
      photo_url text,
      severity text not null default 'moderate' check (severity in ('low','moderate','high')),
      status text not null default 'reported' check (status in ('reported','repairing','repaired','archived')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      repaired_at timestamptz,
      reopen_count integer not null default 0
    );

    create table if not exists public.votes (
      id uuid primary key default gen_random_uuid(),
      pothole_id uuid not null references public.potholes(id) on delete cascade,
      user_id text,
      anon_id text,
      created_at timestamptz not null default now(),
      check ((user_id is not null and anon_id is null) or (user_id is null and anon_id is not null))
    );

    create unique index if not exists votes_unique_user_vote on public.votes(pothole_id, user_id) where user_id is not null;
    create unique index if not exists votes_unique_anon_vote on public.votes(pothole_id, anon_id) where anon_id is not null;

    create table if not exists public.comments (
      id uuid primary key default gen_random_uuid(),
      pothole_id uuid not null references public.potholes(id) on delete cascade,
      user_id text not null,
      content text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_potholes_geocode_status on public.potholes(geocode_status);
    create index if not exists idx_potholes_municipality on public.potholes(municipality);
    create index if not exists idx_potholes_district on public.potholes(district);

    create or replace function public.update_updated_at_column()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;

    drop trigger if exists update_potholes_updated_at on public.potholes;
    create trigger update_potholes_updated_at before update on public.potholes for each row execute function public.update_updated_at_column();

    drop trigger if exists update_comments_updated_at on public.comments;
    create trigger update_comments_updated_at before update on public.comments for each row execute function public.update_updated_at_column();

    drop trigger if exists update_profiles_updated_at on public.profiles;
    create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

    do $$
    begin
      begin
        alter table public.profiles alter column id type text using id::text;
      exception when undefined_table then
        null;
      end;

      begin
        alter table public.potholes alter column user_id type text using user_id::text;
      exception when undefined_table then
        null;
      end;

      begin
        alter table public.votes alter column user_id type text using user_id::text;
      exception when undefined_table then
        null;
      end;

      begin
        alter table public.comments alter column user_id type text using user_id::text;
      exception when undefined_table then
        null;
      end;
    end
    $$;
  `);
}
