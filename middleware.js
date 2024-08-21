import { NextResponse } from 'next/server';
import { getToken, encode } from 'next-auth/jwt';

export const config = {
  matcher: [
  "/platform/pages/:path*",
    "/api/auth/refresh",
  ],
};

const sessionCookie = process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';

async function refreshAccessToken(token) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_EXPRESS_APP_DOMAIN}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    if (response.status === 401) {
      console.error('Refresh token is invalid or expired.');
      throw new Error('Invalid or expired refresh token');
    }

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const newTokenData = await response.json();
    return {
      ...token,
      accessToken: newTokenData.accessToken,
      expiresIn: newTokenData.expiresIn,
      refreshToken: newTokenData.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null; 
  }
}

function shouldUpdateToken(token) {
  const currentTime = new Date().getTime();
  return currentTime > token.expiresIn;
}

function signOut(request) {
  const response = NextResponse.redirect(new URL('/platform/auth/login', request.url));

  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.includes(sessionCookie)) response.cookies.delete(cookie.name);
  });

  return response;
}

export const middleware = async (request) => {
  const token = await getToken({ req: request });
  if (!token) return signOut(request);

  if (shouldUpdateToken(token)) {
    const newToken = await refreshAccessToken(token);

    if (!newToken) {
      // Если обновление токена не удалось, выполняем выход
      return signOut(request);
    }

    const newSessionToken = await encode({
      secret: process.env.NEXTAUTH_SECRET,
      token: newToken,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    request.cookies.set(sessionCookie, newSessionToken);

    const response = NextResponse.next({
      request: {
        headers: request.headers,
        cookies: request.cookies,
      },
    });

    response.cookies.set(sessionCookie, newSessionToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    if (request.url.endsWith('refresh')) {
      return Response.json({
        ...newToken
      }, {
        status: 200,
        headers: {
          'Set-Cookie': `${encodeURIComponent(sessionCookie)}=${newSessionToken}; Path=/`
        }
      })
    }

    console.log("TOKEN REFRESH SUCCESSFUL...");
    return response;
  }

  return NextResponse.next();
};
