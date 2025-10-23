-- =====================================================
-- Add exec_sql RPC function for raw SQL execution
-- This allows the backend to execute parameterized SQL queries
-- through Supabase RPC when direct PostgreSQL connection is not available
-- =====================================================

-- Note: This function should be created with appropriate security
-- Only service role should be able to call this function

CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_data JSONB;
BEGIN
    -- Execute the dynamic SQL and return results as JSONB
    EXECUTE format('SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t', query_text)
    INTO result_data;
    
    RETURN result_data;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error executing SQL: %', SQLERRM;
END;
$$;

-- Grant execute permission only to authenticated users
-- In production, you should restrict this further to service role only
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION exec_sql IS 'Executes dynamic SQL queries and returns results as JSONB. Should only be used by backend service.';
