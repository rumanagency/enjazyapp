-- 1. إضافة حقل مدة العرض (kiosk_duration) لجدول الأبناء بالثواني (افتراضي 10 ثواني)
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS kiosk_duration INTEGER DEFAULT 10;

-- 2. إنشاء جدول جلسات الشاشة (kiosk_sessions)
CREATE TABLE IF NOT EXISTS public.kiosk_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. تفعيل RLS على جدول الجلسات
ALTER TABLE public.kiosk_sessions ENABLE ROW LEVEL SECURITY;

-- 4. إضافة سياسات الأمان
-- أ. السماح للشاشة بإنشاء كود جديد بدون تسجيل دخول
CREATE POLICY "Anyone can insert kiosk_sessions" ON public.kiosk_sessions FOR INSERT WITH CHECK (true);

-- ب. السماح للجميع بقراءة الجلسات (لمعرفة هل تم الربط أم لا)
CREATE POLICY "Anyone can view kiosk_sessions" ON public.kiosk_sessions FOR SELECT USING (true);

-- ج. السماح للأب بتحديث الجلسة وربطها بحسابه
CREATE POLICY "Parents can update kiosk_sessions" ON public.kiosk_sessions FOR UPDATE USING (true);

-- 5. تفعيل الاستماع المباشر (Realtime) لجدول جلسات الشاشة
ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosk_sessions;
