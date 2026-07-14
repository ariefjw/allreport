-- Job Track Central — Full schema, RLS, storage, seed data
-- Run in Supabase SQL Editor

-- =========================================================================
-- MASTER DATA
-- =========================================================================

CREATE TABLE IF NOT EXISTS master_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL UNIQUE,
    default_schedule_time TIME NOT NULL,
    is_cross_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_intraday_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_intraday_batches (
    id SERIAL PRIMARY KEY,
    intraday_job_id INT REFERENCES master_intraday_jobs(id) ON DELETE CASCADE,
    batch_number INT NOT NULL,
    default_started_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (intraday_job_id, batch_number)
);

-- =========================================================================
-- DAILY LOGS
-- =========================================================================

CREATE TABLE IF NOT EXISTS daily_monitoring_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operational_date DATE NOT NULL,
    job_id INT REFERENCES master_jobs(id) ON DELETE CASCADE,
    job_name VARCHAR(255) NOT NULL,
    scheduled_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT '*WAITING*' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (operational_date, job_id)
);

CREATE TABLE IF NOT EXISTS daily_intraday_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operational_date DATE NOT NULL,
    batch_id INT REFERENCES master_intraday_batches(id) ON DELETE CASCADE,
    batch_number INT NOT NULL,
    started_time TIME NOT NULL,
    finished_timestamp TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (operational_date, batch_id)
);

CREATE TABLE IF NOT EXISTS daily_error_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operational_date DATE NOT NULL DEFAULT CURRENT_DATE,
    error_title VARCHAR(255) NOT NULL,
    error_text_log TEXT NOT NULL,
    screenshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- INDEXES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_mod1_date_order ON daily_monitoring_log(operational_date, job_id);
CREATE INDEX IF NOT EXISTS idx_mod2_date_order ON daily_intraday_log(operational_date, batch_number);
CREATE INDEX IF NOT EXISTS idx_mod3_date ON daily_error_log(operational_date);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

ALTER TABLE master_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_intraday_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_intraday_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_monitoring_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_intraday_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_master_jobs" ON master_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_master_intraday_jobs" ON master_intraday_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_master_intraday_batches" ON master_intraday_batches FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_all_daily_monitoring" ON daily_monitoring_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_daily_intraday" ON daily_intraday_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_daily_error" ON daily_error_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- STORAGE BUCKET
-- =========================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('error-screenshots', 'error-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'error-screenshots');

CREATE POLICY "public_read_screenshots"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'error-screenshots');

-- =========================================================================
-- SEED: 42 Critical Jobs
-- =========================================================================

INSERT INTO master_jobs (job_name, default_schedule_time, is_cross_day) VALUES
('cbs_tradefinance_to_landing', '22:30:00', true),
('cbs_loaniq_to_landing', '23:00:00', true),
('dag_cbs_ism_gbr', '23:00:00', true),
('cms_cccore_to_datalake', '00:00:00', false),
('dag_wms_crn_level', '00:00:00', false),
('equation_batch_btpmis', '00:00:00', false),
('equation_ymis_to_datalake', '00:00:00', false),
('ods_cms_data_metric', '00:00:00', false),
('wms_data_metric', '00:00:00', false),
('customer_golden_data_metric_rev', '00:30:00', false),
('dag_exus_to_datalake', '00:30:00', false),
('fes_to_datalake', '00:30:00', false),
('jfast_daily_data_metric', '00:30:00', false),
('crm_data_drop', '01:00:00', false),
('dag_exus_job', '01:00:00', false),
('dsme_reminder', '01:00:00', false),
('eadvis_batch_airflow', '01:00:00', false),
('equation_batch_data_metric', '01:00:00', false),
('NET_POS_HIST_RLUD_Job', '01:00:00', false),
('ods_to_staging_and_history_data_metric', '01:00:00', false),
('penyamaan_collect_data_metric', '01:00:00', false),
('tfms_daily_metric_net', '01:00:00', false),
('cbs_commandos_to_ods', '02:00:00', false),
('ods_jfmf_data_metric', '02:00:00', false),
('TCMS_Job', '02:00:00', false),
('two_job', '02:00:00', false),
('cbs_mspayment', '03:00:00', false),
('cms_dlk_to_efs', '03:00:00', false),
('TIS', '03:00:00', false),
('TWO_TCMS_To_ODS_NET', '03:00:00', false),
('cbs_loaniq_to_ods', '03:30:00', false),
('cbs_tradefinance_to_ods', '03:30:00', false),
('cbs_treasury_to_ods', '03:30:00', false),
('cbs_datalake2edw', '04:00:00', false),
('dag_ers_job (non egl)', '04:00:00', false),
('dag_ers_job (egl)', '04:00:00', false),
('dag_cbs_irrs_daily', '04:00:00', false),
('cbs_regla_to_down', '04:00:00', false),
('dag_cbs_mis_corporate', '04:00:00', false),
('cbs_lll_to_landing', '05:00:00', false),
('cbs_sas_aml_daily', '07:00:00', false),
('egl_to_dlk_migration', '08:30:00', false)
ON CONFLICT (job_name) DO NOTHING;

-- =========================================================================
-- SEED: Intraday Job + 19 Batches (every 30 min, 08:30–17:30)
-- =========================================================================

INSERT INTO master_intraday_jobs (job_name)
VALUES ('cbs_mspayment_intraday')
ON CONFLICT (job_name) DO NOTHING;

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
WHERE j.job_name = 'cbs_mspayment_intraday'
ON CONFLICT (intraday_job_id, batch_number) DO NOTHING;

-- Enable realtime for daily log tables
ALTER PUBLICATION supabase_realtime ADD TABLE daily_monitoring_log;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_intraday_log;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_error_log;
