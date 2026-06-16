-- ==========================================
-- دوال السوبر أدمن لإدارة المستخدمين
-- ==========================================

-- 1. دالة جلب قائمة المستخدمين
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  is_banned BOOLEAN,
  is_super_admin BOOLEAN
) AS $$
BEGIN
  -- التحقق من أن المستخدم الحالي هو سوبر أدمن
  IF (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY 
  SELECT 
    u.id, 
    u.email::VARCHAR, 
    u.created_at, 
    u.last_sign_in_at, 
    (u.banned_until IS NOT NULL AND u.banned_until > now()) AS is_banned,
    (u.raw_user_meta_data ->> 'is_super_admin')::boolean AS is_super_admin
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. دالة حظر / فك حظر المستخدم
CREATE OR REPLACE FUNCTION public.admin_toggle_user_ban(target_uid UUID, ban BOOLEAN)
RETURNS void AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك حظر نفسك!';
  END IF;

  IF ban THEN
    UPDATE auth.users SET banned_until = '2100-01-01'::timestamp WHERE id = target_uid;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = target_uid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. دالة حذف المستخدم نهائياً
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_uid UUID)
RETURNS void AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF target_uid = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك حذف نفسك!';
  END IF;

  DELETE FROM auth.users WHERE id = target_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
