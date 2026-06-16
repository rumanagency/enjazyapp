-- إنشاء حساب السوبر أدمن: hi@ruman.sa / Ruman123@!
DO $$
DECLARE
  super_admin_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hi@ruman.sa') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', super_admin_id, 'authenticated', 'authenticated', 
      'hi@ruman.sa', crypt('Ruman123@!', gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}', '{"is_super_admin": true}', now(), now(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at, id
    )
    VALUES (
      super_admin_id::text, super_admin_id, format('{"sub":"%s","email":"%s"}', super_admin_id, 'hi@ruman.sa')::jsonb, 
      'email', now(), now(), gen_random_uuid()
    );
  END IF;
END $$;
