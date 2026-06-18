-- سياسة السماح للشاشات (التي لا تملك حساب مسجل الدخول) بقراءة بيانات الأبناء للآباء الذين لديهم جلسة شاشة نشطة
CREATE POLICY "Kiosk can view children" ON children FOR SELECT USING (
  parent_id IN (SELECT parent_id FROM kiosk_sessions)
);

-- سياسة السماح للشاشات بقراءة الإنجازات
CREATE POLICY "Kiosk can view achievements" ON achievements FOR SELECT USING (
  parent_id IN (SELECT parent_id FROM kiosk_sessions)
);

-- سياسة السماح للشاشات بقراءة ربط الإنجازات
CREATE POLICY "Kiosk can view child_achievements" ON child_achievements FOR SELECT USING (
  child_id IN (
    SELECT id FROM children WHERE parent_id IN (
      SELECT parent_id FROM kiosk_sessions
    )
  )
);

-- سياسة السماح للشاشات بقراءة التقييمات اليومية
CREATE POLICY "Kiosk can view daily_records" ON daily_records FOR SELECT USING (
  child_id IN (
    SELECT id FROM children WHERE parent_id IN (
      SELECT parent_id FROM kiosk_sessions
    )
  )
);
