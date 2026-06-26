import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/api/webhooks/(.*)",
  "/free-audit(.*)",
  "/api/audit-requests(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

// Clerk handler — only used when env vars are present
const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (request.cookies.get("signafy_session")?.value === "demo") {
    return NextResponse.next();
  }
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
  await auth.protect();
  const hasOrg = request.cookies.get("signafy_org_id")?.value;
  if (!hasOrg && !isOnboardingRoute(request)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  return NextResponse.next();
});

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  // Demo session always passes — no Clerk needed
  if (request.cookies.get("signafy_session")?.value === "demo") {
    return NextResponse.next();
  }

  // If Clerk isn't configured (env vars missing), fall back to basic routing
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    if (isPublicRoute(request) || isOnboardingRoute(request)) return NextResponse.next();
    // No auth configured — let demo cookie users through, block the rest
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Clerk is configured — hand off, but catch any runtime errors so the site
  // stays up rather than returning MIDDLEWARE_INVOCATION_FAILED
  try {
    return await clerkHandler(request, event);
  } catch (err) {
    console.error("[middleware] Clerk error:", (err as Error).message ?? err);
    // Redirect to sign-in rather than crashing the edge function
    if (!request.nextUrl.pathname.startsWith("/sign-in")) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
