import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Edge proxy (formerly "middleware"): Clerk auth for app + APIs, demo cookie bypass,
 * public machine webhooks.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/api/webhooks/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (request.cookies.get("signafy_session")?.value === "demo") {
    return NextResponse.next();
  }
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
