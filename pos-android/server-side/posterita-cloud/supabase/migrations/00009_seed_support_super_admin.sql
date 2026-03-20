-- Seed the support@posterita.com super admin user
-- This migration ensures the support team can access the platform
-- If the user already exists, it will be skipped (ON CONFLICT)

-- Create the auth user for support@posterita.com
INSERT INTO auth.users (
    id,
    email,
    email_confirmed_at,
    password_hash,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    last_sign_in_at,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_confirm_status
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'support@posterita.com',
    now(),
    crypt('p05t3r1t4', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    0
) ON CONFLICT (email) DO NOTHING;

-- Register the user as a super admin
INSERT INTO public.super_admin (
    auth_uid,
    email,
    name,
    is_active
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'support@posterita.com',
    'Support Team',
    true
) ON CONFLICT (auth_uid) DO NOTHING;
