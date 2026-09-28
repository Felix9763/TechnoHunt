import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/auth';
import { getLiveActiveRound, getStagesForRound, getSanitizedStageData } from '@/lib/round';
import { fetchTeamProgress, fetchTeamRegistration } from '@/lib/db';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getTeamSession();
  if (!session) {
    redirect('/login');
  }

  const activeRound = await getLiveActiveRound();

  // If active round changed after team logged in
  if (session.round !== activeRound) {
    return (
      <main className="min-h-screen bg-paper text-ink p-6 flex flex-col items-center justify-center max-w-md mx-auto text-left">
        <div className="border-2 border-evidence-red bg-paper-card p-6 w-full shadow-md">
          <div className="font-mono text-xs text-evidence-red mb-2 font-bold tracking-wider">
            NOTICE // EVENT STATE UPDATED
          </div>
          <h2 className="font-serif text-2xl text-ink mb-3 font-bold">
            This round has ended — please log in again
          </h2>
          <p className="text-sm text-ink-soft mb-6 font-serif">
            The organizer has shifted the investigation to a new phase. Your previous session credentials are no longer active.
          </p>
          <a
            href="/login"
            className="block text-center w-full bg-ink text-paper py-3 font-mono font-bold text-sm uppercase tracking-wider hover:bg-ink-mid transition-colors shadow"
          >
            Re-enter Portal
          </a>
        </div>
      </main>
    );
  }

  const reg = await fetchTeamRegistration(activeRound, session.teamCode);
  const currentStage = await fetchTeamProgress(activeRound, session.teamCode);
  const stages = getStagesForRound(activeRound);
  const teamStages = stages[session.teamCode] || {};
  const sanitizedStages = getSanitizedStageData(teamStages, currentStage);

  return (
    <DashboardClient
      teamCode={session.teamCode}
      track={session.track}
      round={activeRound}
      initialStage={currentStage}
      initialStageData={sanitizedStages}
      initialConfirmed={reg?.confirmed ?? false}
      initialTeamName={reg?.team_name || ''}
    />
  );
}
