/**
 * GET /api/social/connect/[platform]
 * Initiates the OAuth flow for a social platform.
 * Redirects the user to the platform's authorization page.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://signafy-ai.vercel.app";

// ── Per-platform OAuth config ─────────────────────────────────
function getPlatformConfig(platform: string) {
  const redirect = `${APP_URL}/api/social/callback/${platform}`;

  switch (platform) {
    case "linkedin":
      return {
        authUrl:  "https://www.linkedin.com/oauth/v2/authorization",
        clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
        scopes:   "openid profile w_member_social",
        redirect,
        pkce: false,
      };

    case "facebook":
      return {
        authUrl:  "https://www.facebook.com/v18.0/dialog/oauth",
        clientId: process.env.META_APP_ID ?? "",
        scopes:   "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,public_profile",
        redirect,
        pkce: false,
      };

    case "instagram":
      // Instagram uses the Meta/Facebook OAuth flow with instagram scopes
      return {
        authUrl:  "https://www.facebook.com/v18.0/dialog/oauth",
        clientId: process.env.META_APP_ID ?? "",
        scopes:   "instagram_basic,instagram_content_publish,instagram_manage_comments,pages_show_list,pages_read_engagement",
        redirect: `${APP_URL}/api/social/callback/instagram`,
        pkce: false,
      };

    case "x":
    case "twitter":
      return {
        authUrl:  "https://twitter.com/i/oauth2/authorize",
        clientId: process.env.TWITTER_CLIENT_ID ?? "",
        scopes:   "tweet.read tweet.write users.read offline.access",
        redirect,
        pkce: true, // X requires PKCE
      };

    case "tiktok":
      return {
        authUrl:  "https://www.tiktok.com/v2/auth/authorize/",
        clientId: process.env.TIKTOK_CLIENT_KEY ?? "",
        scopes:   "user.info.basic,video.publish,video.list,comment.list",
        redirect,
        pkce: false,
      };

    default:
      return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await params;
  const config = getPlatformConfig(platform);

  if (!config) {
    return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
  }

  if (!config.clientId) {
    return NextResponse.json({
      error: `${platform} OAuth not configured. Add the client ID to environment variables.`,
    }, { status: 503 });
  }

  // Generate CSRF state token
  const state = crypto.randomBytes(24).toString("hex");

  // Build auth URL
  const authParams = new URLSearchParams({
    response_type: "code",
    client_id:     config.clientId,
    redirect_uri:  config.redirect,
    scope:         config.scopes,
    state,
  });

  // PKCE for X/Twitter
  let codeVerifier: string | undefined;
  if (config.pkce) {
    codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    authParams.set("code_challenge",        codeChallenge);
    authParams.set("code_challenge_method", "S256");
  }

  const authUrl = `${config.authUrl}?${authParams.toString()}`;

  // Store state + verifier in a short-lived cookie (10 min)
  const cookieData = JSON.stringify({ state, codeVerifier, platform, userId });
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state", cookieData, {
    httpOnly: true,
    secure:   true,
    sameSite: "lax",
    maxAge:   600, // 10 minutes
    path:     "/",
  });

  return response;
}
