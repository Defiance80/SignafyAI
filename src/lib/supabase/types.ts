export type Plan = "starter" | "pro" | "agency";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";
export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type LeadPlatform = "instagram" | "linkedin" | "tiktok" | "twitter" | "facebook" | "google" | "manual";
export type ContentType = "blog_post" | "social_caption" | "email_sequence" | "ad_copy" | "video_script";
export type ContentStatus = "draft" | "approved" | "scheduled" | "published";
export type WorkflowType = "lead_discovery" | "content_generation" | "social_classification" | "seo_research" | "analytics_aggregation";
export type WorkflowStatus = "pending" | "running" | "complete" | "failed";
export type MessageStatus = "pending" | "replied" | "dismissed" | "escalated";
export type ReplyStatus = "draft" | "approved" | "sent" | "failed";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  usage_leads_mo: number;
  usage_content_mo: number;
  limits_leads_mo: number;
  limits_content_mo: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  notification_prefs: Record<string, boolean> | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Lead {
  id: string;
  org_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  platform: LeadPlatform | null;
  source_url: string | null;
  score: number;
  status: LeadStatus;
  industry: string | null;
  location: string | null;
  notes: string | null;
  tags: string[];
  enrichment_data: Record<string, unknown> | null;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  org_id: string;
  type: "discovered" | "scored" | "contacted" | "replied" | "status_changed" | "note_added";
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface LeadDiscoveryConfig {
  id: string;
  org_id: string;
  name: string;
  filters: {
    target_market?: "b2b" | "b2c";
    b2c_sources?: Array<"reddit" | "review_platforms" | "directories">;
    b2b_sources?: Array<"linkedin" | "directories" | "company_websites">;
    industry?: string;
    location?: string;
    platforms?: string[];
    keywords?: string[];
    min_score?: number;
  };
  schedule: string | null;
  last_run_at: string | null;
  created_at: string;
}

export interface BrandVoice {
  id: string;
  org_id: string;
  name: string;
  tone: string | null;
  vocabulary: string[];
  avoid_words: string[];
  example_posts: string[];
  cta_style: string | null;
  platform_rules: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentPiece {
  id: string;
  org_id: string;
  voice_id: string | null;
  type: ContentType;
  platform: string | null;
  prompt: string | null;
  body: string;
  char_count: number | null;
  engagement_prediction: number | null;
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  metadata: {
    hashtags?: string[];
    media_suggestions?: string[];
    ab_variants?: string[];
  } | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  org_id: string;
  platform: LeadPlatform;
  account_name: string;
  account_id: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialMessage {
  id: string;
  org_id: string;
  account_id: string;
  platform: string;
  platform_msg_id: string | null;
  author_name: string | null;
  author_handle: string | null;
  author_avatar: string | null;
  message_type: "comment" | "dm" | "mention" | "reply";
  body: string;
  intent: "inquiry" | "complaint" | "praise" | "spam" | "partnership" | "purchase_intent" | null;
  sentiment: number | null;
  is_read: boolean;
  status: MessageStatus;
  parent_msg_id: string | null;
  received_at: string;
  created_at: string;
}

export interface SocialReply {
  id: string;
  message_id: string;
  org_id: string;
  body: string;
  voice_id: string | null;
  status: ReplyStatus;
  sent_at: string | null;
  created_at: string;
}

export interface SeoProject {
  id: string;
  org_id: string;
  name: string;
  target_domain: string | null;
  target_keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface SeoKeyword {
  id: string;
  project_id: string;
  org_id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  difficulty_label: "easy" | "medium" | "hard" | null;
  cpc: number | null;
  intent: "informational" | "transactional" | "navigational" | "commercial" | null;
  trend: "up" | "down" | "stable" | null;
  cluster: string | null;
  serp_features: string[];
  position: number | null;
  url_ranking: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  budget_spent: number;
  channels: string[];
  goal: "awareness" | "engagement" | "leads" | "conversions" | null;
  target_audience: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDaily {
  id: string;
  org_id: string;
  date: string;
  total_reach: number;
  total_impressions: number;
  total_engagement: number;
  engagement_rate: number;
  leads_generated: number;
  conversions: number;
  revenue_attributed: number;
  platform_breakdown: Record<string, { reach: number; engagement: number }> | null;
  created_at: string;
}

export interface WorkflowRun {
  id: string;
  org_id: string;
  workflow_type: WorkflowType;
  n8n_execution_id: string | null;
  status: WorkflowStatus;
  input_params: Record<string, unknown> | null;
  output_summary: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

// ─── API response shapes ─────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface OrgContext {
  org: Organization;
  userId: string;
  role: OrgRole;
  /** Super admin can bypass plan gates/limits for testing. */
  isSuperAdmin?: boolean;
}
