import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import {
  getLiveActiveRound,
  getTeamsForRound,
  checkRoundConfig,
  getSettings,
} from '@/lib/round';
import {
  fetchAllTeamProgress,
  fetchAllAttempts,
  fetchFinaleSubmissions,
} from '@/lib/db';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const activeRound = await getLiveActiveRound();
  const round1 = checkRoundConfig('round1');
  const round2 = checkRoundConfig('round2');
  const teams = getTeamsForRound(activeRound);
  const progressList = await fetchAllTeamProgress(activeRound);
  const attempts = await fetchAllAttempts(activeRound, 100);
  const finale = await fetchFinaleSubmissions(activeRound);
  const settings = getSettings();

  const progressMap: Record<string, { current_stage: string; last_updated: string }> = {};
  progressList.forEach((p) => {
    progressMap[p.team_code] = {
      current_stage: p.current_stage,
      last_updated: p.last_updated,
    };
  });

  const initialData = {
    activeRound,
    round1,
    round2,
    teams,
    progress: progressMap,
    attempts,
    finale,
    settings,
  };

  return <AdminClient initialData={initialData} />;
}
