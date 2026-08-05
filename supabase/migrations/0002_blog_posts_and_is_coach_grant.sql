-- =====================================================================
--  MuscleHubEG — Blog posts table + is_coach EXECUTE grant
--  Run in Supabase SQL Editor (Dashboard → SQL → New query).
--  Idempotent — safe to run multiple times.
-- =====================================================================

-- ---------- 1. Grant EXECUTE on is_coach() to anon + authenticated ----------
-- The is_coach() function is SECURITY DEFINER so it can read profiles
-- without RLS recursion. But by default Postgres only grants EXECUTE to
-- the function owner + PUBLIC. Supabase's anon/Authenticated roles need
-- explicit EXECUTE permission, otherwise ANY query that touches a table
-- whose RLS policy calls is_coach() will fail with:
--   "permission denied for function is_coach" (42501)
-- This includes blog_posts (public read) which is what was breaking the
-- public blog page on production.

grant execute on function public.is_coach() to anon, authenticated;

-- ---------- 2. blog_posts table ----------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('en', 'ar')),
  title text not null,
  slug text not null,
  excerpt text,
  content text not null default '',
  meta_title text,
  meta_description text,
  focus_keyword text,
  keywords text[] not null default '{}',
  category text not null default 'nutrition',
  tags text[] not null default '{}',
  featured_image text,
  cover_alt text,
  reading_time integer not null default 1,
  author text not null default 'Ahmed Zake',
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  is_published boolean not null default false,
  faq_json jsonb,
  schema_json jsonb,
  linked_post_id uuid references public.blog_posts(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Unique slug per language (so EN and AR can each have /best-workout)
create unique index if not exists blog_posts_slug_language_uidx
  on public.blog_posts (slug, language);

-- Fast filter for the public blog listing (WHERE is_published = true AND language = ?)
create index if not exists blog_posts_published_language_idx
  on public.blog_posts (is_published, language, published_at desc);

-- ---------- 3. RLS policies for blog_posts ----------
alter table public.blog_posts enable row level security;

-- Public can read published posts (the anon role represents unauthenticated
-- visitors). is_coach() is NOT called here — published posts are world-
-- readable without any auth check, so anon visitors don't trip the
-- "permission denied for function is_coach" error.
drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read" on public.blog_posts
  for select to anon, authenticated
  using (is_published = true);

-- Coaches can read ALL posts (published + drafts) — uses is_coach()
-- which is now granted to authenticated.
drop policy if exists "blog_posts_coach_read_all" on public.blog_posts;
create policy "blog_posts_coach_read_all" on public.blog_posts
  for select to authenticated
  using (public.is_coach());

-- Coaches can insert / update / delete any post.
drop policy if exists "blog_posts_coach_write" on public.blog_posts;
create policy "blog_posts_coach_write" on public.blog_posts
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());

-- ---------- 4. auto-update updated_at on UPDATE ----------
create or replace function public.touch_blog_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_blog_posts_touch_updated on public.blog_posts;
create trigger trg_blog_posts_touch_updated
  before update on public.blog_posts
  for each row execute function public.touch_blog_updated_at();

-- ---------- 5. Seed 2 sample articles if the table is empty ----------
-- Only inserts when the table has zero rows, so re-running this migration
-- never clobbers real content. Uses ON CONFLICT DO NOTHING on the
-- (slug, language) unique index so it's safe even if a row already exists.
insert into public.blog_posts
  (language, title, slug, excerpt, content, meta_title, meta_description,
   focus_keyword, keywords, category, tags, featured_image, cover_alt,
   reading_time, is_published, published_at, faq_json)
select * from (values
  ('ar',
   'دليل بناء العضلات للمبتدئين: 7 خطوات علمية مُثبتة',
   'building-muscle-beginners-guide-ar',
   'كل ما تحتاج معرفته لبناء العضلات من الصفر — تغذية، تمارين، راحة، ومتابعة تقدّم. مبنى على أحدث الأبحاث.',
   E'# دليل بناء العضلات للمبتدئين\n\nبناء العضلات مش سحر — ده علم. لو فهمت الأساسيات وطبّقتها باستمرار، النتائج حتكون مضمونة. في الدليل ده هتتعلم:\n\n## 1. مبدأ الحِمل التدريجي\n\nالعضلات بتكبر لما تتعرض لحِمل أكبر من اللي بتعرفه. يعني كل أسبوع لازم تزوّد وزن أو تكرارات أو مقسومات. (Source: Schoenfeld et al., 2017)\n\n## 2. البروتين: كام كفاية؟\n\nالدراسات بتقول 1.6-2.2 جرام بروتين لكل كجم وزن جسم يومياً كافيين لأغلب الناس. (Source: Morton et al., 2018)\n\n## 3. النوم والراحة\n\nالعضلات بتنمو في النوم، مش في الجيم. 7-9 ساعات نوم يومياً ضرورية.\n\n## أهم النقاط\n\n- زوّد الحمل تدريجياً\n- كل بروتين كفاية\n- نام كويس\n- تابع تقدمك\n\n## جاهز لخطة مخصصة؟\n\nالكوتش أحمد زكي بيعمل خطط مخصصة لكل عميل بناءً على هدفك، جدولك، وأكلتك المفضلة. ابدأ تحوّلك اليوم.',
   'دليل بناء العضلات للمبتدئين 2026 | MuscleHub',
   'تعلم بناء العضلات علمياً من الصفر — تغذية، تمارين، راحة. دليل شامل من الكوتش أحمد زكي مبنى على أحدث الأبحاث.',
   'بناء العضلات للمبتدئين',
   array['بناء عضلات', 'تمارين حديد', 'بروتين', 'تغذية رياضية', 'حمل تدريجي'],
   'muscle-gain',
   array['مبتدئين', 'بناء_عضلات', 'تمارين'],
   'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d107f788f4a2.jpg',
   'رياضي يرفع أوزان ثقيلة في جيم بإضاءة درامية',
   6,
   true,
   now() - interval '3 days',
   '[{"question":"إمتى هشوف نتائج؟","answer":"أغلب المبتدئين بيشوفوا نتائج واضحة بعد 6-8 أسابيع من الالتزام."},{"question":"هل أحتاج مكملات؟","answer":"لا. المكملات اختيارية. ركّز على الأكل الحقيقي الأول."}]'::jsonb),
  ('en',
   'The Complete Beginner''s Guide to Building Muscle (7 Science-Based Steps)',
   'building-muscle-beginners-guide',
   'Everything you need to build muscle from scratch — nutrition, training, recovery, and progress tracking. Backed by the latest research.',
   E'# The Complete Beginner''s Guide to Building Muscle\n\nBuilding muscle isn''t magic — it''s science. Once you understand the principles and apply them consistently, the results are predictable. In this guide you''ll learn:\n\n## 1. Progressive Overload\n\nMuscles grow when they''re exposed to a load greater than what they''re used to. That means every week you should add weight, reps, or sets. (Source: Schoenfeld et al., 2017)\n\n## 2. Protein: How Much Is Enough?\n\nStudies show 1.6-2.2 g of protein per kg of body weight per day is sufficient for most people. (Source: Morton et al., 2018)\n\n## 3. Sleep & Recovery\n\nMuscles grow during sleep, not in the gym. 7-9 hours per night is essential.\n\n## Key Takeaways\n\n- Add load progressively\n- Eat enough protein\n- Sleep well\n- Track your progress\n\n## Ready for a Personalized Plan?\n\nCoach Ahmed Zake builds custom plans for every client based on your goal, schedule, and food preferences. Start your transformation today.',
   'Building Muscle for Beginners 2026 | MuscleHub',
   'Learn to build muscle from scratch with science — nutrition, training, recovery. A complete guide from Coach Ahmed Zake backed by the latest research.',
   'building muscle for beginners',
   array['muscle building', 'strength training', 'protein', 'progressive overload', 'workout plan'],
   'muscle-gain',
   array['beginners', 'muscle_building', 'workout'],
   'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6f2587b25688.jpeg',
   'Athlete lifting heavy weights in a gym with dramatic lighting',
   6,
   true,
   now() - interval '2 days',
   '[{"question":"When will I see results?","answer":"Most beginners see noticeable results after 6-8 weeks of consistency."},{"question":"Do I need supplements?","answer":"No. Supplements are optional. Focus on real food first."}]'::jsonb)
) as t(language, title, slug, excerpt, content, meta_title, meta_description,
       focus_keyword, keywords, category, tags, featured_image, cover_alt,
       reading_time, is_published, published_at, faq_json)
where not exists (select 1 from public.blog_posts)
on conflict do nothing;
