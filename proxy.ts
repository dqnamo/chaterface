import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

export function proxy(req: NextRequest) {
  // If no auth is configured, allow access (or you could fail closed)
  const validUser = process.env.BASIC_AUTH_USER;
  const validPass = process.env.BASIC_AUTH_PASSWORD;

  if (!validUser || !validPass) {
    // If you want to enforce auth, you might want to return 401 here too
    // For now, if credentials aren't set, we'll bypass auth to avoid lockout
    // but ideally you should set them.
    console.warn("Basic Auth credentials not set");
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    if (user === validUser && pwd === validPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

