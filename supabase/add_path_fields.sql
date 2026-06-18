-- إضافة الهدف الأسبوعي للنجوم لكل طفل، افتراضياً 10
ALTER TABLE children ADD COLUMN IF NOT EXISTS weekly_star_goal INTEGER DEFAULT 10;

-- إضافة تاريخ آخر تصفير لمسار الإنجاز
ALTER TABLE children ADD COLUMN IF NOT EXISTS path_reset_timestamp TIMESTAMP WITH TIME ZONE;

-- إضافة تاريخ إنشاء التقييمات حتى نتمكن من تصفية النجوم بدقة حسب التصفير اليومي
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
