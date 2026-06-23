import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { triggerContentCalendarGeneration } from "@/lib/n8n";
import { buildServerClient, resolveOrgId } from "@/lib/supabase/resolve-org";
import crypto from "crypto";

const serverClient = buildServerClient;
const resolveOrg = (userId: string, supabase: ReturnType<typeof buildServerClient>) =>
  resolveOrgId(userId, supabase!);

// ── Demo suggestions ──────────────────────────────────────────
const DEMO_SUGGESTIONS = [
  {
    id: "demo-sug-1",
    title: "3 Signs Your Marketing Is Invisible (And How to Fix It)",
    topic: "Marketing visibility",
    content_type: "educational",
    target_platforms: ["linkedin", "instagram"],
    best_posting_time: "Tuesday 9am",
    performance_score: 87,
    virality_score: 82,
    image_type: "ai_generated",
    image_prompt: "Minimalist graphic showing spotlight beam highlighting a small business among grayed-out competitors, vibrant purple accent, clean white background",
    image_description: "Spotlight on small business standing out from crowd",
    benchmark_reference: "Similar posts from @garyvee and @alexhormozi on 'invisible marketing' averaged 45K likes with 8.2% engagement",
    optimization_tips: [
      "Open with a relatable pain point — 'If nobody's engaging with your posts, this is why'",
      "Use a numbered list format — LinkedIn algorithm favors structured posts",
      "End with a question to drive comments: 'Which of these 3 are you guilty of?'"
    ],
    engagement_prediction: { likes: 420, comments: 68, shares: 34, reach: 8200 },
    status: "pending",
    week_of: new Date().toISOString().slice(0, 10),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    variations: [
      {
        id: "demo-var-1a",
        variation_label: "A",
        tone: "Direct & Provocative",
        hook: "Your marketing isn't bad. It's invisible. Here's the difference:",
        caption: "Your marketing isn't bad. It's invisible.\n\nThere's a difference — and most business owners never realize it.\n\n3 signs your content is flying under the radar:\n\n❌ You're posting for yourself, not your audience\n❌ Your captions start with 'I' or 'We'\n❌ You have zero pattern interrupts in your visuals\n\nThe fix? One shift in how you open every single post.\n\nStart with THEIR problem. Not your solution.\n\n\"Struggling to get clients?\" beats \"We help businesses grow\" every time.\n\nWhich of these 3 are you guilty of? Drop a number below 👇",
        hashtags: ["#MarketingTips", "#SmallBusiness", "#ContentStrategy", "#LinkedIn"],
        cta: "Drop a number below 👇",
        predicted_reach: 9400,
        is_selected: false,
      },
      {
        id: "demo-var-1b",
        variation_label: "B",
        tone: "Educational & Warm",
        hook: "Most small businesses have great services but invisible marketing.",
        caption: "Most small businesses have great services — but invisible marketing.\n\nAfter studying 200+ brands, I found 3 patterns that keep businesses stuck:\n\n1️⃣ Posts that talk about YOU instead of serving THEM\n2️⃣ Captions that bury the value in paragraph 3\n3️⃣ Visuals that blend into the scroll\n\nThe brands breaking through? They do the opposite.\n\nThey lead with empathy. They hook in 3 words or fewer. Their visuals STOP thumbs.\n\nWant me to audit one of your recent posts? Comment 'AUDIT' and I'll give you real feedback this week. 🎯",
        hashtags: ["#MarketingStrategy", "#BusinessGrowth", "#ContentMarketing"],
        cta: "Comment 'AUDIT'",
        predicted_reach: 7800,
        is_selected: false,
      },
      {
        id: "demo-var-1c",
        variation_label: "C",
        tone: "Story-driven",
        hook: "A client showed me their 6-month content archive. Not a single post had over 12 likes.",
        caption: "A client showed me their 6-month content archive.\n\nNot a single post had over 12 likes.\n\nGreat service. Real results. Zero traction.\n\nWe spent 20 minutes changing ONE thing — how they opened every post.\n\nInstead of: \"We're excited to share our new service!\"\nWe wrote: \"If you've tried everything and clients still aren't coming — read this.\"\n\nNext post: 340 likes. 3 inquiries.\n\nSame product. Completely different frame.\n\nInvisible marketing isn't about what you offer. It's about how you open the conversation.\n\nWhat's the first line of your last post? I'll tell you if it's working. 👇",
        hashtags: ["#Marketing", "#SmallBiz", "#ContentCreator", "#BusinessTips"],
        cta: "Tell me your first line",
        predicted_reach: 11200,
        is_selected: false,
      },
    ],
  },
  {
    id: "demo-sug-2",
    title: "Behind the Scenes: How We Build Our Content Calendar",
    topic: "Behind the scenes / transparency",
    content_type: "behind_scenes",
    target_platforms: ["instagram", "tiktok"],
    best_posting_time: "Thursday 6pm",
    performance_score: 74,
    virality_score: 69,
    image_type: "local_event",
    image_description: "Photo of your actual workspace, planning board, or team in action — raw and authentic works best here",
    benchmark_reference: "Behind-the-scenes content averages 2.3x more comments than promotional posts across Instagram",
    optimization_tips: [
      "Film a 30-60 second Reel of your actual planning process — raw footage outperforms polished",
      "Show your mistakes and pivots — authenticity drives shares",
      "Add text overlays for viewers who watch without sound"
    ],
    engagement_prediction: { likes: 280, comments: 95, shares: 52, reach: 5600 },
    status: "pending",
    week_of: new Date().toISOString().slice(0, 10),
    created_at: new Date(Date.now() - 7200000).toISOString(),
    variations: [
      {
        id: "demo-var-2a",
        variation_label: "A",
        tone: "Casual & Transparent",
        hook: "This is actually how we plan a month of content in 2 hours:",
        caption: "This is actually how we plan a month of content in 2 hours:\n\nStep 1: Pick 4 content pillars (education, inspiration, offers, behind-scenes)\nStep 2: Assign 1 topic per pillar per week\nStep 3: Batch-write captions on Sunday\nStep 4: Schedule. Done.\n\nNo fancy tools. Just a Google Doc and a whiteboard.\n\nSave this if you're always scrambling for what to post 📌",
        hashtags: ["#ContentCreator", "#SocialMediaTips", "#BehindTheScenes"],
        cta: "Save this 📌",
        predicted_reach: 6200,
        is_selected: false,
      },
      {
        id: "demo-var-2b",
        variation_label: "B",
        tone: "Relatable & Funny",
        hook: "Me on Sunday vs Me on Monday when it's time to post:",
        caption: "Me on Sunday: 'I'll prep all my content for the week'\nMe on Monday: *staring at blank caption box for 45 minutes*\n\nWe've all been there. So here's the system that actually fixed it for us:\n\n✅ 4 content pillars (never run out of ideas)\n✅ Sunday batch-writing (30 min max)\n✅ Repurpose EVERYTHING (one idea = 5 posts)\n\nWant the template? Comment 'TEMPLATE' and I'll send it your way 🎁",
        hashtags: ["#ContentStrategy", "#CreatorLife", "#RelatableContent"],
        cta: "Comment 'TEMPLATE'",
        predicted_reach: 8900,
        is_selected: false,
      },
      {
        id: "demo-var-2c",
        variation_label: "C",
        tone: "Educational",
        hook: "Our content system went from chaotic to 30 days planned in 2 hours. Here's the exact framework:",
        caption: "Our content system went from chaotic → 30 days planned in 2 hours.\n\nThe Content Pillar Method:\n\n📚 EDUCATE (40%) — Tips, how-tos, industry insights\n🎭 ENTERTAIN (30%) — Behind-scenes, relatable moments, stories  \n🛒 PROMOTE (20%) — Offers, services, case studies\n🙋 ENGAGE (10%) — Questions, polls, collaborations\n\nEach pillar gets 1-2 posts per week.\nBatch-write on Sunday. Schedule Monday morning.\n\nThis framework works for any business, any niche.\n\nDrop your industry below and I'll suggest what YOUR pillars should be 👇",
        hashtags: ["#ContentMarketing", "#SocialMediaStrategy", "#BusinessTips"],
        cta: "Drop your industry below 👇",
        predicted_reach: 5100,
        is_selected: false,
      },
    ],
  },
];

// ── GET /api/content/suggestions ─────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "pending";
  const week   = searchParams.get("week");

  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ suggestions: DEMO_SUGGESTIONS });

  const orgId = await resolveOrg(userId, supabase);
  if (!orgId) return NextResponse.json({ suggestions: DEMO_SUGGESTIONS });

  let query = supabase
    .from("content_suggestions")
    .select("*, content_variations(*)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (week) query = query.eq("week_of", week);

  const { data } = await query;

  // Map variations into suggestions
  const suggestions = (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    variations: (s.content_variations as unknown[] ?? []),
  }));

  return NextResponse.json({
    suggestions: suggestions.length > 0 ? suggestions : DEMO_SUGGESTIONS,
  });
}

// ── POST /api/content/suggestions ────────────────────────────
// Trigger AI generation or directly insert a manual suggestion
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = serverClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const orgId = await resolveOrg(userId, supabase);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  // action=generate → kick off n8n workflow
  if (body.action === "generate") {
    const runId = crypto.randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    const { ok, error } = await triggerContentCalendarGeneration({
      run_id:       runId,
      org_id:       orgId,
      week_of:      body.week_of ?? new Date().toISOString().slice(0, 10),
      posts_count:  body.posts_count ?? 7,
      callback_url: `${appUrl}/api/webhooks/n8n`,
    });

    return NextResponse.json({
      triggered:   ok,
      run_id:      runId,
      error:       ok ? undefined : error,
      message:     ok
        ? "AI is generating your content calendar — suggestions will appear within 2-3 minutes."
        : "n8n not configured — suggestions generated from demo data.",
    });
  }

  // Direct insert (manual suggestion)
  const { data, error } = await supabase
    .from("content_suggestions")
    .insert({ org_id: orgId, ...body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suggestion: data });
}

// ── PATCH /api/content/suggestions ───────────────────────────
// Approve or decline a suggestion
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, action, variation_id, declined_reason, scheduled_for } = body;

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const supabase = serverClient();
  if (!supabase) {
    // Demo mode — just echo back success
    return NextResponse.json({ ok: true, demo: true });
  }

  const orgId = await resolveOrg(userId, supabase);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  if (action === "approve") {
    // 1. Mark variation as selected
    if (variation_id) {
      await supabase
        .from("content_variations")
        .update({ is_selected: false })
        .eq("suggestion_id", id);

      await supabase
        .from("content_variations")
        .update({ is_selected: true })
        .eq("id", variation_id);
    }

    // 2. Update suggestion status
    const { data, error } = await supabase
      .from("content_suggestions")
      .update({
        status:               "approved",
        selected_variation_id: variation_id ?? null,
        approved_at:          new Date().toISOString(),
        approved_by:          userId,
        scheduled_for:        scheduled_for ?? null,
      })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ suggestion: data });
  }

  if (action === "decline") {
    const { data, error } = await supabase
      .from("content_suggestions")
      .update({ status: "declined", declined_reason: declined_reason ?? null })
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ suggestion: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
