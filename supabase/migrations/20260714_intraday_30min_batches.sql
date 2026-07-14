-- Migration: Intraday batches every 30 minutes (08:30–17:30)
-- Run in Supabase SQL Editor if your DB still has the old 10 hourly batches.

-- Remove today's intraday logs so daily-init can recreate them with new batch count
DELETE FROM daily_intraday_log
WHERE operational_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date;

-- Replace master batch schedule for cbs_mspayment_intraday
DELETE FROM master_intraday_batches
WHERE intraday_job_id = (
  SELECT id FROM master_intraday_jobs WHERE job_name = 'cbs_mspayment_intraday'
);

INSERT INTO master_intraday_batches (intraday_job_id, batch_number, default_started_time)
SELECT j.id, b.batch_number, b.started_time::time
FROM master_intraday_jobs j
CROSS JOIN (VALUES
    (1, '08:30:00'), (2, '09:00:00'), (3, '09:30:00'), (4, '10:00:00'),
    (5, '10:30:00'), (6, '11:00:00'), (7, '11:30:00'), (8, '12:00:00'),
    (9, '12:30:00'), (10, '13:00:00'), (11, '13:30:00'), (12, '14:00:00'),
    (13, '14:30:00'), (14, '15:00:00'), (15, '15:30:00'), (16, '16:00:00'),
    (17, '16:30:00'), (18, '17:00:00'), (19, '17:30:00')
) AS b(batch_number, started_time)
WHERE j.job_name = 'cbs_mspayment_intraday';
