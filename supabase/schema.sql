-- تفعيل استخراج المعرفات العشوائية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول الأطفال (children)
CREATE TABLE children (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول الإنجازات (achievements)
CREATE TABLE achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  icon_url TEXT,
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول الربط بين الطفل والإنجاز (child_achievements)
CREATE TABLE child_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE(child_id, achievement_id)
);

-- 4. جدول التقييمات اليومية (daily_records)
CREATE TABLE daily_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('star', 'cross')) NOT NULL,
  UNIQUE(child_id, achievement_id, date)
);

-- ==========================================
-- سياسات الأمان RLS (Row Level Security)
-- ==========================================

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

-- سياسات جدول الأطفال
CREATE POLICY "Parents can view their own children" ON children FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Parents can insert their own children" ON children FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update their own children" ON children FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Parents can delete their own children" ON children FOR DELETE USING (auth.uid() = parent_id);

-- سياسات جدول الإنجازات
CREATE POLICY "Parents can view their own achievements" ON achievements FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Parents can insert their own achievements" ON achievements FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update their own achievements" ON achievements FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Parents can delete their own achievements" ON achievements FOR DELETE USING (auth.uid() = parent_id);

-- سياسات جدول الربط
CREATE POLICY "Parents can view child_achievements" ON child_achievements FOR SELECT USING (
  EXISTS (SELECT 1 FROM children WHERE children.id = child_achievements.child_id AND children.parent_id = auth.uid())
);
CREATE POLICY "Parents can insert child_achievements" ON child_achievements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM children WHERE children.id = child_id AND children.parent_id = auth.uid())
);
CREATE POLICY "Parents can delete child_achievements" ON child_achievements FOR DELETE USING (
  EXISTS (SELECT 1 FROM children WHERE children.id = child_id AND children.parent_id = auth.uid())
);

-- سياسات جدول التقييم اليومي
CREATE POLICY "Parents can view daily_records" ON daily_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM children WHERE children.id = daily_records.child_id AND children.parent_id = auth.uid())
);
CREATE POLICY "Parents can insert daily_records" ON daily_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM children WHERE children.id = child_id AND children.parent_id = auth.uid())
);
CREATE POLICY "Parents can update daily_records" ON daily_records FOR UPDATE USING (
  EXISTS (SELECT 1 FROM children WHERE children.id = child_id AND children.parent_id = auth.uid())
);

-- ==========================================
-- الوظائف الإضافية (Triggers)
-- إدخال 3 إنجازات افتراضية عند تسجيل أب جديد
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.achievements (title, icon_url, parent_id)
  VALUES 
    ('الصلاة في وقتها', 'assets/img/pray.png', new.id),
    ('حل الواجبات', 'assets/img/homework.png', new.id),
    ('ترتيب الغرفة', 'assets/img/clean.png', new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- تفعيل Realtime للشاشة الرئيسية (TV Kiosk)
-- ==========================================

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE daily_records;
ALTER PUBLICATION supabase_realtime ADD TABLE children;
ALTER PUBLICATION supabase_realtime ADD TABLE achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE child_achievements;
