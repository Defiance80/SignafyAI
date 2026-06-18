-- Usage counter RPC used by n8n callback handler
CREATE OR REPLACE FUNCTION increment_leads_usage(p_org_id UUID, p_amount INT)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET usage_leads_mo = usage_leads_mo + GREATEST(p_amount, 0)
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_content_usage(p_org_id UUID, p_amount INT)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET usage_content_mo = usage_content_mo + GREATEST(p_amount, 0)
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
