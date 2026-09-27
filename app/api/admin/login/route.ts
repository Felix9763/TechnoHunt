import { NextRequest, NextResponse } from 'next/server';
import { setAdminSessionCookie } from '@/lib/auth';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const body = await req.json();
    const passcode = (body.passcode || '').trim();
    const expectedPasscode = process.env.ADMIN_PASSCODE || 'huntadmin2026';

    const rateKey = `admin_login:${ip}`;
    const limit = checkLoginRateLimit(rateKey, 5, 120);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many failed admin login attempts. Locked out for ${limit.remainingSeconds}s.` },
        { status: 429 }
      );
    }

    if (!passcode) {
      return NextResponse.json(
        { error: 'Admin passcode is required.' },
        { status: 400 }
      );
    }

    if (passcode !== expectedPasscode) {
      const fail = recordFailedLogin(rateKey, 5, 120);
      if (fail.isLockedOut) {
        return NextResponse.json(
          { error: `Too many failed admin attempts. Locked out for ${fail.remainingSeconds}s.` },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid admin passcode.' },
        { status: 401 }
      );
    }

    resetLoginAttempts(rateKey);

    const res = NextResponse.json({
      success: true,
      redirect: '/admin',
    });

    await setAdminSessionCookie(res);
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Error during admin authentication.' },
      { status: 500 }
    );
  }
}
