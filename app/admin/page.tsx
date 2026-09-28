import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import {
  getLiveActiveRound,
  getTeamsForRound,
  getStagesForRound,
  checkRoundConfig,
  getSettings,
} from '@/lib/round';
import {
  fetchAllTeamProgress,
  fetchAllAttempts,
  fetchFinaleSubmissions,
  fetchAllTeamRegistrations,
} from '@/lib/db';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const activeRound = await getLiveActiveRound();
  const round1 = checkRoundConfig('round1');
  const round2 = checkRoundConfig('round2');
  const teams = getTeamsForRound(activeRound);
  const stages = getStagesForRound(activeRound);
  const progressList = await fetchAllTeamProgress(activeRound);
  const attempts = await fetchAllAttempts(activeRound, 100);
  const finale = await fetchFinaleSubmissions(activeRound);
  const registrations = await fetchAllTeamRegistrations(activeRound);
  const settings = getSettings();

  // Cross-round activity inspection
  const [r1Progress, r2Progress, r1Regs, r2Regs] = await Promise.all([
    fetchAllTeamProgress('round1'),
    fetchAllTeamProgress('round2'),
    fetchAllTeamRegistrations('round1'),
    fetchAllTeamRegistrations('round2'),
  ]);

  const round1ActiveCount = new Set([
    ...r1Progress.map((p) => p.team_code),
    ...Object.keys(r1Regs),
  ]).size;

  const round2ActiveCount = new Set([
    ...r2Progress.map((p) => p.team_code),
    ...Object.keys(r2Regs),
  ]).size;

  const progressMap: Record<string, { current_stage: string; last_updated: string }> = {};
  progressList.forEach((p) => {
    progressMap[p.team_code] = {
      current_stage: p.current_stage,
      last_updated: p.last_updated,
    };
  });

  // Dynamic team inclusion: guarantee ANY team that logged in is in the teams array
  const allTeamCodes = new Set(teams.map((t) => t.code));
  for (const p of progressList) {
    if (!allTeamCodes.has(p.team_code)) {
      teams.push({
        code: p.team_code,
        pin: '---',
        track: p.team_code.charAt(0) || 'A',
      });
      allTeamCodes.add(p.team_code);
    }
  }
  for (const regCode of Object.keys(registrations)) {
    if (!allTeamCodes.has(regCode)) {
      teams.push({
        code: regCode,
        pin: '---',
        track: regCode.charAt(0) || 'A',
      });
      allTeamCodes.add(regCode);
    }
  }

  teams.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const initialData = {
    activeRound,
    round1,
    round2,
    round1ActiveCount,
    round2ActiveCount,
    teams,
    stages,
    progress: progressMap,
    registrations,
    attempts,
    finale,
    settings,
  };

  return <AdminClient initialData={initialData} />;
}
