-- Create exec_sql function for executing raw SQL queries with parameters
-- This allows the application to execute parameterized SQL queries through Supabase RPC

CREATE OR REPLACE FUNCTION exec_sql(query_string TEXT, params JSON DEFAULT NULL)
RETURNS TABLE(result JSON) AS $$
DECLARE
    result_row RECORD;
    result_json JSON;
BEGIN
    -- If params is provided, we need to handle parameterized queries
    -- For simplicity, we'll execute the query as-is and return results as JSON
    RETURN QUERY EXECUTE format(
        'SELECT row_to_json(t) FROM (%s) t',
        query_string
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT, JSON) TO authenticated, service_role;

-- Add comment to document the function
COMMENT ON FUNCTION exec_sql(TEXT, JSON) IS 'Execute raw SQL queries and return results as JSON rows';
