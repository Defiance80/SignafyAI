/**
 * GET /api/social/callback/[platform]
 * Handles the OAuth callback — exchanges code for token, saves to social_accounts.
 * Redirects back to /settings/social with a success or error message.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildServerClient, resolveOrgId } from "@/lib/supabase/resolve-org";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://signafy-ai.vercel.app";

function serverClient() {
  return buildServerClient();
}

// ── Token exchange config per platform ───────────────────────
function getTokenConfig(platform: string, redirect: string) {
  switch (platform) {
    case "linkedin":
      return {
        tokenUrl:     "https://www.linkedin.com/oauth/v2/accessToken",
        clientId:     process.env.LINKEDIN_CLIENT_ID    ?? "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
        redirect,
        profileUrl:   "https://api.linkedin.com/v2/userinfo",
      };
    case "facebook":
      return {
        tokenUrl:     "https://graph.facebook.com/v18.0/oauth/access_token",
        clientId:     process.env.META_APP_ID     ?? "",
        clientSecret: process.env.META_APP_SECRET  ?? "",
        redirect,
        profileUrl:   "https://graph.facebook.com/v18.0/me?fields=id,name,picture",
      };
    case "instagram":
      return {
        tokenUrl:     "https://graph.facebook.com/v18.0/oauth/access_token",
        clientId:     process.env.META_APP_ID     ?? "",
        clientSecret: process.env.META_APP_SECRET  ?? "",
        redirect,
        profileUrl:   "https://graph.facebook.com/v18.0/me?fields=id,name,picture",
      };
    case "x":
    case "twitter":
      return {
        tokenUrl:     "https://api.twitter.com/2/oauth2/token",
        clientId:     process.env.TWITTER_CLIENT_ID     ?? "",
        clientSecret: process.env.TWITTER_CLIENT_SECRET  ?? "",
        redirect,
        profileUrl:   "https://api.twitter.com/2/users/me",
      };
    case "tiktok":
      return {
        tokenUrl:     "https://open.tiktokapis.com/v2/oauth/token/",
        clientId:     process.env.TIKTOK_CLIENT_KEY    ?? "",
        clientSecret: process.env.TIKTOK_CLIENT_SECRET  ?? "",
        redirect,
        profileUrl:   "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      };
    default:
      return null;
  }
}

// ── Fetch profile after token exchange ────────────────────────
async function fetchProfile(platform: string, accessToken: string, profileUrl: string) {
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    if (platform === "facebook" || platform === "instagram") {
      // Facebook uses access_token param instead of Bearer
      const res = await fetch(`${profileUrl}&access_token=${accessToken}`);
      const data = await res.json() as Record<string, unknown>;
      return {
        account_id:   String(data.id ?? ""),
        account_name: String(data.name ?? ""),
        avatar_url:   (data.picture as Record<string, unknown>)?.data
                      ? String(((data.picture as Record<string, unknown>).data as Record<string, unknown>)?.url ?? "")
                      : String(data.picture ?? ""),
      };
    }

    const res = await fetch(profileUrl, { headers });
    const data = await res.json() as Record<string, unknown>;

    if (platform === "linkedin") {
      return {
        account_id:   String(data.sub ?? data.id ?? ""),
        account_name: String(data.name ?? data.localizedFirstName ?? ""),
        avatar_url:   String(data.picture ?? ""),
      };
    }
    if (platform === "x" || platform === "twitter") {
      const user = (data.data as Record<string, unknown>) ?? data;
      return {
        account_id:   String(user.id ?? ""),
        account_name: `@${String(user.username ?? user.name ?? "")}`,
        avatar_url:   String(user.profile_image_url ?? ""),
      };
    }
    if (platform === "tiktok") {
      const user = (data.data as Record<string, unknown>)?.user ?? data;
      return {
        account_id:   String((user as Record<string, unknown>).open_id ?? ""),
        account_name: String((user as Record<string, unknown>).display_name ?? ""),
        avatar_url:   String((user as Record<string, unknown>).avatar_url ?? ""),
      };
    }

    return { account_id: "", account_name: platform, avatar_url: "" };
  } catch {
    return { account_id: "", account_name: platform, avatar_url: "" };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectBase = `${APP_URL}/settings/social`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${redirectBase}?error=no_code`);
  }

  // Validate CSRF state from cookie
  const cookieRaw = req.cookies.get("oauth_state")?.value;
  if (!cookieRaw) {
    return NextResponse.redirect(`${redirectBase}?error=state_expired`);
  }

  let cookieData: { state: string; codeVerifier?: string; platform: string; userId: string };
  try {
    cookieData = JSON.parse(cookieRaw);
  } catch {
    return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
  }

  if (cookieData.state !== state) {
    return NextResponse.redirect(`${redirectBase}?error=state_mismatch`);
  }

  const redirect = `${APP_URL}/api/social/callback/${platform}`;
  const tokenConfig = getTokenConfig(platform, redirect);
  if (!tokenConfig) {
    return NextResponse.redirect(`${redirectBase}?error=unsupported_platform`);
  }

  // Exchange code for token
  let tokenData: Record<string, unknown>;
  try {
    const body = new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      redirect_uri: tokenConfig.redirect,
      client_id:    tokenConfig.clientId,
      client_secret: tokenConfig.clientSecret,
    });

    if (cookieData.codeVerifier) {
      body.set("code_verifier", cookieData.codeVerifier);
    }

    const tokenRes = await fetch(tokenConfig.tokenUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });

    tokenData = await tokenRes.json() as Record<string, unknown>;
    if (tokenData.error) throw new Error(String(tokenData.error_description ?? tokenData.error));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "token_exchange_failed";
    return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(msg)}`);
  }

  const accessToken  = String(tokenData.access_token ?? "");
  const refreshToken = String(tokenData.refresh_token ?? "");
  const expiresIn    = Number(tokenData.expires_in ?? 5184000); // 60 days default
  const tokenExpires = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Fetch profile info
  const profile = await fetchProfile(platform, accessToken, tokenConfig.profileUrl);

  // Save to Supabase
  const supabase = serverClient();
  if (supabase) {
    const orgId = await resolveOrgId(cookieData.userId, supabase);
    if (orgId) {
      await supabase.from("social_accounts").upsert({
        org_id:        orgId,
        platform:      platform === "twitter" ? "x" : platform,
        account_id:    profile.account_id || `${platform}_${cookieData.userId}`,
        account_name:  profile.account_name || platform,
        avatar_url:    profile.avatar_url || null,
        access_token:  accessToken,
        refresh_token: refreshToken || null,
        token_expires: tokenExpires,
        is_active:     true,
        scopes:        String(tokenData.scope ?? ""),
      }, { onConflict: "org_id,platform,account_id" });
    }
  }

  // Clear the state cookie and redirect to success
  const response = NextResponse.redirect(
    `${redirectBase}?connected=${platform}`
  );
  response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
  return response;
}
