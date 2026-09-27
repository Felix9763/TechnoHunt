import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/auth';
import { getLiveActiveRound, getStagesForRound } from '@/lib/round';
import { fetchTeamProgress } from '@/lib/db';
import DashboardClient from './DashboardClient';

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
        <div className="border-2 border-evidence-red bg-paper p-6 w-full clip-case">
          <div className="font-mono text-xs text-evidence-red mb-2">
            NOTICE // EVENT STATE UPDATED
          </div>
          <h2 className="font-display text-2xl text-ink mb-3 transform -rotate-1">
            This round has ended — please log in again
          </h2>
          <p className="text-sm text-ink-soft mb-6 font-body">
            The organizer has shifted the investigation to a new phase. Your previous session credentials are no longer active.
          </p>
          <a
            href="/login"
            className="block text-center w-full bg-ink text-paper py-3 font-medium text-sm hover:bg-ink-soft transition-colors"
          >
            Submit
          </a>
        </div>
      </main>
    );
  }

  const currentStage = await fetchTeamProgress(activeRound, session.teamCode);
  const stages = getStagesForRound(activeRound);
  const teamStages = stages[session.teamCode] || {};

  return (
    <DashboardClient
      teamCode={session.teamCode}
      track={session.track}
      round={activeRound}
      initialStage={currentStage}
      stageData={teamStages}
    />
  );
}
