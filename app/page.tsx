import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getTeamSession();
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
