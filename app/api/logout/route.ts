import { NextResponse } from 'next/server';
import { clearTeamSessionCookie } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ success: true, redirect: '/login' });
  clearTeamSessionCookie(res);
  return res;
}
