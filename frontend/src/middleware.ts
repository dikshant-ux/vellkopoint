import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the user has an access token (stored in localStorage/memory on client, but here we can only check cookies)
    // Limitation: Middleware runs on edge/server, so it cannot access localStorage.
    // Our auth system uses HttpOnly cookies for refresh tokens. 
    // We can check for the refresh token cookie.

    const hasRefreshToken = request.cookies.has("refresh_token");

    // Define public paths that don't need authentication
    const publicPaths = [
        "/login",
        "/signup",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
        "/accept-invitation",
        "/public",
    ];

    const isPublicPath = pathname === "/" || publicPaths.some(path => pathname.startsWith(path));

    // If user is accessing a protected route without a token
    if (!isPublicPath && !hasRefreshToken) {
        console.log("Blocking access to", pathname);
        // Allow access to static files and api routes?
        // Usually we want to protect /dashboard or root /
        // Let's protect everything except public paths and next internals
        if (
            !pathname.startsWith("/_next") &&
            !pathname.startsWith("/static") &&
            !pathname.startsWith("/api") && // Let API handle its own 401s
            !pathname.startsWith("/favicon.ico")
        ) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }
    }

    // If user is accessing login/signup with a token, we previously redirected to dashboard.
    // However, this causes loops if the token is invalid but cookie exists.
    // We allow access to login/signup even if cookie exists, to let user re-authenticate.

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
