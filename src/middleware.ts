import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/api/webhooks/(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  // Demo session bypasses all auth
  if (request.cookies.get("signafy_session")?.value === "demo") {
    return NextResponse.next();
  }

  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  await auth.protect();

  // Authenticated but no org yet → send to onboarding to pick a plan.
  // Cookie is set by the onboarding server action after org creation.
  const hasOrg = request.cookies.get("signafy_org_id")?.value;
  if (!hasOrg && !isOnboardingRoute(request)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
