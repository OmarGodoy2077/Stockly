-- =====================================================
-- VERIFICATION: Check if Invitation System Migration was Applied
-- Run this in Supabase SQL Editor to verify migration status
-- =====================================================

-- 1. Check if invitations table exists
SELECT 'invitations table exists' as check_name,
       EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_name = 'invitations'
       ) as status;

-- 2. Check if generate_invitation_code function exists
SELECT 'generate_invitation_code function exists' as check_name,
       EXISTS (
           SELECT 1 FROM information_schema.routines
           WHERE routine_name = 'generate_invitation_code'
       ) as status;

-- 3. Check if validate_invitation function exists
SELECT 'validate_invitation function exists' as check_name,
       EXISTS (
           SELECT 1 FROM information_schema.routines
           WHERE routine_name = 'validate_invitation'
       ) as status;

-- 4. Check if cleanup_expired_invitations function exists
SELECT 'cleanup_expired_invitations function exists' as check_name,
       EXISTS (
           SELECT 1 FROM information_schema.routines
           WHERE routine_name = 'cleanup_expired_invitations'
       ) as status;

-- 5. Check if invitation_code_used column exists in user_company
SELECT 'invitation_code_used column exists' as check_name,
       EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'user_company' AND column_name = 'invitation_code_used'
       ) as status;

-- 6. Check if indexes exist
SELECT 'invitations indexes exist' as check_name,
       COUNT(*) > 0 as status
FROM pg_indexes
WHERE tablename = 'invitations';

-- 7. Test generate_invitation_code function
SELECT 'generate_invitation_code works' as check_name,
       CASE
           WHEN LENGTH(generate_invitation_code()) = 8 THEN true
           ELSE false
       END as status;

-- 8. Check RLS policies
SELECT 'RLS policies exist' as check_name,
       COUNT(*) > 0 as status
FROM pg_policies
WHERE tablename = 'invitations';

-- =====================================================
-- SUMMARY QUERY - Run this for quick overview
-- =====================================================

SELECT
    'Migration Status Summary' as summary,
    (SELECT COUNT(*) FROM (
        SELECT 'invitations table' as component,
               EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') as exists_flag
        UNION ALL
        SELECT 'generate_invitation_code function',
               EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_invitation_code')
        UNION ALL
        SELECT 'validate_invitation function',
               EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'validate_invitation')
        UNION ALL
        SELECT 'cleanup_expired_invitations function',
               EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'cleanup_expired_invitations')
        UNION ALL
        SELECT 'invitation_code_used column',
               EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_company' AND column_name = 'invitation_code_used')
        UNION ALL
        SELECT 'indexes created',
               (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'invitations') > 0
        UNION ALL
        SELECT 'RLS policies',
               (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'invitations') > 0
    ) as components WHERE exists_flag = true) as components_ready,
    7 as total_components;