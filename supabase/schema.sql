-- ============================================================================
-- 出来高表アプリ Supabase スキーマ
-- Supabase ダッシュボード → SQL Editor にこの内容を貼り付けて「Run」してください。
-- 何度実行しても安全（IF NOT EXISTS / OR REPLACE）です。
-- ============================================================================

-- 1) 業務データ（全コレクションを汎用ドキュメントとして保持）------------------
create table if not exists public.documents (
  collection text not null,           -- companies / teams / vehicles / rate_items /
                                      -- clients / projects / budgets / sheets /
                                      -- audit_logs / settings
  id text not null,
  doc jsonb not null,                 -- アプリのオブジェクトをそのまま保存
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

-- 2) ユーザープロフィール（認証ユーザーに紐づく氏名・権限）--------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  login_id text unique not null,
  name text not null,
  role text not null default 'genba',  -- admin / keiri / genba / viewer
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) RLS（行レベルセキュリティ）----------------------------------------------
alter table public.documents enable row level security;
alter table public.profiles enable row level security;

-- documents：ログイン済みユーザーは全操作可（社内利用前提）。anon は不可。
drop policy if exists "documents auth all" on public.documents;
create policy "documents auth all"
  on public.documents
  for all
  to authenticated
  using (true)
  with check (true);

-- profiles：ログイン済みは全件閲覧可（氏名表示のため）。
drop policy if exists "profiles auth read" on public.profiles;
create policy "profiles auth read"
  on public.profiles
  for select
  to authenticated
  using (true);

-- profiles：各自は自分の行を作成・更新できる（管理者のユーザー追加に必要）。
drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 管理者は全プロフィールを更新できる（有効/無効・権限変更）。
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
  on public.profiles
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (true);

-- 4) 初回セットアップ判定（ログイン前でも「管理者が居るか」を確認できるようにする）----
create or replace function public.has_any_user()
returns boolean
language sql
security definer
set search_path = public
as $$ select exists (select 1 from public.profiles) $$;

grant execute on function public.has_any_user() to anon, authenticated;

-- 5) Realtime（他PCの変更を即時反映）----------------------------------------
alter publication supabase_realtime add table public.documents;

-- 完了。
-- ※ Authentication → Providers → Email で「Confirm email」を OFF にしてください
--   （社内利用のためメール確認なしで即ログインできるようにします）。
