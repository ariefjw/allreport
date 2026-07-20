-- Migration: Bulk import function for critical jobs
-- Replaces N individual UPDATE queries with a single bulk SQL operation
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.bulk_import_critical_jobs(payload JSONB)
RETURNS TABLE(updated_id UUID, updated_end_timestamp TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH parsed AS (
        SELECT 
            (item->>'id')::uuid AS id,
            (item->>'endTime') AS end_time_str
        FROM jsonb_array_elements(payload) AS item
        WHERE (item->>'endTime') ~ '^\d{1,2}:\d{2}'
    ),
    valid AS (
        SELECT p.id, p.end_time_str, dml.scheduled_timestamp
        FROM parsed p
        JOIN daily_monitoring_log dml ON dml.id = p.id
        WHERE dml.end_timestamp IS NULL
    ),
    calculated AS (
        SELECT 
            v.id,
            v.scheduled_timestamp,
            ((v.scheduled_timestamp AT TIME ZONE 'UTC')::date + v.end_time_str::time) 
                AT TIME ZONE 'Asia/Jakarta' AS end_utc
        FROM valid v
    )
    UPDATE daily_monitoring_log dml
    SET 
        end_timestamp = c.end_utc + 
            CASE WHEN c.end_utc < c.scheduled_timestamp 
                 THEN INTERVAL '1 day' 
                 ELSE INTERVAL '0' 
            END,
        status = '*DONE*',
        updated_at = NOW()
    FROM calculated c
    WHERE dml.id = c.id
      AND dml.end_timestamp IS NULL
    RETURNING dml.id, dml.end_timestamp;
END;
$$;
