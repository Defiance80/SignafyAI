-- Extend workflow_runs to accept Blue Wolf Intelligence workflow types
-- Run AFTER 006_allow_free_plan.sql

-- Drop existing constraint so we can replace it
ALTER TABLE workflow_runs DROP CONSTRAINT IF EXISTS workflow_runs_workflow_type_check;

-- Expanded constraint includes BW engine types
ALTER TABLE workflow_runs ADD CONSTRAINT workflow_runs_workflow_type_check
  CHECK (workflow_type IN (
    'lead_discovery',         -- legacy + BW umbrella run
    'content_generation',
    'social_classification',
    'seo_research',
    'analytics_aggregation',
    'prospect_discovery',     -- BW WF1 — business prospect results
    'intent_discovery',       -- BW WF2 — consumer intent signals
    'asset_generation'        -- BW WF3 — funnel asset bundle
  ));
