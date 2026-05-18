import { requireOrgContext, getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, jsonResponse } from "@/lib/utils";
import { getChatCompletionRaw } from "@/lib/ai";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  const { id } = await params;
  const db = getSupabaseServiceClient();

  let authorName = "there";
  let body = "";
  let platform = "";

  if (db) {
    const { data: msg } = await db
      .from("social_messages")
      .select("author_name, body, platform, org_id")
      .eq("id", id)
      .single();

    if (!msg) return errorResponse("Message not found", 404);
    if (msg.org_id !== ctx.org.id) return errorResponse("Forbidden", 403);

    authorName = msg.author_name ?? "there";
    body = msg.body ?? "";
    platform = msg.platform ?? "";
  }

  const firstName = authorName.split(" ")[0];
  const prompt = `You are a professional social media manager. Write a warm, helpful reply to this ${platform} message from ${firstName}.

Message: "${body}"

Guidelines:
- Address them by first name (${firstName})
- Be genuine and not overly salesy
- Keep it concise (2-4 short paragraphs)
- End with a soft call-to-action or open question
- Match the platform tone (${platform})

Return JSON: { "reply": "<the reply text>" }`;

  const result = await getChatCompletionRaw(prompt, 500);

  let reply: string;
  if (result) {
    try {
      const parsed = JSON.parse(result) as { reply?: string };
      reply = parsed.reply ?? result;
    } catch {
      reply = result;
    }
  } else {
    reply = `Hi ${firstName}! Thanks for reaching out.\n\nWe'd love to connect and learn more about what you're working on. Feel free to share more details or suggest a time to chat!`;
  }

  if (db) {
    await db.from("social_messages")
      .update({ ai_reply: reply })
      .eq("id", id);
  }

  return jsonResponse({ reply });
}
