-- إضافة صلاحية الحذف لجلسات الشاشة حتى يتمكن الأب من إلغاء الربط
CREATE POLICY "Parents can delete kiosk_sessions" ON public.kiosk_sessions FOR DELETE USING (auth.uid() = parent_id);
