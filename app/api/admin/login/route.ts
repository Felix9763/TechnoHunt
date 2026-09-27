import { NextRequest, NextResponse } from 'next/server';
import { setAdminSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const passcode = (body.passcode || '').trim();
    const expectedPasscode = process.env.ADMIN_PASSCODE || 'huntadmin2026';

    if (!passcode) {
      return NextResponse.json(
        { error: 'Admin passcode is required.' },
        { status: 400 }
      );
    }

    if (passcode !== expectedPasscode) {
      return NextResponse.json(
        { error: 'Invalid admin passcode.' },
        { status: 401 }
      );
    }

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
