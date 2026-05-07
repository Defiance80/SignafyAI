import { z } from "zod";
import { requireOrgContext } from "@/lib/supabase/server";
import { generateSeoResearch } from "@/lib/ai";
import { errorResponse, jsonResponse } from "@/lib/utils";

const Schema = z.object({
  topic: z.string().min(1).max(300),
  domain: z.string().max(200).optional(),
  count: z.number().int().min(5).max(30).optional(),
});

export async function POST(request: Request) {
  const ctx = await requireOrgContext(request).catch(() => null);
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues.map(i => i.message).join(", "), 422);

  const result = await generateSeoResearch(parsed.data);
  return jsonResponse(result);
}
