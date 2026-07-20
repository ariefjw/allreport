-- Migration: Bulk import function for intraday jobs
-- Replaces N individual UPDATE queries with a single bulk SQL operation
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.bulk_import_intraday_jobs(payload JSONB)
RETURNS TABLE(updated_id UUID, updated_finished_timestamp TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH parsed AS (
        SELECT 
            (item->>'id')::uuid AS id,
            (item->>'finishedTime') AS finished_time_str
        FROM jsonb_array_elements(payload) AS item
        WHERE (item->>'finishedTime') ~ '^\d{1,2}:\d{2}'
    ),
    valid AS (
        SELECT p.id, p.finished_time_str, d.operational_date
        FROM parsed p
        JOIN daily_intraday_log d ON d.id = p.id
        WHERE d.finished_timestamp IS NULL
    )
    UPDATE daily_intraday_log d
    SET 
        finished_timestamp = (v.operational_date + v.finished_time_str::time) AT TIME ZONE 'Asia/Jakarta',
        updated_at = NOW()
    FROM valid v
    WHERE d.id = v.id
      AND d.finished_timestamp IS NULL
    RETURNING d.id, d.finished_timestamp;
END;
$$;
