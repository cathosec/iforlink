
alter table public.user_categories add column if not exists is_public boolean not null default true;

drop policy if exists "Public categories visible to all" on public.user_categories;
create policy "Public categories visible to all"
  on public.user_categories for select
  using (is_visible = true and is_public = true);

drop policy if exists "Public links visible to all" on public.links;
create policy "Public links visible to all"
  on public.links for select
  using (
    is_visible = true
    and exists (
      select 1 from public.user_categories c
      where c.id = links.category_id
        and c.is_visible = true
        and c.is_public = true
    )
  );
