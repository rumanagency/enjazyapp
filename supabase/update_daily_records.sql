-- سياسة السماح للأب بحذف (تراجع) التقييمات
CREATE POLICY "Parents can delete daily_records" ON public.daily_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.children WHERE children.id = daily_records.child_id AND children.parent_id = auth.uid())
);
