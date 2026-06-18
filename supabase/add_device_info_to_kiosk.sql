-- إضافة حقل نوع الجهاز لمعرفة الشاشة المرتبطة
ALTER TABLE public.kiosk_sessions ADD COLUMN IF NOT EXISTS device_info TEXT DEFAULT 'غير معروف';
