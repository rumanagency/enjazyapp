-- 1. إنشاء حاوية التخزين (Bucket) للصور
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- السماح للجميع بقراءة الصور من الحاوية
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'uploads' );

-- السماح للآباء المسجلين برفع الصور
CREATE POLICY "Auth Users Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'uploads' AND auth.role() = 'authenticated' );

-- السماح للآباء بتحديث صورهم
CREATE POLICY "Auth Users Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'uploads' AND auth.role() = 'authenticated' );

-- السماح للآباء بحذف صورهم
CREATE POLICY "Auth Users Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'uploads' AND auth.role() = 'authenticated' );

-- 2. تحديث الدالة التلقائية (Trigger) للإنجازات الجديدة
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.achievements (title, icon_url, parent_id)
  VALUES 
    ('الصلاة في وقتها', '/assets/icons/prayer-mat.png', new.id),
    ('قراءة القرآن', '/assets/icons/quran.png', new.id),
    ('تفريش الأسنان', '/assets/icons/toothbrush.png', new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تصحيح مسارات الأيقونات للإنجازات التي تم إنشاؤها مسبقاً
UPDATE public.achievements 
SET icon_url = '/assets/icons/prayer-mat.png', title = 'الصلاة في وقتها'
WHERE title LIKE '%الصلاة%';

UPDATE public.achievements 
SET icon_url = '/assets/icons/toothbrush.png', title = 'تفريش الأسنان'
WHERE title LIKE '%الواجبات%' OR title LIKE '%تفريش%';

UPDATE public.achievements 
SET icon_url = '/assets/icons/quran.png', title = 'قراءة القرآن'
WHERE title LIKE '%ترتيب الغرفة%' OR title LIKE '%قراءة%';

